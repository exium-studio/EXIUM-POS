import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePOS } from '../context/POSContext';
import { api } from '../lib/api';
import { Clock, DollarSign, ArrowUpRight, ArrowDownLeft, Lock, Unlock, AlertCircle } from 'lucide-react';

export const ShiftView: React.FC = () => {
  const { activeBranchId, user } = useAuth();
  const { activeShift, refreshShift } = usePOS();
  const [shiftsHistory, setShiftsHistory] = useState<any[]>([]);
  const [openingCash, setOpeningCash] = useState<string>('200000');
  const [closingActualCash, setClosingActualCash] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [movementType, setMovementType] = useState<'cash_in' | 'cash_out'>('cash_in');
  const [movementAmount, setMovementAmount] = useState<string>('');
  const [movementReason, setMovementReason] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const loadHistory = async () => {
    try {
      const data = await api.get('/shifts/history', { branch_id: activeBranchId });
      setShiftsHistory(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [activeBranchId, activeShift]);

  const handleOpenShift = async () => {
    setLoading(true);
    try {
      await api.post('/shifts/open', {
        branch_id: activeBranchId,
        user_id: user?.id,
        user_name: user?.full_name,
        opening_cash: Number(openingCash) || 0,
      });
      await refreshShift();
      await loadHistory();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async () => {
    if (!closingActualCash) {
      alert('Masukkan jumlah uang fisik aktual di laci kas.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/shifts/close', {
        shift_id: activeShift?.id,
        closing_cash_actual: Number(closingActualCash) || 0,
        notes: closingNotes,
      });
      await refreshShift();
      await loadHistory();
      setClosingActualCash('');
      setClosingNotes('');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCashMovement = async () => {
    if (!movementAmount || !movementReason) {
      alert('Mohon isi nominal dan alasan mutasi kas.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/shifts/cash-movement', {
        shift_id: activeShift?.id,
        type: movementType,
        amount: Number(movementAmount),
        reason: movementReason,
        user_name: user?.full_name,
      });
      await refreshShift();
      setMovementAmount('');
      setMovementReason('');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-[#F8FAFC] overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-gray-900 tracking-tight">Manajemen Shift & Laci Kasir (Cash Drawer)</h2>
        <p className="text-xs text-gray-500 font-medium mt-0.5">
          Kontrol modal awal kasir, pencatatan petty cash kas masuk/keluar, dan rekonsiliasi kas saat pergantian shift
        </p>
      </div>

      {/* Active Shift Status Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center space-x-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
                  activeShift ? 'bg-green-600' : 'bg-gray-400'
                }`}
              >
                {activeShift ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">
                  {activeShift ? `Shift Aktif: ${activeShift.user_name}` : 'Laci Kasir Sedang Tutup'}
                </h3>
                <p className="text-[11px] text-gray-500">
                  {activeShift
                    ? `Dibuka pada ${new Date(activeShift.start_time).toLocaleString('id-ID')}`
                    : 'Buka shift untuk mulai menerima transaksi tunai/omni.'}
                </p>
              </div>
            </div>
            {activeShift && (
              <span className="px-3 py-1 bg-green-50 text-green-700 font-black text-xs rounded-full border border-green-200">
                OPEN
              </span>
            )}
          </div>

          {activeShift ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Modal Awal</span>
                  <p className="text-sm font-black text-gray-900 mt-1">
                    Rp {activeShift.opening_cash.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Penjualan Tunai</span>
                  <p className="text-sm font-black text-green-600 mt-1">
                    Rp {activeShift.cash_sales.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Kas Masuk / Keluar</span>
                  <p className="text-sm font-black text-blue-600 mt-1">
                    Rp {(activeShift.total_cash_in - activeShift.total_cash_out).toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <span className="text-[10px] uppercase font-bold text-blue-700">Ekspektasi Uang Kas</span>
                  <p className="text-sm font-black text-blue-900 mt-1">
                    Rp {activeShift.expected_cash.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              {/* Close Shift Form */}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <h4 className="text-xs font-black text-gray-900">Tutup Shift & Hitung Uang Fisik Laci (Blind Drop)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="Hitungan Fisik Uang di Laci (Rp)"
                    value={closingActualCash}
                    onChange={(e) => setClosingActualCash(e.target.value)}
                    className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Catatan penutupan shift"
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={handleCloseShift}
                  disabled={loading}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  Tutup Shift & Cetak Laporan X/Z
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Masukkan Modal Kas Awal Kasir:</label>
                <input
                  type="number"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleOpenShift}
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-xs transition-colors"
              >
                Buka Shift Sekarang
              </button>
            </div>
          )}
        </div>

        {/* Cash In / Out Petty Cash Form */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
            <DollarSign className="w-4 h-4 text-blue-600" />
            <h4 className="font-bold text-gray-900 text-sm">Petty Cash Laci (Kas Masuk/Keluar)</h4>
          </div>

          <div className="space-y-3">
            <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setMovementType('cash_in')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  movementType === 'cash_in' ? 'bg-white text-green-700 shadow-xs' : 'text-gray-500'
                }`}
              >
                + Kas Masuk (In)
              </button>
              <button
                onClick={() => setMovementType('cash_out')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  movementType === 'cash_out' ? 'bg-white text-red-700 shadow-xs' : 'text-gray-500'
                }`}
              >
                - Kas Keluar (Out)
              </button>
            </div>

            <input
              type="number"
              placeholder="Nominal (Rp)"
              value={movementAmount}
              onChange={(e) => setMovementAmount(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-blue-500"
            />

            <input
              type="text"
              placeholder="Alasan (misal: Beli Es Batu Darurat)"
              value={movementReason}
              onChange={(e) => setMovementReason(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-blue-500"
            />

            <button
              onClick={handleCashMovement}
              disabled={loading || !activeShift}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50 transition-colors"
            >
              Simpan Mutasi Kas
            </button>
          </div>
        </div>
      </div>

      {/* Shifts History Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <h4 className="font-bold text-gray-900 text-sm">Riwayat Rekonsiliasi Shift</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-[10px] tracking-wider border-b border-gray-100">
              <tr>
                <th className="py-3 px-4">Kasir</th>
                <th className="py-3 px-4">Mulai Shift</th>
                <th className="py-3 px-4">Selesai Shift</th>
                <th className="py-3 px-4">Modal Awal</th>
                <th className="py-3 px-4">Uang Ekspektasi</th>
                <th className="py-3 px-4">Uang Aktual</th>
                <th className="py-3 px-4">Selisih (Variance)</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {shiftsHistory.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-3 px-4 font-bold text-gray-900">{s.user_name}</td>
                  <td className="py-3 px-4 text-gray-500">{new Date(s.start_time).toLocaleString('id-ID')}</td>
                  <td className="py-3 px-4 text-gray-500">
                    {s.end_time ? new Date(s.end_time).toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="py-3 px-4">Rp {s.opening_cash.toLocaleString('id-ID')}</td>
                  <td className="py-3 px-4 font-bold text-gray-900">Rp {s.expected_cash.toLocaleString('id-ID')}</td>
                  <td className="py-3 px-4 font-bold text-gray-900">
                    {s.closing_cash_actual ? `Rp ${s.closing_cash_actual.toLocaleString('id-ID')}` : '-'}
                  </td>
                  <td className="py-3 px-4">
                    {s.difference === 0 ? (
                      <span className="text-green-600 font-bold">Pas (Rp 0)</span>
                    ) : s.difference < 0 ? (
                      <span className="text-red-600 font-bold">Kurang Rp {Math.abs(s.difference).toLocaleString('id-ID')}</span>
                    ) : (
                      <span className="text-blue-600 font-bold">+Rp {s.difference.toLocaleString('id-ID')}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.status === 'open' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {s.status.toUpperCase()}
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
