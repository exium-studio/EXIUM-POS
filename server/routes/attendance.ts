import { Router } from 'express';
import { db } from '../db/store';
import crypto from 'crypto';

export const attendanceRouter = Router();

// Attendance history
attendanceRouter.get('/', (req, res) => {
  const branch_id = req.query.branch_id as string;
  const user_id = req.query.user_id as string;
  let attendances = db.get('attendances');
  const branches = db.get('branches');
  const users = db.get('users');

  if (branch_id && branch_id !== 'all') {
    attendances = attendances.filter((a: any) => a.branch_id === branch_id);
  }
  if (user_id) {
    attendances = attendances.filter((a: any) => a.user_id === user_id);
  }

  const enriched = attendances.map((a: any) => ({
    ...a,
    branch_name: branches.find((b: any) => b.id === a.branch_id)?.name,
    user_name: users.find((u: any) => u.id === a.user_id)?.full_name,
  }));

  res.json(enriched.reverse());
});

// Clock In
attendanceRouter.post('/clock-in', (req, res) => {
  const { user_id, branch_id, shift_schedule, photo_url, latitude, longitude, notes } = req.body;
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();

  // Calculate if late (if schedule is 08:00 and clock in is after 08:15)
  const isLate = now.getHours() > 8 || (now.getHours() === 8 && now.getMinutes() > 15);
  const lateMinutes = isLate ? (now.getHours() - 8) * 60 + now.getMinutes() : 0;

  const newAttendance = {
    id: `att-${crypto.randomUUID()}`,
    user_id,
    branch_id,
    date: today,
    clock_in: now.toISOString(),
    shift_schedule: shift_schedule || 'Pagi (08:00 - 16:00)',
    is_late: isLate,
    late_minutes: lateMinutes,
    photo_url: photo_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=60',
    latitude: latitude || -6.1954,
    longitude: longitude || 106.8402,
    notes: notes || (isLate ? `Terlambat ${lateMinutes} menit` : 'Tepat Waktu'),
    created_at: now.toISOString(),
  };

  db.insert('attendances', newAttendance);
  res.json(newAttendance);
});

// Clock Out
attendanceRouter.post('/:id/clock-out', (req, res) => {
  const att = db.get('attendances').find((a: any) => a.id === req.params.id);
  if (!att) return res.status(404).json({ error: 'Data absensi tidak ditemukan' });

  att.clock_out = new Date().toISOString();
  db.update('attendances', (a: any) => a.id === att.id, att);
  res.json(att);
});
