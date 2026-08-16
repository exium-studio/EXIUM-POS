import { Router } from 'express';
import { db } from '../db/store';
import crypto from 'crypto';

export const stockRouter = Router();

// Get ingredients list with active branch stock (Exclude soft-deleted)
stockRouter.get('/ingredients', (req, res) => {
  const branch_id = (req.query.branch_id as string) || 'branch-1';
  const ingredients = (db.get('ingredients') || []).filter((ing: any) => ing.is_deleted !== true);
  const stockBranches = db.get('stock_branch').filter((s: any) => s.branch_id === branch_id);

  const enriched = ingredients.map((ing: any) => {
    const stock = stockBranches.find((s: any) => s.item_type === 'ingredient' && s.item_id === ing.id);
    return {
      ...ing,
      current_stock: stock ? stock.current_stock : 0,
      is_low: stock ? stock.current_stock <= (stock.min_stock_alert || ing.min_stock_alert) : true,
    };
  });

  res.json(enriched);
});

// Create new ingredient
stockRouter.post('/ingredients', (req, res) => {
  const newIng = {
    id: `ing-${crypto.randomUUID()}`,
    code: req.body.code || `ING-${Date.now().toString().slice(-4)}`,
    name: req.body.name,
    category: req.body.category || 'Bahan Makanan',
    base_unit: req.body.base_unit || 'gram',
    cost_per_unit: Number(req.body.cost_per_unit) || 0,
    min_stock_alert: Number(req.body.min_stock_alert) || 100,
    is_deleted: false,
  };

  db.insert('ingredients', newIng);

  // Initialize stock for all branches
  const branches = db.get('branches') || [];
  for (const b of branches) {
    db.insert('stock_branch', {
      id: `stk-${crypto.randomUUID()}`,
      branch_id: b.id,
      item_type: 'ingredient',
      item_id: newIng.id,
      current_stock: Number(req.body.initial_stock) || 0,
      min_stock_alert: newIng.min_stock_alert,
      last_updated: new Date().toISOString(),
    });
  }

  res.json(newIng);
});

// Update ingredient
stockRouter.put('/ingredients/:id', (req, res) => {
  const id = req.params.id;
  const ing = db.get('ingredients').find((i: any) => i.id === id);
  if (!ing) return res.status(404).json({ error: 'Bahan baku tidak ditemukan' });

  const updates = {
    name: req.body.name !== undefined ? req.body.name : ing.name,
    category: req.body.category !== undefined ? req.body.category : ing.category,
    base_unit: req.body.base_unit !== undefined ? req.body.base_unit : ing.base_unit,
    cost_per_unit: req.body.cost_per_unit !== undefined ? Number(req.body.cost_per_unit) : ing.cost_per_unit,
    min_stock_alert: req.body.min_stock_alert !== undefined ? Number(req.body.min_stock_alert) : ing.min_stock_alert,
  };

  db.update('ingredients', (i: any) => i.id === id, updates);
  res.json({ ...ing, ...updates });
});

// Soft Delete ingredient
stockRouter.delete('/ingredients/:id', (req, res) => {
  const id = req.params.id;
  const ing = db.get('ingredients').find((i: any) => i.id === id);
  if (!ing) return res.status(404).json({ error: 'Bahan baku tidak ditemukan' });

  db.update('ingredients', (i: any) => i.id === id, { ...ing, is_deleted: true });
  res.json({ success: true, message: 'Bahan baku berhasil dihapus' });
});

// Get stock movements (Kartu Stok)
stockRouter.get('/movements', (req, res) => {
  const branch_id = req.query.branch_id as string;
  const item_id = req.query.item_id as string;
  let movements = db.get('stock_movements');
  const branches = db.get('branches');
  const ingredients = db.get('ingredients');
  const products = db.get('products');
  const users = db.get('users');

  if (branch_id && branch_id !== 'all') {
    movements = movements.filter((m: any) => m.branch_id === branch_id);
  }
  if (item_id) {
    movements = movements.filter((m: any) => m.item_id === item_id);
  }

  const enriched = movements.map((m: any) => {
    const branch = branches.find((b: any) => b.id === m.branch_id);
    let itemName = 'Unknown Item';
    if (m.item_type === 'ingredient') {
      itemName = ingredients.find((i: any) => i.id === m.item_id)?.name || m.item_id;
    } else {
      itemName = products.find((p: any) => p.id === m.item_id)?.name || m.item_id;
    }
    const user = users.find((u: any) => u.id === m.created_by);

    return {
      ...m,
      branch_name: branch?.name,
      item_name: itemName,
      created_by_name: user?.full_name || m.created_by,
    };
  });

  res.json(enriched.reverse());
});

