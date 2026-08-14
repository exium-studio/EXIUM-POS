import { Router } from 'express';
import { db } from '../db/store';
import crypto from 'crypto';

export const shiftsRouter = Router();

// Get active shift for branch/user
shiftsRouter.get('/active', (req, res) => {
  const branch_id = (req.query.branch_id as string) || 'branch-1';
  const shifts = db.get('shifts');
  const activeShift = shifts.find((s: any) => s.branch_id === branch_id && s.status === 'open');

  if (!activeShift) {
    return res.json({ active: false, shift: null });
  }

  // Calculate live shift totals
  const transactions = db.get('transactions').filter((t: any) => t.shift_id === activeShift.id && t.payment_status === 'paid');
  let total_cash = 0;
  let total_non_cash = 0;

  for (const t of transactions) {
    if (t.payment_method === 'cash') {
      total_cash += t.total_amount;
    } else {
      total_non_cash += t.total_amount;
    }
  }

  const cashRecords = db.get('shift_cash_records').filter((r: any) => r.shift_id === activeShift.id);
  let petty_out = 0;
  let petty_in = 0;
  for (const r of cashRecords) {
    if (r.type === 'petty_cash_out' || r.type === 'cash_drop') petty_out += r.amount;
    if (r.type === 'petty_cash_in') petty_in += r.amount;
  }

  const expected_cash = activeShift.opening_cash + total_cash + petty_in - petty_out;

  const users = db.get('users');
  const user = users.find((u: any) => u.id === activeShift.user_id);

  res.json({
    active: true,
    shift: {
      ...activeShift,
      user_name: user?.full_name,
      total_cash_sales: total_cash,
      total_non_cash_sales: total_non_cash,
      total_petty_cash_out: petty_out,
      total_petty_cash_in: petty_in,
      expected_cash,
      transactions_count: transactions.length,
    },
  });
});

// Open Shift
shiftsRouter.post('/open', (req, res) => {
  const { branch_id, user_id, opening_cash, pos_terminal_name } = req.body;
  const shifts = db.get('shifts');

  const existing = shifts.find((s: any) => s.branch_id === branch_id && s.status === 'open');
  if (existing) {
    return res.status(400).json({ error: 'Sudah ada shift aktif di cabang ini. Harap tutup shift sebelumnya terlebih dahulu.' });
  }

  const newShift = {
    id: `shift-${crypto.randomUUID()}`,
    branch_id,
    user_id: user_id || 'user-cashier-jkt',
    pos_terminal_name: pos_terminal_name || 'Kasir Utama',
    start_time: new Date().toISOString(),
    opening_cash: Number(opening_cash) || 0,
    expected_cash: Number(opening_cash) || 0,
    total_cash_sales: 0,
    total_non_cash_sales: 0,
    total_petty_cash_out: 0,
    status: 'open',
    closing_notes: '',
  };

  db.insert('shifts', newShift);
  res.json(newShift);
});

// Close Shift
shiftsRouter.post('/:id/close', (req, res) => {
  const { actual_cash, closing_notes, approved_by } = req.body;
  const shifts = db.get('shifts');
  const shift = shifts.find((s: any) => s.id === req.params.id);
  if (!shift) return res.status(404).json({ error: 'Shift tidak ditemukan' });

  // Recalculate sales
  const transactions = db.get('transactions').filter((t: any) => t.shift_id === shift.id && t.payment_status === 'paid');
  let total_cash = 0;
  let total_non_cash = 0;
  for (const t of transactions) {
    if (t.payment_method === 'cash') total_cash += t.total_amount;
    else total_non_cash += t.total_amount;
  }

  const cashRecords = db.get('shift_cash_records').filter((r: any) => r.shift_id === shift.id);
  let petty_out = 0;
  let petty_in = 0;
  for (const r of cashRecords) {
    if (r.type === 'petty_cash_out' || r.type === 'cash_drop') petty_out += r.amount;
    if (r.type === 'petty_cash_in') petty_in += r.amount;
  }

  const expected_cash = shift.opening_cash + total_cash + petty_in - petty_out;
  const actual = Number(actual_cash);
  const diff = actual - expected_cash;

  shift.status = 'closed';
  shift.end_time = new Date().toISOString();
  shift.expected_cash = expected_cash;
  shift.actual_cash = actual;
  shift.cash_difference = diff;
  shift.total_cash_sales = total_cash;
  shift.total_non_cash_sales = total_non_cash;
  shift.total_petty_cash_out = petty_out;
  shift.closing_notes = closing_notes || '';
  shift.approved_by = approved_by;

  db.update('shifts', (s: any) => s.id === shift.id, shift);

  res.json(shift);
});

// Shift Cash Records (Petty Cash / Cash Drop)
shiftsRouter.post('/:id/cash-record', (req, res) => {
  const { type, amount, reason, user_id } = req.body;
  const record = {
    id: `rec-${crypto.randomUUID()}`,
    shift_id: req.params.id,
    type, // 'petty_cash_in' | 'petty_cash_out' | 'cash_drop'
    amount: Number(amount),
    reason,
    recorded_by: user_id || 'user-cashier-jkt',
    created_at: new Date().toISOString(),
  };

  db.insert('shift_cash_records', record);
  res.json(record);
});

// Shift History
shiftsRouter.get('/history', (req, res) => {
  const branch_id = req.query.branch_id as string;
  let shifts = db.get('shifts');
  const branches = db.get('branches');
  const users = db.get('users');

  if (branch_id && branch_id !== 'all') {
    shifts = shifts.filter((s: any) => s.branch_id === branch_id);
  }

  const enriched = shifts.map((s: any) => ({
    ...s,
    branch_name: branches.find((b: any) => b.id === s.branch_id)?.name,
    user_name: users.find((u: any) => u.id === s.user_id)?.full_name,
  }));

  res.json(enriched.reverse());
});
