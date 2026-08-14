import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Percent,
  AlertTriangle,
  Building2,
  Download,
  RefreshCw,
  Award,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { activeBranchId } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/dashboard');
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [activeBranchId]);

  const handleExportCSV = () => {
    window.location.href = '/api/reports/export/sales-csv';
  };

  if (loading || !data) {
    return (
      <div className="flex-1 bg-[#F8FAFC] flex items-center justify-center p-8">
        <div className="flex items-center space-x-3 text-gray-500 font-bold text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          <span>Memuat data Executive Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#F8FAFC] overflow-y-auto p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Executive Multi-Branch Dashboard</h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Konsolidasi performa penjualan, margin laba kotor, dan alert stok multi-outlet
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchDashboard}
            className="p-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl border border-gray-200 shadow-2xs transition-colors"
            title="Muat ulang data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Omset (Gross)</p>
            <h3 className="text-xl font-black text-gray-900 mt-1">
              Rp {data.total_revenue?.toLocaleString('id-ID')}
            </h3>
            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full inline-block mt-2">
              +14.8% vs minggu lalu
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Laba Kotor (Gross Profit)</p>
            <h3 className="text-xl font-black text-gray-900 mt-1">
              Rp {data.gross_profit?.toLocaleString('id-ID')}
            </h3>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-2">
              Margin {data.gross_margin_pct}%
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center text-green-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">HPP / COGS Terhitung</p>
            <h3 className="text-xl font-black text-gray-900 mt-1">
              Rp {data.total_cogs?.toLocaleString('id-ID')}
            </h3>
            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full inline-block mt-2">
              Berdasarkan Resep/BOM
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Percent className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Transaksi</p>
            <h3 className="text-xl font-black text-gray-900 mt-1">{data.total_orders} Tiket</h3>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-2">
              Omni Kasir & QR
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Branch Performance Comparison */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h4 className="font-bold text-gray-900 text-sm">Perbandingan Kinerja Antar Cabang</h4>
          </div>
          <span className="text-[11px] font-bold text-gray-500">Live Breakdown</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-[10px] tracking-wider border-b border-gray-100">
              <tr>
                <th className="py-3 px-4">Nama Outlet</th>
                <th className="py-3 px-4">Jumlah Order</th>
                <th className="py-3 px-4">Total Omset</th>
                <th className="py-3 px-4">HPP (COGS)</th>
                <th className="py-3 px-4">Laba Kotor</th>
                <th className="py-3 px-4">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {data.branch_performance?.map((b: any) => (
                <tr key={b.branch_id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-3 px-4 font-bold text-gray-900">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      <span>{b.branch_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">{b.orders_count} pesanan</td>
                  <td className="py-3 px-4 font-black text-gray-900">Rp {b.revenue.toLocaleString('id-ID')}</td>
                  <td className="py-3 px-4 text-gray-500">Rp {b.cogs.toLocaleString('id-ID')}</td>
                  <td className="py-3 px-4 font-bold text-green-600">Rp {b.gross_profit.toLocaleString('id-ID')}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px]">
                      {b.margin_pct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two columns: Top Products & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-amber-500" />
              <h4 className="font-bold text-gray-900 text-sm">Produk Terlaris (Best Sellers)</h4>
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Top 6</span>
          </div>

          <div className="space-y-2.5">
            {data.top_products?.map((p: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-2.5 bg-gray-50/70 rounded-xl border border-gray-100">
                <div className="flex items-center space-x-3">
                  <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-xs text-gray-800">{p.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-gray-900">{p.qty} porsi</span>
                  <span className="block text-[10px] text-gray-500">Rp {p.revenue.toLocaleString('id-ID')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h4 className="font-bold text-gray-900 text-sm">Peringatan Stok Rendah (Multi-Cabang)</h4>
            </div>
            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              {data.low_stock_items?.length || 0} Item
            </span>
          </div>

          <div className="space-y-2.5">
            {data.low_stock_items?.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">Semua stok bahan baku berada pada level aman.</p>
            ) : (
              data.low_stock_items?.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-red-50/50 rounded-xl border border-red-200/60">
                  <div>
                    <span className="font-bold text-xs text-gray-900">{item.item_name}</span>
                    <span className="block text-[10px] text-gray-500 font-medium">{item.branch_name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-red-600 font-mono">
                      {item.current_stock} {item.unit}
                    </span>
                    <span className="block text-[10px] text-gray-400 font-medium">Min: {item.min_stock} {item.unit}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
