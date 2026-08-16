import { Router } from 'express';
import { db } from '../db/store';
import { recordGoodsReceiptJournal } from '../services/accounting';
import crypto from 'crypto';

export const purchaseRouter = Router();

// Suppliers List (Exclude soft-deleted)
purchaseRouter.get('/suppliers', (req, res) => {
  const sups = (db.get('suppliers') || []).filter((s: any) => s.is_deleted !== true);
  res.json(sups);
});

// Supplier Stats
purchaseRouter.get('/suppliers/stats', (req, res) => {
  const suppliers = (db.get('suppliers') || []).filter((s: any) => s.is_deleted !== true);
  const pos = db.get('purchase_orders') || [];

  const stats = suppliers.map((s: any) => {
    const supplierPOs = pos.filter((p: any) => p.supplier_id === s.id);
    const totalSpent = supplierPOs
      .filter((p: any) => p.status === 'received_full')
      .reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0);
    
    return {
      supplier_id: s.id,
      supplier_name: s.name,
      contact_person: s.contact_person,
      phone: s.phone,
      po_count: supplierPOs.length,
      total_spent: totalSpent,
    };
  });

  res.json(stats);
});

// Create Supplier
purchaseRouter.post('/suppliers', (req, res) => {
  const { name, contact_person, phone, email, address, payment_terms_days } = req.body;
  const newSupplier = {
    id: `sup-${crypto.randomUUID()}`,
    name,
    contact_person,
    phone,
    email: email || '',
    address: address || '',
    payment_terms_days: Number(payment_terms_days) || 30,
    is_deleted: false,
    created_at: new Date().toISOString(),
  };
  db.insert('suppliers', newSupplier);
  res.json(newSupplier);
});

// Update Supplier
purchaseRouter.put('/suppliers/:id', (req, res) => {
  const id = req.params.id;
  const supplier = db.get('suppliers').find((s: any) => s.id === id);
  if (!supplier) return res.status(404).json({ error: 'Supplier tidak ditemukan' });

  const updates = {
    name: req.body.name !== undefined ? req.body.name : supplier.name,
    contact_person: req.body.contact_person !== undefined ? req.body.contact_person : supplier.contact_person,
    phone: req.body.phone !== undefined ? req.body.phone : supplier.phone,
    email: req.body.email !== undefined ? req.body.email : supplier.email,
    address: req.body.address !== undefined ? req.body.address : supplier.address,
    payment_terms_days: req.body.payment_terms_days !== undefined ? Number(req.body.payment_terms_days) : supplier.payment_terms_days,
  };

  db.update('suppliers', (s: any) => s.id === id, updates);
  res.json({ ...supplier, ...updates });
});

// Soft Delete Supplier
purchaseRouter.delete('/suppliers/:id', (req, res) => {
  const id = req.params.id;
  const supplier = db.get('suppliers').find((s: any) => s.id === id);
  if (!supplier) return res.status(404).json({ error: 'Supplier tidak ditemukan' });

  db.update('suppliers', (s: any) => s.id === id, { ...supplier, is_deleted: true });
  res.json({ success: true, message: 'Supplier berhasil dihapus' });
});

// Purchase Orders list with Date Filters
purchaseRouter.get('/orders', (req, res) => {
  const branch_id = req.query.branch_id as string;
  const filter = req.query.filter as string || 'today';
  const start_date = req.query.start_date as string;
  const end_date = req.query.end_date as string;

  let pos = db.get('purchase_orders') || [];
  const branches = db.get('branches') || [];
  const suppliers = db.get('suppliers') || [];
  const users = db.get('users') || [];

  // Filter by branch
  if (branch_id && branch_id !== 'all') {
    pos = pos.filter((p: any) => p.branch_id === branch_id);
  }

  // Filter by date range
  const now = new Date();
  if (filter === 'today') {
    const todayStr = now.toISOString().split('T')[0];
    pos = pos.filter((p: any) => p.created_at?.startsWith(todayStr));
  } else if (filter === 'week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // start of week is Monday
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);
    pos = pos.filter((p: any) => {
      if (!p.created_at) return false;
      return new Date(p.created_at) >= startOfWeek;
    });
  } else if (filter === 'month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    pos = pos.filter((p: any) => {
      if (!p.created_at) return false;
      return new Date(p.created_at) >= startOfMonth;
    });
  } else if (filter === 'custom' && start_date && end_date) {
    const start = new Date(start_date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(end_date);
    end.setHours(23, 59, 59, 999);
    pos = pos.filter((p: any) => {
      if (!p.created_at) return false;
      const pDate = new Date(p.created_at);
      return pDate >= start && pDate <= end;
    });
  }

  const enriched = pos.map((p: any) => ({
    ...p,
    branch_name: branches.find((b: any) => b.id === p.branch_id)?.name,
    supplier_name: suppliers.find((s: any) => s.id === p.supplier_id)?.name,
    created_by_name: users.find((u: any) => u.id === p.created_by)?.full_name,
    approved_by_name: users.find((u: any) => u.id === p.approved_by)?.full_name,
  }));

  res.json(enriched.reverse());
});

