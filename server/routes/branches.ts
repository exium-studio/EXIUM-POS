import { Router } from 'express';
import { db } from '../db/store';
import crypto from 'crypto';

export const branchesRouter = Router();

branchesRouter.get('/', (req, res) => {
  const branches = db.get('branches');
  res.json(branches);
});

branchesRouter.get('/:id', (req, res) => {
  const branches = db.get('branches');
  const branch = branches.find((b: any) => b.id === req.params.id);
  if (!branch) return res.status(404).json({ error: 'Cabang tidak ditemukan' });
  res.json(branch);
});

branchesRouter.post('/', (req, res) => {
  const newBranch = {
    id: `branch-${crypto.randomUUID()}`,
    code: req.body.code || `CAB-${Date.now().toString().slice(-4)}`,
    name: req.body.name,
    address: req.body.address,
    phone: req.body.phone,
    email: req.body.email,
    operating_hours: req.body.operating_hours || '08:00 - 22:00',
    tax_percentage: Number(req.body.tax_percentage) || 11.0,
    service_charge_percentage: Number(req.body.service_charge_percentage) || 0.0,
    is_tax_inclusive: Boolean(req.body.is_tax_inclusive),
    auto_print_kitchen: Boolean(req.body.auto_print_kitchen),
    is_active: true,
    created_at: new Date().toISOString(),
  };

  db.insert('branches', newBranch);

  // Initialize stock for all ingredients in the new branch
  const ingredients = db.get('ingredients');
  const stockBranches = db.get('stock_branch');
  for (const ing of ingredients) {
    stockBranches.push({
      id: `stk-${crypto.randomUUID()}`,
      branch_id: newBranch.id,
      item_type: 'ingredient',
      item_id: ing.id,
      current_stock: 0,
      min_stock_alert: ing.min_stock_alert || 50,
    });
  }
  db.set('stock_branch', stockBranches);

  // Initialize 4 dining tables
  for (let i = 1; i <= 4; i++) {
    const tNum = i < 10 ? `0${i}` : `${i}`;
    db.insert('dining_tables', {
      id: `tbl-${newBranch.id}-${i}`,
      branch_id: newBranch.id,
      table_number: tNum,
      zone: 'Area Utama',
      capacity: 4,
      qr_token: `TABLE-${newBranch.code}-${tNum}`,
      order_mode: 'can_order',
      payment_flow: 'pay_at_cashier',
      is_active: true,
    });
  }

  res.json(newBranch);
});

branchesRouter.put('/:id', (req, res) => {
  const updated = db.update('branches', (b: any) => b.id === req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Cabang tidak ditemukan' });
  res.json(updated);
});
