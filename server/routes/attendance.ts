import { Router } from 'express';
import { db } from '../db/store';
import crypto from 'crypto';

export const attendanceRouter = Router();

// Attendance history & logs
attendanceRouter.get('/logs', (req, res) => {
  const branch_id = req.query.branch_id as string;
  const user_id = req.query.user_id as string;
  let attendances = db.get('attendances') || [];
  const branches = db.get('branches') || [];
  const users = db.get('users') || [];

  if (branch_id && branch_id !== 'all') {
    attendances = attendances.filter((a: any) => a.branch_id === branch_id);
  }
  if (user_id) {
    attendances = attendances.filter((a: any) => a.user_id === user_id);
  }

  const enriched = attendances.map((a: any) => {
    // Calculate total hours if clocked out
    let total_hours: string | null = null;
    if (a.clock_in && a.clock_out) {
      const diffMs = new Date(a.clock_out).getTime() - new Date(a.clock_in).getTime();
      const diffMinutes = Math.round(diffMs / (1000 * 60));
      if (diffMinutes < 60) {
        total_hours = `${diffMinutes} Menit`;
      } else {
        const hrs = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
        total_hours = `${hrs} Jam`;
      }
    }

    return {
      ...a,
      branch_name: branches.find((b: any) => b.id === a.branch_id)?.name,
      user_name: users.find((u: any) => u.id === a.user_id)?.full_name,
      check_in_time: a.clock_in,
      check_out_time: a.clock_out,
      total_hours,
      status: a.clock_out ? 'selesai' : 'present', // if clocked out 'selesai', if still clocked in 'present' (Hadir)
    };
  });

  res.json(enriched.reverse());
});

// Clock In (Check In)
attendanceRouter.post('/check-in', (req, res) => {
  const { user_id, branch_id, photo_url, latitude, longitude, notes } = req.body;
  
  if (!user_id || !branch_id) {
    return res.status(400).json({ error: 'User ID dan Branch ID wajib diisi' });
  }

  const today = new Date().toISOString().split('T')[0];
  const now = new Date();

  // Check if already checked in today
  const existing = db.get('attendances').find(
    (a: any) => a.user_id === user_id && a.date === today && a.branch_id === branch_id
  );
  if (existing) {
    return res.status(400).json({ error: 'Anda sudah melakukan absen masuk hari ini' });
  }

  // Get branch operating hours
  const branch = db.get('branches').find((b: any) => b.id === branch_id);
  const hours = branch?.operating_hours || '07:00 - 22:00';
  const parts = hours.split('-');
  const openStr = parts[0]?.trim() || '07:00';
  const closeStr = parts[1]?.trim() || '22:00';

  const [openHour, openMin] = openStr.split(':').map(Number);
  const openTimeInMinutes = openHour * 60 + openMin;
  const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

  // Calculate lateness (allow 10 minutes grace period, e.g. open at 07:00, late if after 07:10)
  const isLate = currentTimeInMinutes > (openTimeInMinutes + 10);
  const lateMinutes = isLate ? (currentTimeInMinutes - openTimeInMinutes) : 0;

  const displaySchedule = `Pagi (${openStr} - ${closeStr})`;

  const newAttendance = {
    id: `att-${crypto.randomUUID()}`,
    user_id,
    branch_id,
    date: today,
    clock_in: now.toISOString(),
    clock_out: null,
    shift_schedule: displaySchedule,
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

// Clock Out (Check Out)
attendanceRouter.post('/check-out', (req, res) => {
  const { user_id, branch_id } = req.body;
  if (!user_id || !branch_id) {
    return res.status(400).json({ error: 'User ID dan Branch ID wajib diisi' });
  }

  const today = new Date().toISOString().split('T')[0];
  const now = new Date();

  // Find active check-in record for today
  const att = db.get('attendances').find(
    (a: any) => a.user_id === user_id && a.date === today && a.branch_id === branch_id && !a.clock_out
  );
  if (!att) {
    return res.status(404).json({ error: 'Belum absen masuk atau Anda sudah absen pulang hari ini' });
  }

  // Get branch operating hours for early checkout calculation
  const branch = db.get('branches').find((b: any) => b.id === branch_id);
  const hours = branch?.operating_hours || '07:00 - 22:00';
  const parts = hours.split('-');
  const closeStr = parts[1]?.trim() || '22:00';

  const [closeHour, closeMin] = closeStr.split(':').map(Number);
  const closeTimeInMinutes = closeHour * 60 + closeMin;
  const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

  const isEarlyOut = currentTimeInMinutes < closeTimeInMinutes;
  const earlyOutMinutes = isEarlyOut ? (closeTimeInMinutes - currentTimeInMinutes) : 0;

  att.clock_out = now.toISOString();
  if (isEarlyOut) {
    att.notes = att.notes + ` (Pulang mendahului ${earlyOutMinutes} menit)`;
  } else {
    att.notes = att.notes + ' (Pulang Tepat Waktu)';
  }

  db.update('attendances', (a: any) => a.id === att.id, att);
  res.json(att);
});