// Create Purchase Order
purchaseRouter.post('/orders', (req, res) => {
  const { branch_id, supplier_id, notes, due_date, items, user_id, auto_approve } = req.body;
  const po_number = `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

  let subtotal = 0;
  const poItems = (items || []).map((it: any) => {
    const itemTotal = Number(it.quantity_ordered) * Number(it.unit_price);
    subtotal += itemTotal;
    return {
      id: `poi-${crypto.randomUUID()}`,
      po_id: '',
      item_type: it.item_type || 'ingredient',
      item_id: it.item_id,
      item_name: it.item_name,
      quantity_ordered: Number(it.quantity_ordered),
      quantity_received: 0,
      unit: it.unit,
      unit_price: Number(it.unit_price),
      total_price: itemTotal,
    };
  });

  const tax_amount = Math.round(subtotal * 0.11);
  const total_amount = subtotal + tax_amount;

  const newPO = {
    id: `po-${crypto.randomUUID()}`,
    branch_id,
    supplier_id,
    po_number,
    status: auto_approve ? 'approved' : 'submitted',
    subtotal,
    tax_amount,
    total_amount,
    payment_status: 'unpaid',
    notes,
    created_by: user_id || 'user-mgr-jkt',
    approved_by: auto_approve ? (user_id || 'user-mgr-jkt') : null,
    approved_at: auto_approve ? new Date().toISOString() : null,
    due_date: due_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    created_at: new Date().toISOString(),
    items: poItems,
  };

  for (const it of poItems) {
    it.po_id = newPO.id;
  }

  db.insert('purchase_orders', newPO);
  res.json(newPO);
});

// Approve PO
purchaseRouter.post('/orders/:id/approve', (req, res) => {
  const { user_id } = req.body;
  const po = db.get('purchase_orders').find((p: any) => p.id === req.params.id);
  if (!po) return res.status(404).json({ error: 'PO tidak ditemukan' });

  po.status = 'approved';
  po.approved_by = user_id;
  po.approved_at = new Date().toISOString();
  db.update('purchase_orders', (p: any) => p.id === po.id, po);

  res.json(po);
});

// Receive Goods (Goods Receipt) -> Supports body po_id (from frontend call) or params
purchaseRouter.post('/receive', (req, res) => {
  const { po_id, user_id, supplier_invoice_number, received_items, notes } = req.body;
  const po = db.get('purchase_orders').find((p: any) => p.id === po_id);
  if (!po) return res.status(404).json({ error: 'PO tidak ditemukan' });

  const receipt_number = `GR-${Date.now().toString().slice(-6)}`;
  const stockBranches = db.get('stock_branch') || [];

  // Update received quantities
  for (const poi of po.items) {
    const received = received_items?.find((r: any) => r.item_id === poi.item_id);
    const qtyReceived = received ? Number(received.quantity_received) : poi.quantity_ordered;
    poi.quantity_received = qtyReceived;

    // Add to stock_branch
    let branchStock = stockBranches.find((s: any) => s.branch_id === po.branch_id && s.item_type === poi.item_type && s.item_id === poi.item_id);
    if (!branchStock) {
      branchStock = {
        id: `stk-${crypto.randomUUID()}`,
        branch_id: po.branch_id,
        item_type: poi.item_type,
        item_id: poi.item_id,
        current_stock: 0,
        min_stock_alert: 50,
      };
      db.insert('stock_branch', branchStock);
    }
    branchStock.current_stock += qtyReceived;
    branchStock.last_updated = new Date().toISOString();

    // Log stock card movement
    db.insert('stock_movements', {
      id: `mov-${crypto.randomUUID()}`,
      branch_id: po.branch_id,
      item_type: poi.item_type,
      item_id: poi.item_id,
      movement_type: 'purchase',
      quantity: qtyReceived,
      unit: poi.unit,
      unit_cost: poi.unit_price,
      total_cost: qtyReceived * poi.unit_price,
      reference_id: po.po_number,
      notes: `Penerimaan Barang PO ${po.po_number} (Surat Jalan/Inv: ${supplier_invoice_number || '-'})`,
      created_by: user_id || 'user-mgr-jkt',
      created_at: new Date().toISOString(),
    });
  }

  db.set('stock_branch', stockBranches);

  po.status = 'received_full';
  db.update('purchase_orders', (p: any) => p.id === po.id, po);

  // Record goods receipt entity
  const gr = {
    id: `gr-${crypto.randomUUID()}`,
    receipt_number,
    po_id: po.id,
    branch_id: po.branch_id,
    supplier_invoice_number: supplier_invoice_number || '',
    received_date: new Date().toISOString(),
    received_by: user_id || 'user-mgr-jkt',
    notes: notes || '',
  };
  db.insert('goods_receipts', gr);

  // Auto-record double entry accounting journal: Persediaan (Debit) vs Hutang Usaha (Credit)
  const suppliers = db.get('suppliers') || [];
  const supplier = suppliers.find((s: any) => s.id === po.supplier_id);
  po.supplier_name = supplier?.name;
  recordGoodsReceiptJournal(po, po.branch_id, user_id || 'user-mgr-jkt');

  res.json({ po, goods_receipt: gr });
});

// Legacy params receive support just in case
purchaseRouter.post('/orders/:id/receive', (req, res) => {
  req.body.po_id = req.params.id;
  const url = req.url.replace(`/orders/${req.params.id}/receive`, '/receive');
  res.redirect(307, url);
});
