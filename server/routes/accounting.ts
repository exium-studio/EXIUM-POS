import { Router } from 'express';
import { db } from '../db/store';
import {
  generateIncomeStatement,
  generateBalanceSheet,
  generateCashFlow,
  generateTaxReport,
  recordJournalEntry,
} from '../services/accounting';

export const accountingRouter = Router();

// Chart of Accounts (COA)
accountingRouter.get('/coa', (req, res) => {
  res.json(db.get('chart_of_accounts'));
});

// Journal Entries list
accountingRouter.get('/journals', (req, res) => {
  const branch_id = req.query.branch_id as string;
  let journals = db.get('journal_entries');
  const branches = db.get('branches');

  if (branch_id && branch_id !== 'all') {
    journals = journals.filter((j: any) => j.branch_id === branch_id);
  }

  const enriched = journals.map((j: any) => ({
    ...j,
    branch_name: branches.find((b: any) => b.id === j.branch_id)?.name,
  }));

  res.json(enriched.reverse());
});

// Manual Expense / Jurnal Pengeluaran Operasional
accountingRouter.post('/manual-expense', (req, res) => {
  const { branch_id, expense_account_code, payment_account_code, amount, description, user_id } = req.body;
  const numAmount = Number(amount);

  const entry = recordJournalEntry({
    branch_id,
    reference_type: 'expense_manual',
    reference_id: `EXP-${Date.now().toString().slice(-4)}`,
    description: description || 'Pengeluaran Operasional Manual',
    created_by: user_id,
    lines: [
      {
        account_code: expense_account_code, // e.g. 6101 Gaji, 6102 Listrik, 6103 Sewa
        debit: numAmount,
        credit: 0,
        notes: description,
      },
      {
        account_code: payment_account_code || '1101', // Kas Kasir (1101) atau Bank BCA (1102)
        debit: 0,
        credit: numAmount,
        notes: `Pembayaran ${description}`,
      },
    ],
  });

  res.json(entry);
});

// Laporan Laba Rugi (Income Statement)
accountingRouter.get('/reports/income-statement', (req, res) => {
  const branch_id = req.query.branch_id as string;
  const startDate = req.query.start_date as string;
  const endDate = req.query.end_date as string;
  const report = generateIncomeStatement(branch_id, startDate, endDate);
  res.json(report);
});

// Laporan Neraca (Balance Sheet)
accountingRouter.get('/reports/balance-sheet', (req, res) => {
  const branch_id = req.query.branch_id as string;
  const asOfDate = req.query.as_of_date as string;
  const report = generateBalanceSheet(branch_id, asOfDate);
  res.json(report);
});

// Laporan Arus Kas (Cash Flow)
accountingRouter.get('/reports/cash-flow', (req, res) => {
  const branch_id = req.query.branch_id as string;
  const startDate = req.query.start_date as string;
  const endDate = req.query.end_date as string;
  const report = generateCashFlow(branch_id, startDate, endDate);
  res.json(report);
});

// Laporan Pajak PPN (PPN Keluaran 11%)
accountingRouter.get('/reports/tax', (req, res) => {
  const branch_id = req.query.branch_id as string;
  const startDate = req.query.start_date as string;
  const endDate = req.query.end_date as string;
  const report = generateTaxReport(branch_id, startDate, endDate);
  res.json(report);
});
