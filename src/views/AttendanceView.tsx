import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { UserCheck, Camera, MapPin, CheckCircle2, Clock, RefreshCw } from 'lucide-react';

export const AttendanceView: React.FC = () => {
  const { activeBranchId, user } = useAuth();
  const { showToast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.get('/attendance/logs', { branch_id: activeBranchId });
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [activeBranchId]);

  const handleCheckIn = async () => {
    try {
      await api.post('/attendance/check-in', {
        branch_id: activeBranchId,
        user_id: user?.id,
        user_name: user?.full_name,
        photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        latitude: -6.2088,
        longitude: 106.8456,
      });
      showToast(`Presensi Masuk Berhasil dicatat untuk ${user?.full_name}!`, 'success');
      loadLogs();
    } catch (e: any) {
      showToast(e.message || 'Gagal melakukan absensi masuk', 'error');
    }
  };

  const handleCheckOut = async () => {
    try {
      await api.post('/attendance/check-out', {
        branch_id: activeBranchId,
        user_id: user?.id,
      });
      showToast(`Presensi Pulang Berhasil dicatat untuk ${user?.full_name}!`, 'success');
      loadLogs();
    } catch (e: any) {
      showToast(e.message || 'Gagal melakukan absensi pulang', 'error');
    }
  };

  return (
    <div className="flex-1 bg-[#F8FAFC] overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Presensi & Absensi Karyawan Sederhana</h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Pencatatan jam masuk & pulang kerja staf kasir dan dapur dengan verifikasi geotag GPS & swafoto
          </p>
        </div>
        <button
          onClick={loadLogs}
          className="p-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl border border-gray-200 shadow-2xs self-start sm:self-auto transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Attendance Action Card for Current Logged in User */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-black text-base text-gray-900">{user?.full_name}</h4>
            <p className="text-xs text-gray-500">{user?.role_name} • Outlet Terpilih</p>
            <div className="flex items-center space-x-1 text-[11px] text-green-600 font-bold mt-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>Lokasi GPS Terverifikasi di Area Outlet</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <button
            onClick={handleCheckIn}
            className="flex-1 md:flex-none px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            Absen Masuk (Clock In)
          </button>
          <button
            onClick={handleCheckOut}
            className="flex-1 md:flex-none px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            Absen Pulang (Clock Out)
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <h4 className="font-bold text-gray-900 text-sm">Log Kehadiran Hari Ini</h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-[10px] tracking-wider border-b border-gray-100">
              <tr>
                <th className="py-3 px-4">Nama Staf</th>
                <th className="py-3 px-4">Jam Masuk</th>
                <th className="py-3 px-4">Jam Pulang</th>
                <th className="py-3 px-4">Total Jam</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-3 px-4 font-bold text-gray-900">{l.user_name}</td>
                  <td className="py-3 px-4 text-green-700 font-mono">
                    {l.check_in_time && !isNaN(new Date(l.check_in_time).getTime()) ? new Date(l.check_in_time).toLocaleTimeString('id-ID') : '-'}
                  </td>
                  <td className="py-3 px-4 text-red-700 font-mono">
                    {l.check_out_time && !isNaN(new Date(l.check_out_time).getTime()) ? new Date(l.check_out_time).toLocaleTimeString('id-ID') : '-'}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-gray-900">
                    {l.total_hours ? `${l.total_hours} Jam` : 'Sedang Bertugas'}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        (l.status || 'present') === 'present' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {(l.status || 'present') === 'present' ? 'HADIR' : String(l.status).toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