// Stock Opname List
stockRouter.get('/opnames', (req, res) => {
  const branch_id = req.query.branch_id as string;
  let opnames = db.get('stock_opnames');
  const branches = db.get('branches');
  const users = db.get('users');

  if (branch_id && branch_id !== 'all') {
    opnames = opnames.filter((o: any) => o.branch_id === branch_id);
  }

  const enriched = opnames.map((o: any) => ({
    ...o,
    branch_name: branches.find((b: any) => b.id === o.branch_id)?.name,
    counted_by_name: users.find((u: any) => u.id === o.counted_by)?.full_name,
    approved_by_name: users.find((u: any) => u.id === o.approved_by)?.full_name,
  }));

  res.json(enriched.reverse());
});

// Create Stock Opname
stockRouter.post('/opnames', (req, res) => {
  const { branch_id, notes, items, user_id, auto_approve } = req.body;
  const opname_number = `SO-${Date.now().toString().slice(-6)}`;
  const opnameId = `so-${crypto.randomUUID()}`;

  const newOpname = {
    id: opnameId,
    branch_id,
    opname_number,
    status: auto_approve ? 'approved' : 'pending_approval',
    notes,
    counted_by: user_id || 'user-cashier-jkt',
    approved_by: auto_approve ? user_id : null,
    approved_at: auto_approve ? new Date().toISOString() : null,
    created_at: new Date().toISOString(),
    items: items || [],
  };

  db.insert('stock_opnames', newOpname);

  // If approved, adjust branch stock and record movement
  if (auto_approve) {
    const stockBranches = db.get('stock_branch');
    for (const item of items) {
      const stock = stockBranches.find((s: any) => s.branch_id === branch_id && s.item_type === item.item_type && s.item_id === item.item_id);
      if (stock) {
        stock.current_stock = Number(item.physical_stock);
        stock.last_updated = new Date().toISOString();
      }

      if (item.difference !== 0) {
        db.insert('stock_movements', {
          id: `mov-${crypto.randomUUID()}`,
          branch_id,
          item_type: item.item_type,
          item_id: item.item_id,
          movement_type: 'opname_adjustment',
          quantity: item.difference,
          unit: item.unit,
          unit_cost: item.unit_cost,
          total_cost: Math.abs(item.difference * item.unit_cost),
          reference_id: opname_number,
          notes: `Penyesuaian Stok Opname (${opname_number}): ${item.notes || 'Selisih fisik vs sistem'}`,
          created_by: user_id,
          created_at: new Date().toISOString(),
        });
      }
    }
    db.set('stock_branch', stockBranches);
  }

  res.json(newOpname);
});

// Approve Stock Opname
stockRouter.post('/opnames/:id/approve', (req, res) => {
  const { user_id } = req.body;
  const opname = db.get('stock_opnames').find((o: any) => o.id === req.params.id);
  if (!opname) return res.status(404).json({ error: 'Opname tidak ditemukan' });

  opname.status = 'approved';
  opname.approved_by = user_id;
  opname.approved_at = new Date().toISOString();

  const stockBranches = db.get('stock_branch');
  for (const item of opname.items) {
    const stock = stockBranches.find((s: any) => s.branch_id === opname.branch_id && s.item_type === item.item_type && s.item_id === item.item_id);
    if (stock) {
      stock.current_stock = Number(item.physical_stock);
      stock.last_updated = new Date().toISOString();
    }

    if (item.difference !== 0) {
      db.insert('stock_movements', {
        id: `mov-${crypto.randomUUID()}`,
        branch_id: opname.branch_id,
        item_type: item.item_type,
        item_id: item.item_id,
        movement_type: 'opname_adjustment',
        quantity: item.difference,
        unit: item.unit,
        unit_cost: item.unit_cost,
        total_cost: Math.abs(item.difference * item.unit_cost),
        reference_id: opname.opname_number,
        notes: `Penyesuaian Stok Opname (${opname.opname_number})`,
        created_by: user_id,
        created_at: new Date().toISOString(),
      });
    }
  }
  db.set('stock_branch', stockBranches);
  db.update('stock_opnames', (o: any) => o.id === opname.id, opname);

  res.json(opname);
});

