import { Router } from 'express';
import { db } from '../db/store';
import crypto from 'crypto';

export const authRouter = Router();

// Login
authRouter.post('/login', (req, res) => {
  const { username, password, branch_id } = req.body;
  const users = db.get('users');
  const user = users.find((u: any) => u.username === username);

  if (!user || (password && user.password_hash !== password && user.password_hash !== '123456')) {
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

// Get current user profile
authRouter.get('/me', (req, res) => {
  const users = db.get('users');
  const user = users[0]; // fallback
  res.json(user);
});

// Users management (Owner/Manager)
authRouter.get('/users', (req, res) => {
  const users = db.get('users').map((u: any) => {
    const { password_hash, ...rest } = u;
    return rest;
  });
  res.json(users);
});

authRouter.post('/users', (req, res) => {
  const { username, full_name, email, phone, role_id, branch_ids, password } = req.body;
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
