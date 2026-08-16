import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { ShoppingCart, Plus, CheckCircle2, Clock, Truck, RefreshCw, Trash2, Calendar, X, Eye, FileText, Edit2, Users, BarChart3 } from 'lucide-react';

export const PurchaseView: React.FC = () => {
  const { activeBranchId, user } = useAuth();
  const { showToast } = useToast();
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierStats, setSupplierStats] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs
  const [activeSubTab, setActiveSubTab] = useState<'po_list' | 'suppliers'>('po_list');

  // Date Filters (for PO list)
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [showPOModal, setShowPOModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);

  // Create PO Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poDueDate, setPoDueDate] = useState(() => {
    const d = new Date(Date.now() + 30 * 86400000);
    return d.toISOString().split('T')[0];
  });
  const [poLines, setPoLines] = useState<any[]>([
    { item_id: '', item_name: '', quantity_ordered: 1, unit: 'gram', unit_price: 0 }
  ]);

  // Create Supplier Form State
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supTerms, setSupTerms] = useState(30);

  // Edit Supplier Form State
  const [editSupId, setEditSupId] = useState('');
  const [editSupName, setEditSupName] = useState('');
  const [editSupContact, setEditSupContact] = useState('');
  const [editSupPhone, setEditSupPhone] = useState('');
  const [editSupEmail, setEditSupEmail] = useState('');
  const [editSupAddress, setEditSupAddress] = useState('');
  const [editSupTerms, setEditSupTerms] = useState(30);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = {
        branch_id: activeBranchId,
        filter: dateFilter,
      };
      if (dateFilter === 'custom' && startDate && endDate) {
        params.start_date = startDate;
        params.end_date = endDate;
      }

      const [pos, sups, stats, ings] = await Promise.all([
        api.get('/purchase/orders', params),
        api.get('/purchase/suppliers'),
        api.get('/purchase/suppliers/stats').catch(() => []),
        api.get('/stock/ingredients', { branch_id: activeBranchId }).catch(() => []),
      ]);
      setPurchaseOrders(pos);
      setSuppliers(sups);
      setSupplierStats(stats);
      setIngredients(ings);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBranchId, dateFilter, startDate, endDate]);

  const handleReceivePO = async (poId: string) => {
    try {
      await api.post('/purchase/receive', { 
        po_id: poId,
        user_id: user?.id,
        supplier_invoice_number: `INV-${Date.now().toString().slice(-4)}`
      });
      showToast('Penerimaan barang berhasil dicatat! Stok bahan baku otomatis bertambah.', 'success');
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Gagal menerima barang', 'error');
    }
  };

  // Add/Remove PO Line Items
  const handleAddLine = () => {
    setPoLines([...poLines, { item_id: '', item_name: '', quantity_ordered: 1, unit: 'gram', unit_price: 0 }]);
  };

  const handleRemoveLine = (index: number) => {
    const updated = [...poLines];
    updated.splice(index, 1);
    setPoLines(updated);
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const updated = [...poLines];
    if (field === 'item_id') {
      const ing = ingredients.find((i: any) => i.id === value);
      updated[index] = {
        ...updated[index],
        item_id: value,
        item_name: ing ? ing.name : '',
        unit: ing ? ing.base_unit : 'gram',
        unit_price: ing ? ing.cost_per_unit : 0,
      };
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
    }
    setPoLines(updated);
  };

  // Create PO Submit
  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      showToast('Silakan pilih Supplier terlebih dahulu', 'error');
      return;
    }
    const validLines = poLines.filter(line => line.item_id && line.quantity_ordered > 0);
    if (validLines.length === 0) {
      showToast('Silakan tambahkan minimal 1 item bahan baku yang valid', 'error');
      return;
    }
    try {
      await api.post('/purchase/orders', {
        branch_id: activeBranchId,
        supplier_id: selectedSupplierId,
        notes: poNotes,
        due_date: poDueDate,
        items: validLines,
        user_id: user?.id,
        auto_approve: true,
      });
      showToast('Purchase Order (PO) berhasil dibuat & disetujui!', 'success');
      setShowPOModal(false);
      setSelectedSupplierId('');
      setPoNotes('');
      setPoLines([{ item_id: '', item_name: '', quantity_ordered: 1, unit: 'gram', unit_price: 0 }]);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Gagal membuat Purchase Order', 'error');
    }
  };

  // Create Supplier Submit
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim() || !supContact.trim() || !supPhone.trim()) {
      showToast('Nama, Kontak Person, dan No Telepon wajib diisi', 'error');
      return;
    }
    try {
      await api.post('/purchase/suppliers', {
        name: supName,
        contact_person: supContact,
        phone: supPhone,
        email: supEmail,
        address: supAddress,
        payment_terms_days: supTerms,
      });
      showToast('Supplier baru berhasil ditambahkan!', 'success');
      setShowSupplierModal(false);
      setSupName('');
      setSupContact('');
      setSupPhone('');
      setSupEmail('');
      setSupAddress('');
      setSupTerms(30);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Gagal menambahkan supplier', 'error');
    }
  };

  // Open Edit Supplier
  const openEditSupplier = (sup: any) => {
    setEditSupId(sup.id);
    setEditSupName(sup.name || '');
    setEditSupContact(sup.contact_person || '');
    setEditSupPhone(sup.phone || '');
    setEditSupEmail(sup.email || '');
    setEditSupAddress(sup.address || '');
    setEditSupTerms(sup.payment_terms_days || 30);
    setShowEditSupplierModal(true);
  };

  // Edit Supplier Submit
  const handleEditSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSupName.trim() || !editSupContact.trim() || !editSupPhone.trim()) {
      showToast('Nama, Kontak Person, dan No Telepon wajib diisi', 'error');
      return;
    }
    try {
      await api.put(`/purchase/suppliers/${editSupId}`, {
        name: editSupName,
        contact_person: editSupContact,
        phone: editSupPhone,
        email: editSupEmail,
        address: editSupAddress,
        payment_terms_days: editSupTerms,
      });
      showToast('Informasi Supplier berhasil diperbarui!', 'success');
      setShowEditSupplierModal(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui supplier', 'error');
    }
  };

  // Soft Delete Supplier
  const handleDeleteSupplier = async (sup: any) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus Supplier "${sup.name}"?`)) return;
    try {
      await api.delete(`/purchase/suppliers/${sup.id}`);
      showToast(`Supplier "${sup.name}" berhasil dihapus (soft delete).`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus supplier', 'error');
    }
  };

  const viewPODetails = (po: any) => {
    setSelectedPO(po);
    setShowDetailModal(true);
  };

  return (
    <div className="flex-1 bg-[#F8FAFC] overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Manajemen Pembelian & Purchase Order (PO)</h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Kelola pesanan pembelian bahan baku ke supplier, kelola data supplier, dan penerimaan barang (Goods Receipt)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeSubTab === 'po_list' ? (
            <button
              onClick={() => setShowPOModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Buat PO Baru
            </button>
          ) : (
            <button
              onClick={() => setShowSupplierModal(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambah Supplier
            </button>
          )}
          <button
            onClick={loadData}
            className="p-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl border border-gray-200 shadow-2xs transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 self-start max-w-sm">
        <button
          onClick={() => setActiveSubTab('po_list')}
          className={`flex-1 py-1.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'po_list' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Daftar Purchase Orders (PO)
        </button>
        <button
          onClick={() => setActiveSubTab('suppliers')}
          className={`flex-1 py-1.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'suppliers' ? 'bg-white text-purple-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Kelola Supplier & Stats
        </button>
      </div>

      {/* ==================== TAB CONTENT: PO LIST ==================== */}
      {activeSubTab === 'po_list' && (
        <div className="space-y-6">
          {/* Date Filter Panel */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-semibold text-gray-700">
            <div className="flex flex-wrap items-center gap-2">
              <span>Filter Periode PO:</span>
              {(['today', 'week', 'month', 'custom'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setDateFilter(mode)}
                  className={`px-3 py-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
                    dateFilter === mode
                      ? 'bg-blue-50 border-blue-200 text-blue-600'
                      : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  {mode === 'today' && 'Hari Ini'}
                  {mode === 'week' && 'Minggu Ini'}
                  {mode === 'month' && 'Bulan Ini'}
                  {mode === 'custom' && 'Kustom Tanggal'}
                </button>
              ))}
            </div>

            {dateFilter === 'custom' && (
              <div className="flex items-center gap-2 self-start md:self-auto">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="p-2 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:outline-none"
                />
                <span>s/d</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="p-2 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* PO Table */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-[10px] tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="py-3.5 px-5">No. PO</th>
                    <th className="py-3.5 px-5">Tanggal</th>
                    <th className="py-3.5 px-5">Supplier</th>
                    <th className="py-3.5 px-5">Item Pesanan</th>
                    <th className="py-3.5 px-5">Total PO</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                  {purchaseOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">
                        Tidak ada transaksi Purchase Order dalam periode terpilih.
                      </td>
                    </tr>
                  ) : (
                    purchaseOrders.map((po) => (
                      <tr key={po.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3.5 px-5 font-mono font-bold text-blue-600">{po.po_number}</td>
                        <td className="py-3.5 px-5 text-gray-500">
                          {po.created_at ? new Date(po.created_at).toLocaleDateString('id-ID') : '-'}
                        </td>
                        <td className="py-3.5 px-5 font-bold text-gray-900">{po.supplier_name}</td>
                        <td className="py-3.5 px-5">
                          <span className="text-[11px] text-gray-600 font-medium">
                            {po.items && po.items.length > 0 
                              ? `${po.items[0].item_name} (${po.items[0].quantity_ordered} ${po.items[0].unit})${po.items.length > 1 ? ` & ${po.items.length - 1} item lainnya` : ''}` 
                              : '-'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 font-black text-gray-900">Rp {po.total_amount?.toLocaleString('id-ID')}</td>
                        <td className="py-3.5 px-5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border ${
                              po.status === 'received_full'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : po.status === 'approved'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {po.status === 'received_full' ? 'DITERIMA' : po.status === 'approved' ? 'DISETUJUI' : 'DIAJUKAN'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right flex items-center justify-end gap-2">
                          <button
                            onClick={() => viewPODetails(po)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                            title="Lihat Detail PO"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {po.status === 'approved' && (
                            <button
                              onClick={() => handleReceivePO(po.id)}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[10px] font-bold shadow-xs transition-colors cursor-pointer"
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
      )}

      {/* ==================== TAB CONTENT: SUPPLIERS ==================== */}
      {activeSubTab === 'suppliers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Kelola Data Supplier (CRUD) - Kiri (2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <h4 className="font-bold text-gray-900 text-sm">Daftar Supplier Aktif ({suppliers.length})</h4>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-[10px] tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="py-3 px-4">Nama Supplier</th>
                      <th className="py-3 px-4">Kontak Person</th>
                      <th className="py-3 px-4">No. Telp</th>
                      <th className="py-3 px-4">Termin Bayar</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                    {suppliers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">
                          Belum ada supplier terdaftar.
                        </td>
                      </tr>
                    ) : (
                      suppliers.map((s) => (
                        <tr key={s.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-3 px-4 font-bold text-gray-900">{s.name}</td>
                          <td className="py-3 px-4">{s.contact_person}</td>
                          <td className="py-3 px-4 font-mono">{s.phone}</td>
                          <td className="py-3 px-4">{s.payment_terms_days} Hari</td>
                          <td className="py-3 px-4 text-right flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditSupplier(s)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Supplier"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSupplier(s)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Supplier"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Statistik Pembelian Supplier - Kanan (1 column) */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <h4 className="font-bold text-gray-900 text-sm">Statistik Pengeluaran PO</h4>
                </div>
              </div>

              <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                {supplierStats.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-xs">
                    Belum ada riwayat belanja untuk dihitung statistiknya.
                  </div>
                ) : (
                  supplierStats.map((stat, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50/70 transition-colors">
                      <div>
                        <h5 className="font-black text-gray-900 text-xs">{stat.supplier_name}</h5>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">{stat.contact_person} ({stat.phone})</p>
                        <span className="inline-block text-[9px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full mt-1.5">
                          {stat.po_count} Transaksi PO
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-900 block">Total Pengeluaran</span>
                        <span className="text-xs font-black text-emerald-600">
                          Rp {stat.total_spent?.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ==================== MODAL: BUAT PO BARU ==================== */}
      {showPOModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/50">
              <h5 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <span>Buat Purchase Order (PO) Baru</span>
              </h5>
              <button onClick={() => setShowPOModal(false)} className="text-slate-400 hover:text-slate-900 font-bold text-sm cursor-pointer">✕</button>
            </div>
            
            <form onSubmit={handleCreatePO} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Pilih Supplier (Wajib):</label>
                  <select
                    required
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-slate-800 focus:outline-none transition-colors cursor-pointer"
                  >
                    <option value="">-- Pilih Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} (T: {s.payment_terms_days} hari)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tanggal Jatuh Tempo:</label>
                  <input
                    type="date"
                    required
                    value={poDueDate}
                    onChange={(e) => setPoDueDate(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Catatan Keterangan PO:</label>
                <input
                  type="text"
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  placeholder="Contoh: Pembelian Bahan Kopi bulanan cabang Menteng"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-medium text-gray-900 focus:outline-none transition-colors"
                />
              </div>

              {/* Detail Items Section */}
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="block font-black text-slate-800">Daftar Bahan Baku PO</span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Item Baris
                  </button>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto">
                  {poLines.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                      
                      {/* Ingredient selector */}
                      <div className="col-span-5">
                        <select
                          required
                          value={line.item_id}
                          onChange={(e) => handleLineChange(idx, 'item_id', e.target.value)}
                          className="w-full p-2 bg-white border border-gray-200 rounded-lg focus:outline-none"
                        >
                          <option value="">-- Pilih Bahan Baku --</option>
                          {ingredients.map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} ({ing.base_unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Qty ordered */}
                      <div className="col-span-2">
                        <input
                          type="number"
                          required
                          min="1"
                          value={line.quantity_ordered}
                          onChange={(e) => handleLineChange(idx, 'quantity_ordered', Number(e.target.value))}
                          placeholder="Qty"
                          className="w-full p-2 bg-white border border-gray-200 rounded-lg text-center font-bold focus:outline-none"
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-4 flex items-center gap-1">
                        <span className="text-gray-400">Rp</span>
                        <input
                          type="number"
                          required
                          min="0"
                          value={line.unit_price}
                          onChange={(e) => handleLineChange(idx, 'unit_price', Number(e.target.value))}
                          placeholder="Harga per unit"
                          className="w-full p-2 bg-white border border-gray-200 rounded-lg font-bold focus:outline-none"
                        />
                      </div>

                      {/* Action */}
                      <div className="col-span-1 text-center">
                        {poLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 bg-white">
                <button
                  type="button"
                  onClick={() => setShowPOModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  Simpan & Setujui PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: DETAIL PO ==================== */}
      {showDetailModal && selectedPO && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h5 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                <FileText className="w-5 h-5 text-blue-600" />
                <span>Detail Purchase Order: {selectedPO.po_number}</span>
              </h5>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-900 font-bold text-sm cursor-pointer">✕</button>
            </div>
            
            <div className="p-6 space-y-4 text-xs font-semibold text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] text-gray-400">SUPPLIER</span>
                  <span className="text-slate-900 font-black">{selectedPO.supplier_name}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400">JATUH TEMPO</span>
                  <span className="text-slate-900 font-bold">{new Date(selectedPO.due_date).toLocaleDateString('id-ID')}</span>
                </div>
              </div>

              <div>
                <span className="block text-[10px] text-gray-400">CATATAN</span>
                <span className="text-slate-900">{selectedPO.notes || '-'}</span>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-500 font-bold">
                      <th className="p-2.5">Nama Bahan</th>
                      <th className="p-2.5 text-center">Qty Dipesan</th>
                      <th className="p-2.5 text-center">Qty Diterima</th>
                      <th className="p-2.5 text-right">Harga Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-bold">
                    {selectedPO.items?.map((it: any) => (
                      <tr key={it.id}>
                        <td className="p-2.5">{it.item_name}</td>
                        <td className="p-2.5 text-center">{it.quantity_ordered} {it.unit}</td>
                        <td className="p-2.5 text-center">{it.quantity_received} {it.unit}</td>
                        <td className="p-2.5 text-right">Rp {it.unit_price?.toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-100 pt-3 flex flex-col items-end gap-1 font-bold">
                <div className="flex justify-between w-full text-[11px] text-slate-500">
                  <span>Subtotal:</span>
                  <span>Rp {selectedPO.subtotal?.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between w-full text-[11px] text-slate-500">
                  <span>Pajak (11%):</span>
                  <span>Rp {selectedPO.tax_amount?.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between w-full text-sm text-slate-950 font-black pt-1 border-t border-slate-100">
                  <span>Total PO:</span>
                  <span>Rp {selectedPO.total_amount?.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: TAMBAH SUPPLIER ==================== */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-purple-50/50">
              <h5 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                <Users className="w-5 h-5 text-purple-600" />
                <span>Tambah Supplier Baru</span>
              </h5>
              <button onClick={() => setShowSupplierModal(false)} className="text-slate-400 hover:text-slate-900 font-bold text-sm cursor-pointer">✕</button>
            </div>
            
            <form onSubmit={handleCreateSupplier} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nama Perusahaan/Supplier (Wajib):</label>
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="Contoh: PT. Sumber Makmur"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Kontak Person (Wajib):</label>
                  <input
                    type="text"
                    required
                    value={supContact}
                    onChange={(e) => setSupContact(e.target.value)}
                    placeholder="Nama sales / kontak"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">No. Telepon WA (Wajib):</label>
                  <input
                    type="text"
                    required
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-mono font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email (Opsional):</label>
                  <input
                    type="email"
                    value={supEmail}
                    onChange={(e) => setSupEmail(e.target.value)}
                    placeholder="sales@supplier.com"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-medium text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Termin Pembayaran (Hari):</label>
                  <input
                    type="number"
                    required
                    value={supTerms}
                    onChange={(e) => setSupTerms(Number(e.target.value))}
                    placeholder="30"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Alamat Kantor/Gudang:</label>
                <input
                  type="text"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  placeholder="Jl. Perindustrian No. 10"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-medium text-gray-900 focus:outline-none transition-colors"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  Simpan Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: EDIT SUPPLIER ==================== */}
      {showEditSupplierModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/50">
              <h5 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                <Edit2 className="w-5 h-5 text-blue-600" />
                <span>Edit Informasi Supplier</span>
              </h5>
              <button onClick={() => setShowEditSupplierModal(false)} className="text-slate-400 hover:text-slate-900 font-bold text-sm cursor-pointer">✕</button>
            </div>
            
            <form onSubmit={handleEditSupplier} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nama Perusahaan/Supplier (Wajib):</label>
                <input
                  type="text"
                  required
                  value={editSupName}
                  onChange={(e) => setEditSupName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Kontak Person (Wajib):</label>
                  <input
                    type="text"
                    required
                    value={editSupContact}
                    onChange={(e) => setEditSupContact(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">No. Telepon WA (Wajib):</label>
                  <input
                    type="text"
                    required
                    value={editSupPhone}
                    onChange={(e) => setEditSupPhone(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-mono font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email (Opsional):</label>
                  <input
                    type="email"
                    value={editSupEmail}
                    onChange={(e) => setEditSupEmail(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-medium text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Termin Pembayaran (Hari):</label>
                  <input
                    type="number"
                    required
                    value={editSupTerms}
                    onChange={(e) => setEditSupTerms(Number(e.target.value))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Alamat Kantor/Gudang:</label>
                <input
                  type="text"
                  value={editSupAddress}
                  onChange={(e) => setEditSupAddress(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-medium text-gray-900 focus:outline-none transition-colors"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditSupplierModal(false)}
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
