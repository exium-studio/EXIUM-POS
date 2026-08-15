import { Router } from 'express';
import { db } from '../db/store';
import { deductStockForOrder, restoreStockForOrder } from '../services/stock';
import QRCode from 'qrcode';
import { recordSalesJournal } from '../services/accounting';
import { paymentGateway } from '../services/payment-gateway';
import { formatThermalReceiptText, formatKitchenTicketText, formatPreBillThermalText } from '../services/printer';
import crypto from 'crypto';

export const posRouter = Router();

// Open Bills list (Active unpaid/open orders)
posRouter.get('/open-bills', (req, res) => {
  const branch_id = (req.query.branch_id as string) || 'branch-1';
  const orders = db.get('orders').filter((o: any) => 
    o.branch_id === branch_id && 
    (o.status === 'pending_payment' || o.status === 'received' || o.status === 'preparing' || o.status === 'ready')
  );
  const tables = db.get('dining_tables');
  const branches = db.get('branches');

  const enriched = orders.map((o: any) => {
    const table = tables.find((t: any) => t.id === o.table_id);
    const branch = branches.find((b: any) => b.id === o.branch_id);
    const itemCount = (o.items || []).reduce((acc: number, it: any) => acc + (Number(it.quantity) || 0), 0);
    return {
      ...o,
      table_number: table?.table_number || (o.order_type === 'take_away' ? 'Take Away' : 'Meja -'),
      table_zone: table?.zone,
      branch_name: branch?.name,
      item_count: itemCount,
    };
  });

  // Sort latest first
  res.json(enriched.reverse());
});

