import { Router } from 'express';
import { db } from '../db/store';
import crypto from 'crypto';

export const loyaltyRouter = Router();

// Members List & Search
loyaltyRouter.get('/members', (req, res) => {
  const q = (req.query.q as string)?.toLowerCase();
  let members = db.get('members');
  if (q) {
    members = members.filter((m: any) => m.name.toLowerCase().includes(q) || m.phone.includes(q));
  }
  res.json(members);
});

// Member Lookup by phone
loyaltyRouter.get('/members/phone/:phone', (req, res) => {
  const mem = db.get('members').find((m: any) => m.phone === req.params.phone);
  if (!mem) return res.status(404).json({ error: 'Member tidak ditemukan' });
  res.json(mem);
});

// Create Member
loyaltyRouter.post('/members', (req, res) => {
  const { name, phone, email } = req.body;
  const existing = db.get('members').find((m: any) => m.phone === phone);
  if (existing) {
    return res.status(400).json({ error: 'Nomor telepon sudah terdaftar' });
  }

  const newMember = {
    id: `mem-${crypto.randomUUID()}`,
    name,
    phone,
    email: email || '',
    points: 50, // Welcome bonus 50 points
    tier: 'Bronze',
    total_spent: 0,
    total_visits: 1,
    created_at: new Date().toISOString(),
  };

  db.insert('members', newMember);
  res.json(newMember);
});

// Promotions
loyaltyRouter.get('/promotions', (req, res) => {
  res.json(db.get('promotions'));
});

loyaltyRouter.post('/promotions', (req, res) => {
  const newPromo = {
    id: `promo-${crypto.randomUUID()}`,
    code: req.body.code?.toUpperCase(),
    name: req.body.name,
    promo_type: req.body.promo_type || 'percentage_discount',
    discount_value: Number(req.body.discount_value) || 0,
    min_order_amount: Number(req.body.min_order_amount) || 0,
    applicable_category_id: req.body.applicable_category_id || null,
    start_hour: req.body.start_hour || null,
    end_hour: req.body.end_hour || null,
    is_active: true,
  };
  db.insert('promotions', newPromo);
  res.json(newPromo);
});

// Get Loyalty Configuration
loyaltyRouter.get('/config', (req, res) => {
  const config = db.get('loyalty_config') || {
    points_multiplier_idr: 10000,
    tier_silver_min: 1000000,
    tier_gold_min: 5000000,
    tier_platinum_min: 10000000,
  };
  res.json(config);
});

// Update Loyalty Configuration
loyaltyRouter.put('/config', (req, res) => {
  const { points_multiplier_idr, tier_silver_min, tier_gold_min, tier_platinum_min } = req.body;
  const updatedConfig = {
    points_multiplier_idr: Number(points_multiplier_idr) || 10000,
    tier_silver_min: Number(tier_silver_min) || 1000000,
    tier_gold_min: Number(tier_gold_min) || 5000000,
    tier_platinum_min: Number(tier_platinum_min) || 10000000,
  };
  db.set('loyalty_config', updatedConfig);
  res.json(updatedConfig);
});
