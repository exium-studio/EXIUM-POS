import { Router } from 'express';
import { db } from '../db/store';

export const reportsRouter = Router();

// Owner Executive Multi-Branch Dashboard Metrics
reportsRouter.get('/dashboard', (req, res) => {
  const branches = db.get('branches');
  const transactions = db.get('transactions').filter((t: any) => t.payment_status === 'paid');
  const orders = db.get('orders').filter((o: any) => o.status === 'completed' || o.status === 'ready');
  const ingredients = db.get('ingredients');
  const stockBranches = db.get('stock_branch');

  let total_revenue = 0;
  let total_cogs = 0;
  let total_orders = orders.length;

  for (const t of transactions) {
    total_revenue += t.total_amount;
  }
  for (const o of orders) {
    total_cogs += o.cogs_total || 0;
  }

  const gross_profit = total_revenue - total_cogs;
  const gross_margin_pct = total_revenue > 0 ? ((gross_profit / total_revenue) * 100).toFixed(1) : '0';

  // Branch Performance Comparison
  const branch_performance = branches.map((b: any) => {
    const branchTrx = transactions.filter((t: any) => t.branch_id === b.id);
    const branchOrders = orders.filter((o: any) => o.branch_id === b.id);
    let rev = 0;
    let cogs = 0;
    for (const t of branchTrx) rev += t.total_amount;
    for (const o of branchOrders) cogs += o.cogs_total || 0;

    return {
      branch_id: b.id,
      branch_code: b.code,
      branch_name: b.name,
      revenue: rev,
      orders_count: branchOrders.length,
      cogs,
      gross_profit: rev - cogs,
      margin_pct: rev > 0 ? Math.round(((rev - cogs) / rev) * 100) : 0,
    };
  });

  // Top Selling Products
  const productSalesMap: { [name: string]: { name: string; qty: number; revenue: number } } = {};
  for (const o of orders) {
    for (const it of o.items) {
      if (!productSalesMap[it.product_name]) {
        productSalesMap[it.product_name] = { name: it.product_name, qty: 0, revenue: 0 };
      }
      productSalesMap[it.product_name].qty += it.quantity;
      productSalesMap[it.product_name].revenue += it.subtotal;
    }
  }
  const top_products = Object.values(productSalesMap).sort((a, b) => b.qty - a.qty).slice(0, 6);

  // Low Stock Items across all branches
  const low_stock_items: any[] = [];
  for (const s of stockBranches) {
    if (s.current_stock <= s.min_stock_alert) {
      const ing = ingredients.find((i: any) => i.id === s.item_id);
      const branch = branches.find((b: any) => b.id === s.branch_id);
      if (ing) {
        low_stock_items.push({
          branch_name: branch?.name,
          item_name: ing.name,
          current_stock: s.current_stock,
          min_stock: s.min_stock_alert,
          unit: ing.base_unit,
        });
      }
    }
  }

  // Hourly / Daily Sales Trend (mocked + actual)
  const sales_trend = [
    { hour: '08:00', revenue: Math.round(total_revenue * 0.08) },
    { hour: '10:00', revenue: Math.round(total_revenue * 0.12) },
    { hour: '12:00', revenue: Math.round(total_revenue * 0.28) },
    { hour: '14:00', revenue: Math.round(total_revenue * 0.16) },
    { hour: '16:00', revenue: Math.round(total_revenue * 0.14) },
    { hour: '18:00', revenue: Math.round(total_revenue * 0.22) },
  ];

  res.json({
    total_revenue,
    total_cogs,
    gross_profit,
    gross_margin_pct,
    total_orders,
    branch_performance,
    top_products,
    low_stock_items,
    sales_trend,
  });
});

// Export CSV report
reportsRouter.get('/export/sales-csv', (req, res) => {
  const orders = db.get('orders');
  const branches = db.get('branches');

  const headers = ['Order Number', 'Date', 'Branch', 'Customer', 'Type', 'Status', 'Subtotal', 'Tax', 'Service', 'Total', 'COGS'];
  const rows = orders.map((o: any) => {
    const branch = branches.find((b: any) => b.id === o.branch_id)?.name || o.branch_id;
    return [
      o.order_number,
      o.created_at.split('T')[0],
      `"${branch}"`,
      `"${o.customer_name}"`,
      o.order_type,
      o.status,
      o.subtotal,
      o.tax_amount,
      o.service_charge_amount,
      o.total_amount,
      o.cogs_total,
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="sales_report.csv"');
  res.send(csv);
});