// Save or Update Open Bill (Hold Bill & Send to Kitchen)
posRouter.post('/open-bills', (req, res) => {
  const {
    order_id,
    client_uuid,
    branch_id,
    shift_id,
    table_id,
    customer_name,
    order_source,
    order_type,
    items,
    discount_amount,
    tax_amount,
    service_charge_amount,
    notes,
    user_id,
    member_id,
    points_used,
  } = req.body;

  // 1. If order_id exists, update existing Open Bill (e.g. adding more items)
  if (order_id) {
    const existingOrder = db.get('orders').find((o: any) => o.id === order_id);
    if (existingOrder) {
      let subtotal = 0;
      const orderItems = (items || []).map((it: any) => {
        const itemSubtotal = Number(it.quantity) * Number(it.unit_price);
        subtotal += itemSubtotal;
        return {
          id: it.id || `oi-${crypto.randomUUID()}`,
          order_id: existingOrder.id,
          product_id: it.product_id,
          variant_id: it.variant_id || null,
          product_name: it.product_name,
          variant_name: it.variant_name || null,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
          unit_cogs: Number(it.unit_cogs) || 0,
          subtotal: itemSubtotal,
          notes: it.notes || '',
          modifiers: it.modifiers || [],
          kitchen_station: it.kitchen_station || 'food',
          kitchen_status: it.kitchen_status || 'received',
          kitchen_updated_at: it.kitchen_updated_at || new Date().toISOString(),
        };
      });

      const disc = Number(discount_amount) || 0;
      const tax = Number(tax_amount) || 0;
      const sc = Number(service_charge_amount) || 0;
      const total = Math.max(0, subtotal - disc + tax + sc);

      existingOrder.table_id = table_id !== undefined ? table_id : existingOrder.table_id;
      existingOrder.customer_name = customer_name || existingOrder.customer_name;
      existingOrder.order_type = order_type || existingOrder.order_type;
      existingOrder.items = orderItems;
      existingOrder.subtotal = subtotal;
      existingOrder.discount_amount = disc;
      existingOrder.tax_amount = tax;
      existingOrder.service_charge_amount = sc;
      existingOrder.total_amount = total;
      existingOrder.notes = notes !== undefined ? notes : existingOrder.notes;
      existingOrder.member_id = member_id !== undefined ? member_id : existingOrder.member_id;
      existingOrder.points_used = points_used !== undefined ? points_used : existingOrder.points_used;
      if (existingOrder.status === 'pending_payment') {
        existingOrder.status = 'received';
      }

      db.update('orders', (o: any) => o.id === existingOrder.id, existingOrder);

      const tables = db.get('dining_tables');
      const table = tables.find((t: any) => t.id === existingOrder.table_id);
      return res.json({
        ...existingOrder,
        table_number: table?.table_number || (existingOrder.order_type === 'take_away' ? 'Take Away' : 'Meja -'),
      });
    }
  }

  // 2. Otherwise create a brand new Open Bill
  const order_number = `ORD-${Date.now().toString().slice(-6)}`;
  const newOrderId = client_uuid || `ord-${crypto.randomUUID()}`;

  let subtotal = 0;
  const orderItems = (items || []).map((it: any) => {
    const itemSubtotal = Number(it.quantity) * Number(it.unit_price);
    subtotal += itemSubtotal;
    return {
      id: `oi-${crypto.randomUUID()}`,
      order_id: newOrderId,
      product_id: it.product_id,
      variant_id: it.variant_id || null,
      product_name: it.product_name,
      variant_name: it.variant_name || null,
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      unit_cogs: Number(it.unit_cogs) || 0,
      subtotal: itemSubtotal,
      notes: it.notes || '',
      modifiers: it.modifiers || [],
      kitchen_station: it.kitchen_station || 'food',
      kitchen_status: 'received',
      kitchen_updated_at: new Date().toISOString(),
    };
  });

  const disc = Number(discount_amount) || 0;
  const tax = Number(tax_amount) || 0;
  const sc = Number(service_charge_amount) || 0;
  const total = Math.max(0, subtotal - disc + tax + sc);

  const newOrder = {
    id: newOrderId,
    client_uuid,
    order_number,
    branch_id: branch_id || 'branch-1',
    shift_id: shift_id || null,
    table_id: table_id || null,
    customer_name: customer_name || 'Guest Open Bill',
    order_source: order_source || 'pos_cashier',
    order_type: order_type || 'dine_in',
    status: 'received', // Open bill sent to kitchen
    subtotal,
    discount_amount: disc,
    tax_amount: tax,
    service_charge_amount: sc,
    total_amount: total,
    cogs_total: 0,
    notes: notes || '',
    created_by: user_id || 'user-cashier-jkt',
    created_at: new Date().toISOString(),
    items: orderItems,
    member_id: member_id || null,
    points_used: points_used || 0,
  };

  db.insert('orders', newOrder);

  const tables = db.get('dining_tables');
  const table = tables.find((t: any) => t.id === newOrder.table_id);

  res.json({
    ...newOrder,
    table_number: table?.table_number || (newOrder.order_type === 'take_away' ? 'Take Away' : 'Meja -'),
  });
});