// Inter-Branch Stock Transfers
stockRouter.get('/transfers', (req, res) => {
  const transfers = db.get('stock_transfers');
  const branches = db.get('branches');
  const users = db.get('users');

  const enriched = transfers.map((t: any) => ({
    ...t,
    from_branch_name: branches.find((b: any) => b.id === t.from_branch_id)?.name,
    to_branch_name: branches.find((b: any) => b.id === t.to_branch_id)?.name,
    created_by_name: users.find((u: any) => u.id === t.created_by)?.full_name,
  }));

  res.json(enriched.reverse());
});

stockRouter.post('/transfers', (req, res) => {
  const { from_branch_id, to_branch_id, notes, items, user_id } = req.body;
  const transfer_number = `TRF-${Date.now().toString().slice(-6)}`;
  const transferId = `trf-${crypto.randomUUID()}`;

  const newTransfer = {
    id: transferId,
    transfer_number,
    from_branch_id,
    to_branch_id,
    status: 'in_transit', // directly in transit
    notes,
    created_by: user_id || 'user-mgr-jkt',
    created_at: new Date().toISOString(),
    items: items || [],
  };

  db.insert('stock_transfers', newTransfer);

  // Deduct from sender branch
  const stockBranches = db.get('stock_branch');
  for (const it of items) {
    const stock = stockBranches.find((s: any) => s.branch_id === from_branch_id && s.item_type === it.item_type && s.item_id === it.item_id);
    if (stock) {
      stock.current_stock -= Number(it.quantity);
      stock.last_updated = new Date().toISOString();
    }
    db.insert('stock_movements', {
      id: `mov-${crypto.randomUUID()}`,
      branch_id: from_branch_id,
      item_type: it.item_type,
      item_id: it.item_id,
      movement_type: 'transfer_out',
      quantity: -Number(it.quantity),
      unit: it.unit,
      unit_cost: 0,
      total_cost: 0,
      reference_id: transfer_number,
      notes: `Transfer Keluar ke cabang tujuan (${transfer_number})`,
      created_by: user_id,
      created_at: new Date().toISOString(),
    });
  }
  db.set('stock_branch', stockBranches);

  res.json(newTransfer);
});

// Receive Transfer
stockRouter.post('/transfers/:id/receive', (req, res) => {
  const { user_id } = req.body;
  const transfer = db.get('stock_transfers').find((t: any) => t.id === req.params.id);
  if (!transfer) return res.status(404).json({ error: 'Transfer tidak ditemukan' });

  transfer.status = 'received';
  transfer.received_by = user_id;
  transfer.received_at = new Date().toISOString();

  // Add to receiving branch
  const stockBranches = db.get('stock_branch');
  for (const it of transfer.items) {
    let stock = stockBranches.find((s: any) => s.branch_id === transfer.to_branch_id && s.item_type === it.item_type && s.item_id === it.item_id);
    if (!stock) {
      stock = {
        id: `stk-${crypto.randomUUID()}`,
        branch_id: transfer.to_branch_id,
        item_type: it.item_type,
        item_id: it.item_id,
        current_stock: 0,
        min_stock_alert: 50,
      };
      db.insert('stock_branch', stock);
    }
    stock.current_stock += Number(it.quantity);
    stock.last_updated = new Date().toISOString();

    db.insert('stock_movements', {
      id: `mov-${crypto.randomUUID()}`,
      branch_id: transfer.to_branch_id,
      item_type: it.item_type,
      item_id: it.item_id,
      movement_type: 'transfer_in',
      quantity: Number(it.quantity),
      unit: it.unit,
      unit_cost: 0,
      total_cost: 0,
      reference_id: transfer.transfer_number,
      notes: `Penerimaan Transfer Masuk dari ${transfer.from_branch_id} (${transfer.transfer_number})`,
      created_by: user_id,
      created_at: new Date().toISOString(),
    });
  }
  db.set('stock_branch', stockBranches);
  db.update('stock_transfers', (t: any) => t.id === transfer.id, transfer);

  res.json(transfer);
});
