import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Calculator, TrendingUp, DollarSign, FileSpreadsheet, RefreshCw } from 'lucide-react';

export const AccountingView: React.FC = () => {
  const { activeBranchId } = useAuth();
  const [plData, setPlData] = useState<any>(null);
  const [journal, setJournal] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pl' | 'journal'>('pl');

  const loadData = async () => {
    setLoading(true);
    try {
      const [pl, jr] = await Promise.all([
        api.get('/accounting/pl', { branch_id: activeBranchId }),
        api.get('/accounting/journal', { branch_id: activeBranchId }),
      ]);
      setPlData(pl);
      setJournal(jr);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBranchId]);

  return (
    <div className="flex-1 bg-[#F8FAFC] overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Akuntansi & Laporan Keuangan</h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Laporan Laba/Rugi (Profit & Loss), Jurnal Umum otomatis double-entry, dan rekonsiliasi pajak restoran PB1
          </p>
        </div>
        <button
          onClick={loadData}
          className="p-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl border border-gray-200 shadow-2xs self-start sm:self-auto transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-xl max-w-xs text-xs font-bold">
        <button
          onClick={() => setTab('pl')}
          className={`flex-1 py-2 rounded-lg transition-all ${
            tab === 'pl' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500'
          }`}
        >
          Laba Rugi (P&L)
        </button>
        <button
          onClick={() => setTab('journal')}
          className={`flex-1 py-2 rounded-lg transition-all ${
            tab === 'journal' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-500'
          }`}
        >
          Jurnal Umum
        </button>
      </div>

      {tab === 'pl' && plData && (
        <div className="max-w-3xl bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h4 className="font-black text-gray-900 text-sm">Laporan Laba Rugi (Income Statement)</h4>
            <span className="text-[11px] text-gray-400 font-mono">Bulan Berjalan</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Revenue */}
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="font-bold text-gray-700">Pendapatan Penjualan Bersih (Revenue)</span>
              <span className="font-black text-gray-900">Rp {plData.revenue?.toLocaleString('id-ID')}</span>
            </div>

            {/* COGS */}
            <div className="flex justify-between py-2 border-b border-gray-100 text-red-600">
              <span className="font-semibold">Beban Pokok Penjualan (HPP / COGS Resep)</span>
              <span className="font-bold">(Rp {plData.cogs?.toLocaleString('id-ID')})</span>
            </div>

            {/* Gross Profit */}
            <div className="flex justify-between py-2.5 bg-blue-50/70 px-3 rounded-xl">
              <span className="font-black text-blue-900">LABA KOTOR (GROSS PROFIT)</span>
              <span className="font-black text-blue-900 text-sm">
                Rp {plData.gross_profit?.toLocaleString('id-ID')}
              </span>
            </div>

            {/* Operating Expenses */}
            <div className="pt-2 space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Beban Operasional (OPEX):</p>
              {plData.expenses?.map((exp: any, idx: number) => (
                <div key={idx} className="flex justify-between pl-3 text-gray-600">
                  <span>• {exp.category}</span>
                  <span>Rp {exp.amount?.toLocaleString('id-ID')}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-gray-800 pt-1 border-t border-gray-100">
                <span>Total Beban Operasional</span>
                <span>Rp {plData.total_expenses?.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Net Profit */}
            <div className="flex justify-between py-3 bg-green-50 px-3 rounded-xl border border-green-200 mt-4">
              <span className="font-black text-green-900">LABA BERSIH (NET PROFIT)</span>
              <span className="font-black text-green-900 text-base">
                Rp {plData.net_profit?.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
      )}

      {tab === 'journal' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h4 className="font-bold text-gray-900 text-sm">Buku Jurnal Umum Otomatis</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-[10px] tracking-wider border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Keterangan</th>
                  <th className="py-3 px-4">Akun Debit</th>
                  <th className="py-3 px-4">Akun Kredit</th>
                  <th className="py-3 px-4 text-right">Nominal (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {journal.map((j) => (
                  <tr key={j.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-4 text-gray-500">{new Date(j.created_at).toLocaleDateString('id-ID')}</td>
                    <td className="py-3 px-4 font-bold text-gray-900">{j.description}</td>
                    <td className="py-3 px-4 text-green-700 font-mono">{j.debit_account}</td>
                    <td className="py-3 px-4 text-blue-700 font-mono">{j.credit_account}</td>
                    <td className="py-3 px-4 font-black text-gray-900 text-right">
                      Rp {j.amount?.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