// Update Order endpoint
posRouter.put('/orders/:id', (req, res) => {
  const order = db.get('orders').find((o: any) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order tidak ditemukan' });

  const updated = db.update('orders', (o: any) => o.id === req.params.id, {
    ...order,
    ...req.body,
  });

  res.json(updated);
});

// Move Table for Open Bill
posRouter.post('/orders/:id/move-table', (req, res) => {
  const { table_id } = req.body;
  const order = db.get('orders').find((o: any) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order tidak ditemukan' });

  order.table_id = table_id;
  db.update('orders', (o: any) => o.id === order.id, order);

  const table = db.get('dining_tables').find((t: any) => t.id === table_id);
  res.json({
    success: true,
    order,
    table_number: table?.table_number,
  });
});

// Cancel / Delete Unpaid Open Bill
posRouter.delete('/orders/:id', (req, res) => {
  const order = db.get('orders').find((o: any) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order tidak ditemukan' });

  if (order.status === 'completed') {
    return res.status(400).json({ error: 'Tidak dapat menghapus order yang sudah selesai/dibayar. Gunakan Void.' });
  }

  order.status = 'void';
  db.update('orders', (o: any) => o.id === order.id, order);

  res.json({ success: true, message: 'Open bill berhasil dibatalkan' });
});

// Print Pre-Bill (Tagihan Sementara)
posRouter.get('/pre-bill/:order_id', (req, res) => {
  const order = db.get('orders').find((o: any) => o.id === req.params.order_id || o.order_number === req.params.order_id);
  if (!order) return res.status(404).json({ error: 'Order tidak ditemukan' });

  const branch = db.get('branches').find((b: any) => b.id === order.branch_id);
  const user = db.get('users').find((u: any) => u.id === order.created_by);
  const table = db.get('dining_tables').find((t: any) => t.id === order.table_id);

  const preBillData = {
    branch_name: branch?.name || 'Kopi Nusantara',
    branch_address: branch?.address || '',
    branch_phone: branch?.phone || '',
    transaction_number: `PRE-${order.order_number.replace('ORD-', '')}`,
    order_number: order.order_number,
    table_number: table?.table_number,
    order_type: order.order_type === 'dine_in' ? 'Dine In' : 'Take Away',
    date_time: new Date(order.created_at).toLocaleString('id-ID'),
    cashier_name: user?.full_name || 'Staf Kasir',
    customer_name: order.customer_name || 'Pelanggan',
    items: (order.items || []).map((it: any) => ({
      name: it.product_name,
      variant: it.variant_name,
      qty: it.quantity,
      price: it.unit_price,
      subtotal: it.subtotal,
      notes: it.notes,
    })),
    subtotal: order.subtotal || 0,
    discount: order.discount_amount || 0,
    tax: order.tax_amount || 0,
    service_charge: order.service_charge_amount || 0,
    total: order.total_amount,
    paper_width_mm: (branch?.receipt_paper_width === '58mm' ? 58 : 80) as 58 | 80,
  };

  const raw_text = formatPreBillThermalText(preBillData);

  res.json({
    data: preBillData,
    raw_text,
  });
});

// Dining Tables list
posRouter.get('/tables', async (req, res) => {
  const branch_id = (req.query.branch_id as string) || 'branch-1';
  const tables = db.get('dining_tables').filter((t: any) => t.branch_id === branch_id);
  const activeOrders = db.get('orders').filter((o: any) => o.branch_id === branch_id && o.status !== 'completed' && o.status !== 'void');

  try {
    const enriched = await Promise.all(tables.map(async (t: any) => {
      const tableOrder = activeOrders.find((o: any) => o.table_id === t.id);
      
      // Construct url for self ordering dynamically with correct protocol (http/https) and host from Cloudflare headers
      const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
      const host = req.headers.host || 'localhost:3000';
      const appUrl = process.env.APP_URL || `${proto}://${host}`;
      const selfOrderUrl = `${appUrl}/?table_token=${t.qr_token}&table_id=${t.id}`;
      
      let qr_code_url = '';
      try {
        qr_code_url = await QRCode.toDataURL(selfOrderUrl, { margin: 2, scale: 8 });
      } catch (err) {
        console.error(`Gagal membuat QRCode untuk meja ${t.table_number}:`, err);
      }

      return {
        ...t,
        occupied: Boolean(tableOrder),
        current_order_id: tableOrder?.id,
        current_order: tableOrder,
        qr_code_url,
      };
    }));

    res.json(enriched);
  } catch (err: any) {
    console.error('Error fetching tables:', err);
    res.status(500).json({ error: 'Gagal memuat denah meja' });
  }
});

// Update Table QR Config
posRouter.put('/tables/:id', (req, res) => {
  const updated = db.update('dining_tables', (t: any) => t.id === req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Meja tidak ditemukan' });
  res.json(updated);
});

// Create Table
posRouter.post('/tables', (req, res) => {
  const { branch_id, table_number, zone, capacity, order_mode, payment_flow } = req.body;
  const branch = db.get('branches').find((b: any) => b.id === branch_id);
  const newTable = {
    id: `tbl-${crypto.randomUUID()}`,
    branch_id,
    table_number,
    zone: zone || 'Indoor',
    capacity: Number(capacity) || 4,
    qr_token: `TABLE-${branch?.code || 'CAB'}-${table_number}`,
    order_mode: order_mode || 'can_order',
    payment_flow: payment_flow || 'pay_at_cashier',
    is_active: true,
  };
  db.insert('dining_tables', newTable);
  res.json(newTable);
});

// Lookup table info by QR token (Customer QR self-order)
posRouter.get('/table-qr/:token', (req, res) => {
  const token = req.params.token;
  const tables = db.get('dining_tables');
  const table = tables.find((t: any) => t.qr_token === token || t.id === token);
  if (!table) return res.status(404).json({ error: 'QR Meja tidak valid' });

  const branch = db.get('branches').find((b: any) => b.id === table.branch_id);
  res.json({
    table,
    branch,
  });
});

// Orders list
posRouter.get('/orders', (req, res) => {
  const branch_id = req.query.branch_id as string;
  const status = req.query.status as string;
  let orders = db.get('orders');
  const tables = db.get('dining_tables');
  const branches = db.get('branches');

  if (branch_id && branch_id !== 'all') {
    orders = orders.filter((o: any) => o.branch_id === branch_id);
  }
  if (status) {
    orders = orders.filter((o: any) => o.status === status);
  }

  const enriched = orders.map((o: any) => ({
    ...o,
    table_number: tables.find((t: any) => t.id === o.table_id)?.table_number,
    branch_name: branches.find((b: any) => b.id === o.branch_id)?.name,
  }));

  res.json(enriched.reverse());
});

// Create Order (POS Cashier or Customer QR self-order)
posRouter.post('/orders', (req, res) => {
  const {
    client_uuid,
    branch_id,
    shift_id,
    table_id,
    customer_name,
    order_source,
    order_type,
    items,
    discount_amount,
    tax_amount,
    service_charge_amount,
    notes,
    user_id,
    member_id,
    points_used,
  } = req.body;

  // Idempotency check for offline sync
  if (client_uuid) {
    const existing = db.get('orders').find((o: any) => o.client_uuid === client_uuid);
    if (existing) {
      return res.json(existing);
    }
  }

  const order_number = `ORD-${Date.now().toString().slice(-6)}`;
  const orderId = client_uuid || `ord-${crypto.randomUUID()}`;

  let subtotal = 0;
  const orderItems = (items || []).map((it: any) => {
    const itemSubtotal = Number(it.quantity) * Number(it.unit_price);
    subtotal += itemSubtotal;
    return {
      id: `oi-${crypto.randomUUID()}`,
      order_id: orderId,
      product_id: it.product_id,
      variant_id: it.variant_id || null,
      product_name: it.product_name,
      variant_name: it.variant_name || null,
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      unit_cogs: Number(it.unit_cogs) || 0,
      subtotal: itemSubtotal,
      notes: it.notes || '',
      modifiers: it.modifiers || [],
      kitchen_station: it.kitchen_station || 'food',
      kitchen_status: 'received',
      kitchen_updated_at: new Date().toISOString(),
    };
  });

  const disc = Number(discount_amount) || 0;
  const tax = Number(tax_amount) || 0;
  const sc = Number(service_charge_amount) || 0;
  const total = Math.max(0, subtotal - disc + tax + sc);

  const initialStatus = order_source === 'qr_customer' ? 'received' : 'pending_payment';

  const newOrder = {
    id: orderId,
    client_uuid,
    order_number,
    branch_id: branch_id || 'branch-1',
    shift_id: shift_id || null,
    table_id: table_id || null,
    customer_name: customer_name || 'Guest',
    order_source: order_source || 'pos_cashier',
    order_type: order_type || 'dine_in',
    status: initialStatus,
    subtotal,
    discount_amount: disc,
    tax_amount: tax,
    service_charge_amount: sc,
    total_amount: total,
    cogs_total: 0,
    notes: notes || '',
    created_by: user_id || 'user-cashier-jkt',
    created_at: new Date().toISOString(),
    items: orderItems,
    member_id: member_id || null,
    points_used: points_used || 0,
  };

  db.insert('orders', newOrder);

  // If customer redeemed points, deduct points from member
  if (member_id && points_used > 0) {
    const members = db.get('members');
    const mem = members.find((m: any) => m.id === member_id);
    if (mem) {
      mem.points = Math.max(0, mem.points - points_used);
      db.update('members', (m: any) => m.id === member_id, mem);
      db.insert('member_point_logs', {
        id: `mpl-${crypto.randomUUID()}`,
        member_id,
        transaction_id: order_number,
        points_change: -points_used,
        action: 'redeemed_discount',
        created_at: new Date().toISOString(),
      });
    }
  }

  res.json(newOrder);
});

// Generate Dynamic QRIS for order
posRouter.post('/payment/qris', async (req, res) => {
  const { order_id, amount, customer_name, provider } = req.body;
  const order = db.get('orders').find((o: any) => o.id === order_id);
  if (!order) return res.status(404).json({ error: 'Order tidak ditemukan' });

  try {
    const qrisResult = await paymentGateway.createQRIS({
      order_id: order.id,
      order_number: order.order_number,
      amount: Number(amount) || order.total_amount,
      customer_name: customer_name || order.customer_name,
      provider: provider || 'midtrans',
    });

    res.json(qrisResult);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal generate QRIS', details: err.message });
  }
});

// Process Transaction (Pay for order)
posRouter.post('/transactions', (req, res) => {
  const {
    client_uuid,
    order_id,
    branch_id,
    shift_id,
    total_amount,
    paid_amount,
    change_amount,
    payment_method,
    payment_gateway_ref,
    is_offline_sync,
    user_id,
  } = req.body;

  // Idempotency check
  if (client_uuid) {
    const existing = db.get('transactions').find((t: any) => t.client_uuid === client_uuid);
    if (existing) {
      return res.json(existing);
    }
  }

  const order = db.get('orders').find((o: any) => o.id === order_id);
  if (!order) return res.status(404).json({ error: 'Order tidak ditemukan' });

  const transaction_number = `TRX-${Date.now().toString().slice(-6)}`;
  const trxId = client_uuid || `trx-${crypto.randomUUID()}`;

  const newTrx = {
    id: trxId,
    client_uuid,
    transaction_number,
    order_id: order.id,
    branch_id: branch_id || order.branch_id,
    shift_id: shift_id || order.shift_id,
    member_id: order.member_id,
    total_amount: Number(total_amount) || order.total_amount,
    paid_amount: Number(paid_amount) || order.total_amount,
    change_amount: Number(change_amount) || 0,
    payment_method: payment_method || 'cash',
    payment_status: 'paid',
    payment_gateway_ref: payment_gateway_ref || null,
    is_offline_sync: Boolean(is_offline_sync),
    created_by: user_id || order.created_by || 'user-cashier-jkt',
    created_at: new Date().toISOString(),
  };

  db.insert('transactions', newTrx);

  // Update order status
  order.status = 'completed';
  order.completed_at = new Date().toISOString();
  order.payment_method = payment_method;
  order.payment_status = 'paid';

  // 1. Deduct recipe stock & calculate COGS
  const stockResult = deductStockForOrder(order, newTrx.branch_id, newTrx.created_by);
  order.cogs_total = stockResult.cogs_total;

  db.update('orders', (o: any) => o.id === order.id, order);

  // 2. Record Double-Entry Accounting Journal
  recordSalesJournal(order, newTrx, stockResult.cogs_total);

  // 3. Accumulate Member Points (1 point per Rp 10.000)
  if (order.member_id) {
    const pointsEarned = Math.floor(newTrx.total_amount / 10000);
    if (pointsEarned > 0) {
      const members = db.get('members');
      const mem = members.find((m: any) => m.id === order.member_id);
      if (mem) {
        mem.points += pointsEarned;
        mem.total_spent += newTrx.total_amount;
        mem.total_visits += 1;
        // Upgrade tier
        if (mem.total_spent >= 5000000) mem.tier = 'Platinum';
        else if (mem.total_spent >= 2500000) mem.tier = 'Gold';
        else if (mem.total_spent >= 1000000) mem.tier = 'Silver';

        db.update('members', (m: any) => m.id === order.member_id, mem);
        db.insert('member_point_logs', {
          id: `mpl-${crypto.randomUUID()}`,
          member_id: order.member_id,
          transaction_id: newTrx.transaction_number,
          points_change: pointsEarned,
          action: 'earned_from_purchase',
          created_at: new Date().toISOString(),
        });
        order.points_earned = pointsEarned;
      }
    }
  }

  res.json({
    transaction: newTrx,
    order,
    low_stock_alerts: stockResult.low_stock_alerts,
  });
});

// Void Transaction & Order (Requires Manager Approval)
posRouter.post('/transactions/:id/void', (req, res) => {
  const { void_reason, approved_by_user_id } = req.body;
  const trx = db.get('transactions').find((t: any) => t.id === req.params.id);
  if (!trx) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });

  trx.payment_status = 'void';
  trx.void_reason = void_reason;
  trx.void_by = approved_by_user_id;
  db.update('transactions', (t: any) => t.id === trx.id, trx);

  const order = db.get('orders').find((o: any) => o.id === trx.order_id);
  if (order) {
    order.status = 'void';
    db.update('orders', (o: any) => o.id === order.id, order);
    // Restore stock
    restoreStockForOrder(order, trx.branch_id, void_reason, approved_by_user_id);
  }

  // Audit log
  db.insert('audit_logs', {
    id: `log-${crypto.randomUUID()}`,
    branch_id: trx.branch_id,
    user_id: approved_by_user_id,
    action: 'VOID_TRANSACTION',
    entity_type: 'transaction',
    entity_id: trx.id,
    new_values: { transaction_number: trx.transaction_number, reason: void_reason },
    created_at: new Date().toISOString(),
  });

  res.json({ success: true, transaction: trx });
});

// Print Thermal Receipt Formatter
posRouter.get('/receipt/:transaction_id', (req, res) => {
  const trx = db.get('transactions').find((t: any) => t.id === req.params.transaction_id || t.transaction_number === req.params.transaction_id);
  if (!trx) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });

  const order = db.get('orders').find((o: any) => o.id === trx.order_id);
  const branch = db.get('branches').find((b: any) => b.id === trx.branch_id);
  const user = db.get('users').find((u: any) => u.id === trx.created_by);
  const table = db.get('dining_tables').find((t: any) => t.id === order?.table_id);

  const receiptData = {
    branch_name: branch?.name || 'Kopi Nusantara',
    branch_address: branch?.address || '',
    branch_phone: branch?.phone || '',
    transaction_number: trx.transaction_number,
    order_number: order?.order_number || '',
    table_number: table?.table_number,
    order_type: order?.order_type === 'dine_in' ? 'Dine In' : 'Take Away',
    date_time: new Date(trx.created_at).toLocaleString('id-ID'),
    cashier_name: user?.full_name || 'Kasir',
    customer_name: order?.customer_name || 'Pelanggan',
    items: (order?.items || []).map((it: any) => ({
      name: it.product_name,
      variant: it.variant_name,
      qty: it.quantity,
      price: it.unit_price,
      subtotal: it.subtotal,
      notes: it.notes,
    })),
    subtotal: order?.subtotal || 0,
    discount: order?.discount_amount || 0,
    tax: order?.tax_amount || 0,
    service_charge: order?.service_charge_amount || 0,
    total: trx.total_amount,
    payment_method: trx.payment_method,
    paid_amount: trx.paid_amount,
    change_amount: trx.change_amount,
    paper_width_mm: (branch?.receipt_paper_width === '58mm' ? 58 : 80) as 58 | 80,
    // Custom receipt settings from branch
    receipt_header_name: branch?.receipt_header_name,
    receipt_header_tagline: branch?.receipt_header_tagline,
    receipt_footer_text: branch?.receipt_footer_text,
    receipt_show_social: branch?.receipt_show_social !== false,
    receipt_social_handle: branch?.receipt_social_handle,
    receipt_tax_label: branch?.receipt_tax_label,
    receipt_service_label: branch?.receipt_service_label,
    receipt_logo_url: branch?.receipt_logo_url,
  };

  const receiptText = formatThermalReceiptText(receiptData);
  const kitchenFoodText = order ? formatKitchenTicketText(order, 'food') : '';
  const kitchenBevText = order ? formatKitchenTicketText(order, 'beverage') : '';

  res.json({
    data: receiptData,
    raw_text: receiptText,
    kitchen_food_text: kitchenFoodText,
    kitchen_beverage_text: kitchenBevText,
  });
});
