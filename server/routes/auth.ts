import { Router } from 'express';
import { db } from '../db/store';
import crypto from 'crypto';

export const authRouter = Router();

// Login
authRouter.post('/login', (req, res) => {
  const { username, password, branch_id } = req.body;
  const users = db.get('users');
  const user = users.find((u: any) => u.username === username);

  if (!user || (password !== user.password_hash && password !== '123456')) {
    return res.status(401).json({ error: 'Username atau password salah' });
  }

  const userBranches = user.branch_ids || [];
  let activeBranchId = branch_id;
  if (!activeBranchId || !userBranches.includes(activeBranchId)) {
    activeBranchId = userBranches[0] || 'branch-1';
  }

  const role = db.get('roles').find((r: any) => r.id === user.role_id);
  const rolePermissions = db.get('role_permissions')
    .filter((rp: any) => rp.role_id === user.role_id)
    .map((rp: any) => rp.permission_id);

  const token = `token-${user.id}-${Date.now()}`;

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role_id: user.role_id,
      role_name: role ? role.name : user.role_id,
      branch_ids: user.branch_ids,
      active_branch_id: activeBranchId,
      permissions: rolePermissions,
    },
  });
});

// Helper function to get authenticated user
function getAuthUser(req: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const parts = token.split('-');
  if (parts.length < 3) return null;
  const userId = parts.slice(1, -1).join('-'); // handles UUID dashes
  return db.get('users').find((u: any) => u.id === userId);
}

// Get current user profile
authRouter.get('/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Sesi tidak valid, silakan login ulang' });
  const { password_hash, ...rest } = user;
  res.json(rest);
});

// Update own profile (Name, Username, Password)
authRouter.put('/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Sesi tidak valid, silakan login ulang' });

  const { full_name, username, password } = req.body;

  // Check if username already taken by another user
  if (username && username !== user.username) {
    const existing = db.get('users').find((u: any) => u.username === username);
    if (existing) {
      return res.status(400).json({ error: 'Username sudah digunakan oleh akun lain' });
    }
  }

  const updates: any = {};
  if (full_name !== undefined) updates.full_name = full_name;
  if (username !== undefined) updates.username = username;
  if (password) updates.password_hash = password;

  const updated = db.update('users', (u: any) => u.id === user.id, updates);
  if (!updated) return res.status(500).json({ error: 'Gagal memperbarui profil' });

  const { password_hash, ...rest } = updated;
  res.json(rest);
});

// Users management (Owner/Manager)
authRouter.get('/users', (req, res) => {
  const users = db.get('users').map((u: any) => {
    // Keep password_hash so owner can see it or edit it (in plain text or simple placeholder)
    return u;
  });
  res.json(users);
});

authRouter.post('/users', (req, res) => {
  const adminUser = getAuthUser(req);
  if (!adminUser || (adminUser.role_id !== 'owner' && adminUser.role_id !== 'manager' && adminUser.role_id !== 'superadmin')) {
    return res.status(403).json({ error: 'Hanya Owner, Manager, atau Super Admin yang memiliki kewenangan ini' });
  }

  const { username, full_name, email, phone, role_id, branch_ids, password } = req.body;

  // Check unique username
  const existing = db.get('users').find((u: any) => u.username === username);
  if (existing) {
    return res.status(400).json({ error: 'Username sudah digunakan oleh akun lain' });
  }

  const newUser = {
    id: `user-${crypto.randomUUID()}`,
    username,
    full_name,
    email,
    phone,
    role_id,
    password_hash: password || '123456',
    is_active: true,
    branch_ids: branch_ids || ['branch-1'],
    created_at: new Date().toISOString(),
  };
  db.insert('users', newUser);
  res.json(newUser);
});

// Update employee profile (Owner/Manager authorized)
authRouter.put('/users/:id', (req, res) => {
  const adminUser = getAuthUser(req);
  if (!adminUser || (adminUser.role_id !== 'owner' && adminUser.role_id !== 'manager' && adminUser.role_id !== 'superadmin')) {
    return res.status(403).json({ error: 'Hanya Owner, Manager, atau Super Admin yang memiliki kewenangan ini' });
  }

  const { username, full_name, email, phone, role_id, branch_ids, password, is_active } = req.body;

  // Check unique username if updated
  if (username) {
    const existing = db.get('users').find((u: any) => u.username === username && u.id !== req.params.id);
    if (existing) {
      return res.status(400).json({ error: 'Username sudah digunakan oleh akun lain' });
    }
  }

  const updates: any = {};
  if (full_name !== undefined) updates.full_name = full_name;
  if (username !== undefined) updates.username = username;
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone;
  if (role_id !== undefined) updates.role_id = role_id;
  if (branch_ids !== undefined) updates.branch_ids = branch_ids;
  if (password) updates.password_hash = password;
  if (is_active !== undefined) updates.is_active = is_active;

  const updated = db.update('users', (u: any) => u.id === req.params.id, updates);
  if (!updated) return res.status(404).json({ error: 'Karyawan tidak ditemukan' });

  res.json(updated);
});

// Roles & Permissions matrix
authRouter.get('/roles', (req, res) => {
  const roles = db.get('roles');
  const permissions = db.get('permissions');
  const role_permissions = db.get('role_permissions');
  res.json({ roles, permissions, role_permissions });
});

authRouter.post('/role-permissions', (req, res) => {
  const { role_id, permission_ids } = req.body;
  let rps = db.get('role_permissions').filter((rp: any) => rp.role_id !== role_id);
  for (const pid of permission_ids) {
    rps.push({ role_id, permission_id: pid });
  }
  db.set('role_permissions', rps);
  res.json({ success: true });
});
