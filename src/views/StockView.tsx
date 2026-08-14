import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Package, ArrowRightLeft, ClipboardCheck, AlertTriangle, RefreshCw, Plus } from 'lucide-react';

export const StockView: React.FC = () => {
  const { activeBranchId, branches } = useAuth();
  const [stockList, setStockList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventory' | 'transfer' | 'opname'>('inventory');

  // Transfer Form State
  const [transferTargetBranch, setTransferTargetBranch] = useState<string>('');
  const [transferItemId, setTransferItemId] = useState<string>('');
  const [transferQty, setTransferQty] = useState<string>('');
  const [transferNotes, setTransferNotes] = useState<string>('');

  // Opname Form State
  const [opnameItemId, setOpnameItemId] = useState<string>('');
  const [opnamePhysicalQty, setOpnamePhysicalQty] = useState<string>('');
  const [opnameNotes, setOpnameNotes] = useState<string>('');

  const loadStock = async () => {
    setLoading(true);
    try {
      const data = await api.get('/stock/ingredients', { branch_id: activeBranchId });
      setStockList(data);
      if (data.length > 0) {
        setTransferItemId(data[0].id);
        setOpnameItemId(data[0].id);
      }
      const otherBranches = branches.filter((b) => b.id !== activeBranchId);
      if (otherBranches.length > 0) {
        setTransferTargetBranch(otherBranches[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, [activeBranchId]);

  const handleTransfer = async () => {
    if (!transferQty || Number(transferQty) <= 0) {
      alert('Masukkan jumlah transfer yang valid.');
      return;
    }
    try {
      await api.post('/stock/transfer', {
        from_branch_id: activeBranchId,
        to_branch_id: transferTargetBranch,
        item_id: transferItemId,
        quantity: Number(transferQty),
        notes: transferNotes,
      });
      alert('Transfer stok berhasil diproses!');
      setTransferQty('');
      setTransferNotes('');
      loadStock();
    } catch (e: any) {
      alert('Gagal transfer: ' + e.message);
    }
  };

  const handleOpname = async () => {
    if (opnamePhysicalQty === '') {
      alert('Masukkan hasil hitungan fisik.');
      return;
    }
    try {
      await api.post('/stock/opname', {
        branch_id: activeBranchId,
        item_id: opnameItemId,
        physical_qty: Number(opnamePhysicalQty),
        notes: opnameNotes,
      });
      alert('Stock Opname berhasil disimpan dan penyesuaian dicatat di jurnal!');
      setOpnamePhysicalQty('');
      setOpnameNotes('');
      loadStock();
    } catch (e: any) {
      alert('Gagal simpan opname: ' + e.message);
    }
  };

  return (
    <div className="flex-1 bg-[#F8FAFC] overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Manajemen Bahan Baku & Stok Multi-Cabang</h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Monitoring sisa stok bahan baku, transfer antar cabang, dan pencatatan stock opname berkala
          </p>
        </div>
        <button
          onClick={loadStock}
          className="p-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl border border-gray-200 shadow-2xs self-start sm:self-auto transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex bg-gray-100 p-1 rounded-xl max-w-md text-xs font-bold">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex-1 py-2 rounded-lg transition-all ${
            activeTab === 'inventory' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500'
          }`}
        >
          Stok Bahan Baku
        </button>
        <button
          onClick={() => setActiveTab('transfer')}
          className={`flex-1 py-2 rounded-lg transition-all ${
            activeTab === 'transfer' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-500'
          }`}
        >
          Transfer Antar Cabang
        </button>
        <button
          onClick={() => setActiveTab('opname')}
          className={`flex-1 py-2 rounded-lg transition-all ${
            activeTab === 'opname' ? 'bg-white text-green-700 shadow-xs' : 'text-gray-500'
          }`}
        >
          Stock Opname
        </button>
      </div>

      {activeTab === 'inventory' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h4 className="font-bold text-gray-900 text-sm">Inventaris Bahan Baku Cabang</h4>
            <span className="text-xs text-gray-400 font-bold">{stockList.length} Bahan Terdaftar</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-[10px] tracking-wider border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">Nama Bahan</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Sisa Stok</th>
                  <th className="py-3 px-4">Batas Minimum</th>
                  <th className="py-3 px-4">Biaya Satuan</th>
                  <th className="py-3 px-4">Total Nilai Stok</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {stockList.map((item) => {
                  const isLow = item.current_stock <= item.min_stock;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-gray-900">{item.name}</td>
                      <td className="py-3 px-4 text-gray-500">{item.category}</td>
                      <td className="py-3 px-4 font-mono font-black text-sm text-gray-900">
                        {item.current_stock} {item.unit}
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-400">
                        {item.min_stock} {item.unit}
                      </td>
                      <td className="py-3 px-4">Rp {item.cost_per_unit?.toLocaleString('id-ID')} / {item.unit}</td>
                      <td className="py-3 px-4 font-black text-gray-900">
                        Rp {(item.current_stock * item.cost_per_unit).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4">
                        {isLow ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                            Stok Kritis
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700">
                            Aman
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'transfer' && (
        <div className="max-w-2xl bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
            <ArrowRightLeft className="w-5 h-5 text-blue-600" />
            <h4 className="font-bold text-gray-900 text-sm">Formulir Mutasi / Transfer Bahan Antar Cabang</h4>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Tujuan Cabang Penerima:</label>
              <select
                value={transferTargetBranch}
                onChange={(e) => setTransferTargetBranch(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none"
              >
                {branches
                  .filter((b) => b.id !== activeBranchId)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.address})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Pilih Bahan Baku:</label>
              <select
                value={transferItemId}
                onChange={(e) => setTransferItemId(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none"
              >
                {stockList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Sisa: {s.current_stock} {s.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Jumlah Transfer:</label>
              <input
                type="number"
                placeholder="Jumlah (Qty)"
                value={transferQty}
                onChange={(e) => setTransferQty(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Catatan / Alasan Transfer:</label>
              <input
                type="text"
                placeholder="misal: Back-up persediaan akhir pekan"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              onClick={handleTransfer}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              Kirim Mutasi Stok
            </button>
          </div>
        </div>
      )}

      {activeTab === 'opname' && (
        <div className="max-w-2xl bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
            <ClipboardCheck className="w-5 h-5 text-green-600" />
            <h4 className="font-bold text-gray-900 text-sm">Formulir Stock Opname Fisik</h4>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Pilih Bahan Baku yang Dihitung:</label>
              <select
                value={opnameItemId}
                onChange={(e) => setOpnameItemId(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none"
              >
                {stockList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Stok Sistem: {s.current_stock} {s.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Hasil Hitungan Fisik Riil:</label>
              <input
                type="number"
                placeholder="Jumlah Aktual Fisik di Gudang"
                value={opnamePhysicalQty}
                onChange={(e) => setOpnamePhysicalQty(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Keterangan / Alasan Selisih:</label>
              <input
                type="text"
                placeholder="misal: Tumpah saat pembuatan / penyusutan natural"
                value={opnameNotes}
                onChange={(e) => setOpnameNotes(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-green-500"
              />
            </div>

            <button
              onClick={handleOpname}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              Simpan Penyesuaian Opname
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
