import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { 
  Package, 
  ArrowRightLeft, 
  ClipboardCheck, 
  AlertTriangle, 
  RefreshCw, 
  Plus, 
  Edit2, 
  Trash2, 
  ArrowRight, 
  CheckCircle2, 
  Eye,
  FileText
} from 'lucide-react';

export const StockView: React.FC = () => {
  const { activeBranchId, branches, user } = useAuth();
  const { showToast } = useToast();
  const [stockList, setStockList] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [opnames, setOpnames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventory' | 'transfer' | 'opname'>('inventory');

  // Modals
  const [showIngModal, setShowIngModal] = useState(false);
  const [showEditIngModal, setShowEditIngModal] = useState(false);
  
  // Ingredient Form State (Create)
  const [ingCode, setIngCode] = useState('');
  const [ingName, setIngName] = useState('');
  const [ingCategory, setIngCategory] = useState('Bahan Makanan');
  const [ingUnit, setIngUnit] = useState('gram');
  const [ingCost, setIngCost] = useState('0');
  const [ingMinAlert, setIngMinAlert] = useState('100');
  const [ingInitialStock, setIngInitialStock] = useState('0');

  // Ingredient Form State (Edit)
  const [editIngId, setEditIngId] = useState('');
  const [editIngCode, setEditIngCode] = useState('');
  const [editIngName, setEditIngName] = useState('');
  const [editIngCategory, setEditIngCategory] = useState('Bahan Makanan');
  const [editIngUnit, setEditIngUnit] = useState('gram');
  const [editIngCost, setEditIngCost] = useState('0');
  const [editIngMinAlert, setEditIngMinAlert] = useState('100');

  // Transfer Form State
  const [transferTargetBranch, setTransferTargetBranch] = useState<string>('');
  const [transferItemId, setTransferItemId] = useState<string>('');
  const [transferQty, setTransferQty] = useState<string>('');
  const [transferNotes, setTransferNotes] = useState<string>('');

  // Opname Form State
  const [opnameItemId, setOpnameItemId] = useState<string>('');
  const [opnamePhysicalQty, setOpnamePhysicalQty] = useState<string>('');
  const [opnameNotes, setOpnameNotes] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [stocks, trfs, ops] = await Promise.all([
        api.get('/stock/ingredients', { branch_id: activeBranchId }),
        api.get('/stock/transfers').catch(() => []),
        api.get('/stock/opnames', { branch_id: activeBranchId }).catch(() => []),
      ]);

      setStockList(stocks);
      setTransfers(trfs);
      setOpnames(ops);

      if (stocks.length > 0) {
        setTransferItemId(stocks[0].id);
        setOpnameItemId(stocks[0].id);
      }
      
      const otherBranches = branches.filter((b) => b.id !== activeBranchId);
      if (otherBranches.length > 0) {
        setTransferTargetBranch(otherBranches[0].id);
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat data inventaris stok', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBranchId]);

  // Create Ingredient
  const handleCreateIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingName.trim()) {
      showToast('Nama bahan baku wajib diisi', 'error');
      return;
    }
    try {
      await api.post('/stock/ingredients', {
        code: ingCode.trim() || undefined,
        name: ingName.trim(),
        category: ingCategory,
        base_unit: ingUnit,
        cost_per_unit: Number(ingCost),
        min_stock_alert: Number(ingMinAlert),
        initial_stock: Number(ingInitialStock),
      });
      showToast('Bahan baku baru berhasil ditambahkan!', 'success');
      setShowIngModal(false);
      // Reset form
      setIngCode('');
      setIngName('');
      setIngCategory('Bahan Makanan');
      setIngUnit('gram');
      setIngCost('0');
      setIngMinAlert('100');
      setIngInitialStock('0');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Gagal menambahkan bahan baku', 'error');
    }
  };

  // Open Edit Modal
  const openEditIng = (ing: any) => {
    setEditIngId(ing.id);
    setEditIngCode(ing.code || '');
    setEditIngName(ing.name || '');
    setEditIngCategory(ing.category || 'Bahan Makanan');
    setEditIngUnit(ing.base_unit || 'gram');
    setEditIngCost(String(ing.cost_per_unit || 0));
    setEditIngMinAlert(String(ing.min_stock_alert || 100));
    setShowEditIngModal(true);
  };

  // Edit Ingredient Submit
  const handleEditIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editIngName.trim()) {
      showToast('Nama bahan baku wajib diisi', 'error');
      return;
    }
    try {
      await api.put(`/stock/ingredients/${editIngId}`, {
        name: editIngName.trim(),
        category: editIngCategory,
        base_unit: editIngUnit,
        cost_per_unit: Number(editIngCost),
        min_stock_alert: Number(editIngMinAlert),
      });
      showToast('Data bahan baku berhasil diperbarui!', 'success');
      setShowEditIngModal(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui bahan baku', 'error');
    }
  };

  // Soft Delete Ingredient
  const handleDeleteIngredient = async (ing: any) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus bahan baku "${ing.name}"? Ini akan menghapusnya dari inventaris (soft delete).`)) return;
    try {
      await api.delete(`/stock/ingredients/${ing.id}`);
      showToast(`Bahan baku "${ing.name}" berhasil dihapus.`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus bahan baku', 'error');
    }
  };

  // Submit Inter-Branch Transfer
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferQty || Number(transferQty) <= 0) {
      showToast('Masukkan jumlah transfer yang valid.', 'error');
      return;
    }
    const ing = stockList.find((s) => s.id === transferItemId);
    if (!ing) return;
    if (ing.current_stock < Number(transferQty)) {
      showToast('Stok tidak mencukupi untuk melakukan transfer ini.', 'error');
      return;
    }

    try {
      await api.post('/stock/transfers', {
        from_branch_id: activeBranchId,
        to_branch_id: transferTargetBranch,
        notes: transferNotes,
        user_id: user?.id,
        items: [
          {
            item_id: transferItemId,
            item_type: 'ingredient',
            item_name: ing.name,
            quantity: Number(transferQty),
            unit: ing.base_unit,
          }
        ]
      });
      showToast('Mutasi transfer stok berhasil dikirim (in-transit)!', 'success');
      setTransferQty('');
      setTransferNotes('');
      loadData();
    } catch (e: any) {
      showToast('Gagal transfer: ' + e.message, 'error');
    }
  };

  // Receive Transfer
  const handleReceiveTransfer = async (trfId: string) => {
    try {
      await api.post(`/stock/transfers/${trfId}/receive`, { user_id: user?.id });
      showToast('Transfer stok berhasil diterima dan stok cabang tujuan bertambah!', 'success');
      loadData();
    } catch (e: any) {
      showToast('Gagal menerima transfer: ' + e.message, 'error');
    }
  };

  // Submit Stock Opname
  const handleOpname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (opnamePhysicalQty === '') {
      showToast('Masukkan hasil hitungan fisik riil.', 'error');
      return;
    }
    const ing = stockList.find((s) => s.id === opnameItemId);
    if (!ing) return;
    const diff = Number(opnamePhysicalQty) - ing.current_stock;

    try {
      await api.post('/stock/opnames', {
        branch_id: activeBranchId,
        notes: opnameNotes,
        user_id: user?.id,
        auto_approve: true,
        items: [
          {
            item_id: opnameItemId,
            item_type: 'ingredient',
            item_name: ing.name,
            current_stock: ing.current_stock,
            physical_stock: Number(opnamePhysicalQty),
            difference: diff,
            unit: ing.base_unit,
            unit_cost: ing.cost_per_unit || 0,
            notes: opnameNotes
          }
        ]
      });
      showToast('Stock Opname berhasil disimpan dan stok disesuaikan otomatis!', 'success');
      setOpnamePhysicalQty('');
      setOpnameNotes('');
      loadData();
    } catch (e: any) {
      showToast('Gagal menyimpan opname: ' + e.message, 'error');
    }
  };

  return (
    <div className="flex-grow bg-[#F8FAFC] overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Manajemen Bahan Baku & Stok Multi-Cabang</h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Monitoring sisa stok bahan baku, transfer mutasi antar cabang, dan pencatatan penyesuaian stock opname fisik
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'inventory' && (
            <button
              onClick={() => setShowIngModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambah Bahan Baku
            </button>
          )}
          <button
            onClick={loadData}
            className="p-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl border border-gray-200 shadow-2xs transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 self-start max-w-md">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex-grow py-1.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'inventory' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Stok Bahan Baku
        </button>
        <button
          onClick={() => setActiveTab('transfer')}
          className={`flex-grow py-1.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'transfer' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Transfer Antar Cabang
        </button>
        <button
          onClick={() => setActiveTab('opname')}
          className={`flex-grow py-1.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'opname' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Stock Opname
        </button>
      </div>

      {/* ==================== TAB: INVENTARIS BAHAN BAKU (CRUD) ==================== */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
              <Package className="w-5 h-5 text-blue-600" />
              <span>Inventaris Bahan Baku Cabang</span>
            </h4>
            <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full font-black">
              {stockList.length} Bahan Baku Terdaftar
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-[10px] tracking-wider border-b border-gray-100">
                <tr>
                  <th className="py-3.5 px-5">Kode</th>
                  <th className="py-3.5 px-5">Nama Bahan</th>
                  <th className="py-3.5 px-5">Kategori</th>
                  <th className="py-3.5 px-5">Sisa Stok</th>
                  <th className="py-3.5 px-5">Batas Minimum</th>
                  <th className="py-3.5 px-5">Biaya Satuan</th>
                  <th className="py-3.5 px-5">Nilai Aset</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                {stockList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-400">
                      Belum ada data bahan baku terdaftar di cabang ini.
                    </td>
                  </tr>
                ) : (
                  stockList.map((item) => {
                    const isLow = item.current_stock <= (item.min_stock_alert || 100);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3.5 px-5 font-mono text-gray-500 font-bold">{item.code}</td>
                        <td className="py-3.5 px-5 font-bold text-gray-900">{item.name}</td>
                        <td className="py-3.5 px-5 text-gray-500">{item.category}</td>
                        <td className="py-3.5 px-5 font-mono font-black text-sm text-gray-900">
                          {item.current_stock?.toLocaleString('id-ID')} {item.base_unit}
                        </td>
                        <td className="py-3.5 px-5 font-mono text-gray-400">
                          {item.min_stock_alert?.toLocaleString('id-ID')} {item.base_unit}
                        </td>
                        <td className="py-3.5 px-5">Rp {item.cost_per_unit?.toLocaleString('id-ID')} / {item.base_unit}</td>
                        <td className="py-3.5 px-5 font-black text-gray-900">
                          Rp {((item.current_stock || 0) * (item.cost_per_unit || 0)).toLocaleString('id-ID')}
                        </td>
                        <td className="py-3.5 px-5">
                          {isLow ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-red-50 text-red-700 border border-red-200 animate-pulse">
                              Stok Tipis
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-green-50 text-green-700">
                              Aman
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditIng(item)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Bahan"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteIngredient(item)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Bahan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== TAB: TRANSFER ANTAR CABANG ==================== */}
      {activeTab === 'transfer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Kirim Transfer - Kiri (1 Column) */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4 h-fit">
            <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
              <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
              <h4 className="font-bold text-gray-900 text-sm">Transfer Bahan Baku</h4>
            </div>

            <form onSubmit={handleTransfer} className="space-y-3.5 text-xs font-semibold text-gray-700">
              <div>
                <label className="block text-[10px] uppercase text-gray-400 mb-1">Tujuan Cabang Penerima:</label>
                <select
                  required
                  value={transferTargetBranch}
                  onChange={(e) => setTransferTargetBranch(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none cursor-pointer"
                >
                  {branches
                    .filter((b) => b.id !== activeBranchId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-gray-400 mb-1">Bahan Baku:</label>
                <select
                  required
                  value={transferItemId}
                  onChange={(e) => setTransferItemId(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none cursor-pointer"
                >
                  {stockList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Stok: {s.current_stock} {s.base_unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-gray-400 mb-1">Jumlah Transfer:</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="any"
                  placeholder="0.00"
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-gray-400 mb-1">Catatan Keterangan:</label>
                <input
                  type="text"
                  placeholder="contoh: Kiriman darurat untuk stok kosong"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
              >
                Kirim Mutasi Stok
              </button>
            </form>
          </div>

          {/* List Table Riwayat Transfer - Kanan (2 Columns) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <h4 className="font-bold text-gray-900 text-sm">Riwayat Transfer Antar Cabang</h4>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-[10px] tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="py-3 px-4">No. Mutasi</th>
                      <th className="py-3 px-4">Dari & Ke Cabang</th>
                      <th className="py-3 px-4">Item Mutasi</th>
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                    {transfers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400">
                          Belum ada riwayat transfer mutasi terekam.
                        </td>
                      </tr>
                    ) : (
                      transfers.map((trf) => (
                        <tr key={trf.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono text-indigo-600 font-bold">{trf.transfer_number}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="text-gray-900 font-black">{trf.from_branch_name}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-gray-950 font-black">{trf.to_branch_name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {trf.items?.map((it: any, idx: number) => (
                              <div key={idx} className="text-slate-700">
                                {it.item_name} <span className="font-mono text-gray-500 font-bold">({it.quantity} {it.unit})</span>
                              </div>
                            ))}
                          </td>
                          <td className="py-3 px-4 text-gray-400">
                            {new Date(trf.created_at).toLocaleDateString('id-ID')}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border ${
                                trf.status === 'received'
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                              }`}
                            >
                              {trf.status === 'received' ? 'DITERIMA' : 'DIJALAN'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {trf.status === 'in_transit' && trf.to_branch_id === activeBranchId && (
                              <button
                                onClick={() => handleReceiveTransfer(trf.id)}
                                className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] font-bold shadow-2xs transition-colors cursor-pointer"
                              >
                                Terima Barang
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB: STOCK OPNAME ==================== */}
      {activeTab === 'opname' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Opname Baru - Kiri (1 Column) */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4 h-fit">
            <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
              <ClipboardCheck className="w-5 h-5 text-emerald-600" />
              <h4 className="font-bold text-gray-900 text-sm">Pencatatan Opname</h4>
            </div>

            <form onSubmit={handleOpname} className="space-y-3.5 text-xs font-semibold text-gray-700">
              <div>
                <label className="block text-[10px] uppercase text-gray-400 mb-1">Bahan Baku Dihitung:</label>
                <select
                  required
                  value={opnameItemId}
                  onChange={(e) => setOpnameItemId(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none cursor-pointer"
                >
                  {stockList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Sistem: {s.current_stock} {s.base_unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-gray-400 mb-1">Hasil Fisik Riil:</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  placeholder="Masukkan jumlah aktual fisik..."
                  value={opnamePhysicalQty}
                  onChange={(e) => setOpnamePhysicalQty(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-gray-400 mb-1">Alasan / Catatan Selisih:</label>
                <input
                  type="text"
                  placeholder="contoh: Penyusutan / tumpah saat operasional"
                  value={opnameNotes}
                  onChange={(e) => setOpnameNotes(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
              >
                Simpan Penyesuaian Opname
              </button>
            </form>
          </div>

          {/* List Riwayat Opname - Kanan (2 Columns) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <h4 className="font-bold text-gray-900 text-sm">Riwayat Stock Opname Jurnal</h4>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-[10px] tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="py-3 px-4">No. Jurnal</th>
                      <th className="py-3 px-4">Petugas</th>
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Item Opname & Perbedaan</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                    {opnames.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">
                          Belum ada riwayat stock opname terekam.
                        </td>
                      </tr>
                    ) : (
                      opnames.map((op) => (
                        <tr key={op.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono text-emerald-600 font-bold">{op.opname_number}</td>
                          <td className="py-3 px-4 font-bold text-gray-900">{op.counted_by_name || 'Petugas Gudang'}</td>
                          <td className="py-3 px-4 text-gray-400">
                            {new Date(op.created_at).toLocaleDateString('id-ID')}
                          </td>
                          <td className="py-3 px-4">
                            {op.items?.map((it: any, idx: number) => {
                              const isNegative = it.difference < 0;
                              return (
                                <div key={idx} className="space-y-0.5">
                                  <div className="text-slate-900 font-bold">{it.item_name}</div>
                                  <div className="text-[10px] text-gray-500 font-medium">
                                    Sistem: {it.current_stock} {it.unit} | Fisik: {it.physical_stock} {it.unit}
                                  </div>
                                  <span className={`inline-block text-[9px] font-black px-1.5 py-0.5 rounded-sm mt-0.5 ${
                                    isNegative ? 'bg-red-50 text-red-600' : it.difference > 0 ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-500'
                                  }`}>
                                    Selisih: {it.difference > 0 ? `+${it.difference}` : it.difference} {it.unit}
                                  </span>
                                </div>
                              );
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-green-50 text-green-700 border border-green-200">
                              DISETUJUI
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: TAMBAH BAHAN BAKU BARU ==================== */}
      {showIngModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/50">
              <h5 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                <Package className="w-5 h-5 text-blue-600" />
                <span>Tambah Bahan Baku Baru</span>
              </h5>
              <button onClick={() => setShowIngModal(false)} className="text-slate-400 hover:text-slate-900 font-bold text-sm cursor-pointer">✕</button>
            </div>
            
            <form onSubmit={handleCreateIngredient} className="p-6 space-y-4 text-xs font-semibold text-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-1">Kode Bahan Baku (Opsional):</label>
                  <input
                    type="text"
                    value={ingCode}
                    onChange={(e) => setIngCode(e.target.value)}
                    placeholder="Auto-generated..."
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-mono text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Kategori:</label>
                  <select
                    value={ingCategory}
                    onChange={(e) => setIngCategory(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none cursor-pointer"
                  >
                    <option value="Bahan Makanan">Bahan Makanan</option>
                    <option value="Bahan Minuman">Bahan Minuman</option>
                    <option value="Packaging & Cup">Packaging & Cup</option>
                    <option value="Lain-lain">Lain-lain</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-1">Nama Bahan Baku (Wajib):</label>
                <input
                  type="text"
                  required
                  value={ingName}
                  onChange={(e) => setIngName(e.target.value)}
                  placeholder="Contoh: Kopi Bubuk Arabica"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-1">Satuan Dasar (Unit):</label>
                  <select
                    value={ingUnit}
                    onChange={(e) => setIngUnit(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none cursor-pointer"
                  >
                    <option value="gram">gram (g)</option>
                    <option value="ml">ml (miliLiter)</option>
                    <option value="pcs">pcs (pieces)</option>
                    <option value="kg">kg (kiloGram)</option>
                    <option value="liter">liter (l)</option>
                    <option value="box">box</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Batas Minimum Alert:</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={ingMinAlert}
                    onChange={(e) => setIngMinAlert(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-1">Biaya Estimasi per Unit:</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={ingCost}
                    onChange={(e) => setIngCost(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Stok Awal Cabang:</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={ingInitialStock}
                    onChange={(e) => setIngInitialStock(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowIngModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  Simpan Bahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: EDIT BAHAN BAKU ==================== */}
      {showEditIngModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/50">
              <h5 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                <Edit2 className="w-5 h-5 text-blue-600" />
                <span>Edit Informasi Bahan Baku</span>
              </h5>
              <button onClick={() => setShowEditIngModal(false)} className="text-slate-400 hover:text-slate-900 font-bold text-sm cursor-pointer">✕</button>
            </div>
            
            <form onSubmit={handleEditIngredient} className="p-6 space-y-4 text-xs font-semibold text-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-1">Kode Bahan:</label>
                  <input
                    type="text"
                    disabled
                    value={editIngCode}
                    className="w-full p-2.5 bg-slate-50 border border-gray-200 rounded-xl font-mono text-gray-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Kategori:</label>
                  <select
                    value={editIngCategory}
                    onChange={(e) => setEditIngCategory(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none cursor-pointer"
                  >
                    <option value="Bahan Makanan">Bahan Makanan</option>
                    <option value="Bahan Minuman">Bahan Minuman</option>
                    <option value="Packaging & Cup">Packaging & Cup</option>
                    <option value="Lain-lain">Lain-lain</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-1">Nama Bahan Baku (Wajib):</label>
                <input
                  type="text"
                  required
                  value={editIngName}
                  onChange={(e) => setEditIngName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-1">Satuan Dasar (Unit):</label>
                  <select
                    value={editIngUnit}
                    onChange={(e) => setEditIngUnit(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none cursor-pointer"
                  >
                    <option value="gram">gram (g)</option>
                    <option value="ml">ml (miliLiter)</option>
                    <option value="pcs">pcs (pieces)</option>
                    <option value="kg">kg (kiloGram)</option>
                    <option value="liter">liter (l)</option>
                    <option value="box">box</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Batas Minimum Alert:</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editIngMinAlert}
                    onChange={(e) => setEditIngMinAlert(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-1">Biaya Estimasi per Unit:</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={editIngCost}
                  onChange={(e) => setEditIngCost(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditIngModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
