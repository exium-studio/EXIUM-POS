import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

import { authRouter } from './server/routes/auth';
import { branchesRouter } from './server/routes/branches';
import { productsRouter } from './server/routes/products';
import { stockRouter } from './server/routes/stock';
import { purchaseRouter } from './server/routes/purchase';
import { shiftsRouter } from './server/routes/shifts';
import { posRouter } from './server/routes/pos';
import { kdsRouter } from './server/routes/kds';
import { accountingRouter } from './server/routes/accounting';
import { attendanceRouter } from './server/routes/attendance';
import { loyaltyRouter } from './server/routes/loyalty';
import { reportsRouter } from './server/routes/reports';
import { db } from './server/db/store';
import { deductStockForOrder } from './server/services/stock';
import { recordSalesJournal } from './server/services/accounting';

async function startServer() {
  // Initialize DB before setting up Express and checking seed conditions
  await db.initialize();

  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  const server = http.createServer(app);

  // WebSocket Server for Realtime KDS & Order updates
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Nusantara POS Realtime Engine Connected' }));

    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message.toString());
        // Broadcast to all connected clients
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(parsed));
          }
        });
      } catch (e) {
        console.error('WS Parse error', e);
      }
    });
  });

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Seed sample initial transactions if empty to populate KDS & Accounting
  if (db.get('orders').length === 0) {
    // 1. Completed order (Es Kopi Susu + Nasi Goreng)
    const seedOrder1: any = {
      id: 'ord-seed-01',
      order_number: 'ORD-100201',
      branch_id: 'branch-1',
      shift_id: 'shift-active-1',
      table_id: 'tbl-jkt-1',
      customer_name: 'Bpk. Hendra',
      order_source: 'pos_cashier',
      order_type: 'dine_in',
      status: 'completed',
      subtotal: 60000,
      discount_amount: 0,
      tax_amount: 6600,
      service_charge_amount: 3000,
      total_amount: 69600,
      cogs_total: 19320,
      notes: 'Less spicy nasi goreng',
      created_by: 'user-cashier-jkt',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      completed_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      items: [
        {
          id: 'oi-s1-1',
          order_id: 'ord-seed-01',
          product_id: 'prod-kopisusu',
          variant_id: 'var-kopi-reg',
          product_name: 'Es Kopi Susu Gula Aren',
          variant_name: 'Reguler (16oz)',
          quantity: 1,
          unit_price: 22000,
          unit_cogs: 7420,
          subtotal: 22000,
          kitchen_station: 'beverage',
          kitchen_status: 'served',
        },
        {
          id: 'oi-s1-2',
          order_id: 'ord-seed-01',
          product_id: 'prod-nasigoreng',
          variant_id: null,
          product_name: 'Nasi Goreng Kampung Spesial',
          quantity: 1,
          unit_price: 38000,
          unit_cogs: 11900,
          subtotal: 38000,
          kitchen_station: 'food',
          kitchen_status: 'served',
        },
      ],
      payment_method: 'qris',
      payment_status: 'paid',
    };
    db.insert('orders', seedOrder1);

    const seedTrx1: any = {
      id: 'trx-seed-01',
      transaction_number: 'TRX-100201',
      order_id: 'ord-seed-01',
      branch_id: 'branch-1',
      shift_id: 'shift-active-1',
      total_amount: 69600,
      paid_amount: 69600,
      change_amount: 0,
      payment_method: 'qris',
      payment_status: 'paid',
      created_by: 'user-cashier-jkt',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    };
    db.insert('transactions', seedTrx1);
    recordSalesJournal(seedOrder1, seedTrx1, 19320);

    // 2. Active KDS order (Table 02)
    const seedOrder2: any = {
      id: 'ord-seed-02',
      order_number: 'ORD-100202',
      branch_id: 'branch-1',
      shift_id: 'shift-active-1',
      table_id: 'tbl-jkt-2',
      customer_name: 'Ibu Rina (Meja 02)',
      order_source: 'qr_customer',
      order_type: 'dine_in',
      status: 'received',
      subtotal: 67000,
      discount_amount: 0,
      tax_amount: 7370,
      service_charge_amount: 3350,
      total_amount: 77720,
      cogs_total: 0,
      notes: 'Jangan terlalu manis',
      created_by: 'system',
      created_at: new Date(Date.now() - 600000).toISOString(),
      items: [
        {
          id: 'oi-s2-1',
          order_id: 'ord-seed-02',
          product_id: 'prod-cappuccino',
          variant_id: 'var-cap-hot',
          product_name: 'Artisan Cappuccino',
          variant_name: 'Hot (8oz)',
          quantity: 1,
          unit_price: 32000,
          unit_cogs: 7200,
          subtotal: 32000,
          kitchen_station: 'beverage',
          kitchen_status: 'in_prep',
        },
        {
          id: 'oi-s2-2',
          order_id: 'ord-seed-02',
          product_id: 'prod-ayamgeprek',
          variant_id: null,
          product_name: 'Ayam Crispy Sambal Korek + Nasi',
          quantity: 1,
          unit_price: 35000,
          unit_cogs: 12650,
          subtotal: 35000,
          kitchen_station: 'food',
          kitchen_status: 'received',
        },
      ],
    };
    db.insert('orders', seedOrder2);
  }

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/branches', branchesRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/stock', stockRouter);
  app.use('/api/purchase', purchaseRouter);
  app.use('/api/shifts', shiftsRouter);
  app.use('/api/pos', posRouter);
  app.use('/api/kds', kdsRouter);
  app.use('/api/accounting', accountingRouter);
  app.use('/api/attendance', attendanceRouter);
  app.use('/api/loyalty', loyaltyRouter);
  app.use('/api/reports', reportsRouter);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Nusantara POS Enterprise Server',
      timestamp: new Date().toISOString(),
    });
  });

  // Reset database endpoint
  app.post('/api/system/reset', (req, res) => {
    db.resetToSeed();
    res.json({ success: true, message: 'Database reset to seed data' });
  });

  // Vite Middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`NUSANTARA POS ENTERPRISE is running on port ${PORT}`);
    console.log(`=======================================================`);
  });
}

startServer();
