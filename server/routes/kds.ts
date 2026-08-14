import { Router } from 'express';
import { db } from '../db/store';

export const kdsRouter = Router();

// Get active kitchen queue by branch and station
kdsRouter.get('/queue', (req, res) => {
  const branch_id = (req.query.branch_id as string) || 'branch-1';
  const station = req.query.station as 'food' | 'beverage' | 'all'; // food, beverage, or all

  const orders = db.get('orders').filter((o: any) => o.branch_id === branch_id && (o.status === 'received' || o.status === 'preparing' || o.status === 'ready' || o.status === 'pending_payment'));
  const tables = db.get('dining_tables');

  const kitchenOrders = orders
    .map((o: any) => {
      const table = tables.find((t: any) => t.id === o.table_id);
      const filteredItems = (o.items || []).filter((item: any) => {
        if (!station || station === 'all') return true;
        return item.kitchen_station === station;
      });

      if (filteredItems.length === 0) return null;

      // Calculate order readiness
      const allItemsReady = filteredItems.every((it: any) => it.kitchen_status === 'ready' || it.kitchen_status === 'served');
      const inPrep = filteredItems.some((it: any) => it.kitchen_status === 'in_prep');

      return {
        id: o.id,
        order_number: o.order_number,
        table_number: table?.table_number || 'Take Away',
        customer_name: o.customer_name,
        order_type: o.order_type,
        order_source: o.order_source,
        created_at: o.created_at,
        notes: o.notes,
        status: o.status,
        allItemsReady,
        inPrep,
        items: filteredItems,
      };
    })
    .filter(Boolean);

  res.json(kitchenOrders);
});

// Update specific kitchen item status
kdsRouter.post('/item-status', (req, res) => {
  const { order_id, item_id, status } = req.body; // 'received' | 'in_prep' | 'ready' | 'served'
  const orders = db.get('orders');
  const order = orders.find((o: any) => o.id === order_id);
  if (!order) return res.status(404).json({ error: 'Order tidak ditemukan' });

  const item = (order.items || []).find((i: any) => i.id === item_id);
  if (!item) return res.status(404).json({ error: 'Item order tidak ditemukan' });

  item.kitchen_status = status;
  item.kitchen_updated_at = new Date().toISOString();

  // Check if all items in the order are ready
  const allReady = order.items.every((i: any) => i.kitchen_status === 'ready' || i.kitchen_status === 'served');
  const anyPrep = order.items.some((i: any) => i.kitchen_status === 'in_prep');

  if (allReady) {
    order.status = 'ready';
  } else if (anyPrep) {
    order.status = 'preparing';
  }

  db.update('orders', (o: any) => o.id === order.id, order);

  res.json({
    order,
    item,
    order_status: order.status,
  });
});

// Mark all station items in an order as ready
kdsRouter.post('/order-ready', (req, res) => {
  const { order_id, station } = req.body;
  const order = db.get('orders').find((o: any) => o.id === order_id);
  if (!order) return res.status(404).json({ error: 'Order tidak ditemukan' });

  for (const it of order.items) {
    if (!station || station === 'all' || it.kitchen_station === station) {
      it.kitchen_status = 'ready';
      it.kitchen_updated_at = new Date().toISOString();
    }
  }

  const allReady = order.items.every((i: any) => i.kitchen_status === 'ready' || i.kitchen_status === 'served');
  if (allReady) {
    order.status = 'ready';
  }

  db.update('orders', (o: any) => o.id === order.id, order);
  res.json(order);
});
