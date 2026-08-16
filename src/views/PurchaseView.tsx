import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { ShoppingCart, Plus, CheckCircle2, Clock, Truck, RefreshCw, Trash2, Calendar, X, Eye, FileText, Edit2, Users, BarChart3, Printer, Bluetooth } from 'lucide-react';

export const PurchaseView: React.FC = () => {
  const { activeBranchId, user, activeBranch } = useAuth();
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

  // Bluetooth Connection Status State
  const [isBtConnected, setIsBtConnected] = useState(false);

  // Print Configuration States
  const [printDocType, setPrintDocType] = useState<'surat_jalan' | 'tanda_terima'>('surat_jalan');
  const [printPaperSize, setPrintPaperSize] = useState<'a4' | 'thermal_80' | 'thermal_58'>('a4');
  
  // Custom print display options
  const [printCustomTitle, setPrintCustomTitle] = useState('');
  const [printShowPrices, setPrintShowPrices] = useState(false);
  const [printShowNotes, setPrintShowNotes] = useState(true);
  const [printShowSignatures, setPrintShowSignatures] = useState(true);
  const [printShowTax, setPrintShowTax] = useState(true);

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

  // Monitor Bluetooth Status
  useEffect(() => {
    import('../lib/bluetoothPrinter').then(({ bluetoothPrinter }) => {
      setIsBtConnected(bluetoothPrinter.isConnected());
    }).catch(() => {});

    const handleStatusChange = () => {
      import('../lib/bluetoothPrinter').then(({ bluetoothPrinter }) => {
        setIsBtConnected(bluetoothPrinter.isConnected());
      }).catch(() => {});
    };

    window.addEventListener('bluetooth_printer_status_changed', handleStatusChange);
    return () => {
      window.removeEventListener('bluetooth_printer_status_changed', handleStatusChange);
    };
  }, []);

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
    setPrintCustomTitle(''); // Reset custom title
    setShowDetailModal(true);
  };

  // Direct Bluetooth Print Helper
  const formatPOTextForBluetooth = (
    po: any,
    docType: 'surat_jalan' | 'tanda_terima',
    paperSize: 'thermal_80' | 'thermal_58',
    customTitle: string,
    showPrices: boolean,
    showNotes: boolean,
    showTax: boolean
  ): string => {
    const width = paperSize === 'thermal_58' ? 32 : 40;
    
    const center = (text: string): string => {
      if (text.length >= width) return text.substring(0, width);
      const pad = Math.floor((width - text.length) / 2);
      return ' '.repeat(pad) + text;
    };

    const justify = (left: string, right: string): string => {
      const remaining = width - left.length - right.length;
      if (remaining <= 0) {
        return left + ' ' + right;
      }
      return left + ' '.repeat(remaining) + right;
    };

    const dashed = '-'.repeat(width);
    const line = '='.repeat(width);

    const lines: string[] = [];

    // Header
    lines.push(center(activeBranch?.name?.toUpperCase() || 'OUTLET RESTO'));
    const title = customTitle.trim() || (docType === 'surat_jalan' ? 'SURAT JALAN' : 'TANDA TERIMA');
    lines.push(center(title.toUpperCase()));
    lines.push(dashed);

    // Info
    lines.push(`No. PO: ${po.po_number}`);
    lines.push(`Tanggal: ${new Date(po.created_at || Date.now()).toLocaleDateString('id-ID')}`);
    lines.push(`Supplier: ${po.supplier_name}`);
    lines.push(dashed);

    // Items
    if (docType === 'surat_jalan') {
      lines.push(justify('Nama Item', showPrices ? 'Qty/Harga' : 'Qty'));
      lines.push(dashed);
      po.items?.forEach((it: any) => {
        const namePart = it.item_name.substring(0, width - 12);
        const qtyPart = `${it.quantity_ordered} ${it.unit}`;
        if (showPrices) {
          lines.push(namePart);
          lines.push(justify(`  ${qtyPart}`, `Rp ${it.unit_price.toLocaleString('id-ID')}`));
        } else {
          lines.push(justify(namePart, qtyPart));
        }
      });
    } else {
      lines.push(justify('Nama Item', 'Qty x Harga'));
      lines.push(dashed);
      po.items?.forEach((it: any) => {
        const namePart = it.item_name.substring(0, width - 12);
        const qty = it.quantity_received || it.quantity_ordered;
        const qtyPart = `${qty} ${it.unit}`;
        lines.push(namePart);
        lines.push(justify(`  ${qtyPart}`, `Rp ${it.unit_price.toLocaleString('id-ID')}`));
      });
      lines.push(dashed);

      // Financials
      lines.push(justify('Subtotal:', `Rp ${po.subtotal?.toLocaleString('id-ID')}`));
      if (showTax) {
        lines.push(justify('Pajak (11%):', `Rp ${po.tax_amount?.toLocaleString('id-ID')}`));
      }
      const total = showTax ? po.total_amount : po.subtotal;
      lines.push(line);
      lines.push(justify('GRAND TOTAL:', `Rp ${total?.toLocaleString('id-ID')}`));
      lines.push(line);
    }

    if (showNotes && po.notes) {
      lines.push('');
      lines.push('Catatan:');
      let noteText = po.notes;
      while (noteText.length > 0) {
        lines.push(noteText.substring(0, width));
        noteText = noteText.substring(width);
      }
    }

    // Signatures
    lines.push('');
    lines.push(justify('Pengirim', 'Penerima'));
    lines.push('');
    lines.push('');
    lines.push(justify('(.........)', '(.........)'));

    return lines.join('\n');
  };

  const handlePrintDocument = async () => {
    if (printPaperSize === 'a4') {
      window.print();
    } else {
      // Thermal printer size - attempt direct Bluetooth printing
      try {
        const { bluetoothPrinter } = await import('../lib/bluetoothPrinter');
        if (bluetoothPrinter.isConnected()) {
          const text = formatPOTextForBluetooth(
            selectedPO,
            printDocType,
            printPaperSize,
            printCustomTitle,
            printShowPrices,
            printShowNotes,
            printShowTax
          );
          await bluetoothPrinter.print(text);
          showToast('Dokumen PO berhasil dicetak ke printer Bluetooth!', 'success');
        } else {
          // If Bluetooth printer is not connected
          if (window.confirm('Printer Bluetooth tidak terhubung. Apakah Anda ingin mencetak menggunakan dialog printer browser (kertas struk)?')) {
            window.print();
          }
        }
      } catch (err: any) {
        showToast(err.message || 'Gagal mencetak langsung', 'error');
      }
    }
  };

  return (
    <div className="flex-grow bg-[#F8FAFC] overflow-y-auto p-4 sm:p-6 space-y-6">
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
          className={`flex-grow py-1.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'po_list' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Daftar Purchase Orders (PO)
        </button>
        <button
          onClick={() => setActiveSubTab('suppliers')}
          className={`flex-grow py-1.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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

      {/* ==================== MODAL: DETAIL PO & LIVE PREVIEW ==================== */}
      {showDetailModal && selectedPO && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col md:flex-row max-h-[90vh]">
            
            {/* KIRI: LIVE DOCUMENT PREVIEW AREA */}
            <div className="flex-1 bg-slate-100 p-6 flex flex-col items-center justify-start overflow-y-auto border-r border-slate-200 max-h-[45vh] md:max-h-full">
              <span className="block font-black text-slate-500 text-[10px] mb-3 self-start uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                Live Preview Dokumen
              </span>
              
              {/* Paper Sheet Simulator Container */}
              <div className="w-full flex justify-center">
                <div className={`bg-white shadow-lg text-slate-800 p-6 border border-slate-300 rounded-xs select-none transition-all ${
                  printPaperSize === 'a4' 
                    ? 'w-full max-w-[420px] text-[10px]' 
                    : printPaperSize === 'thermal_80'
                    ? 'w-[80mm] text-[9px] font-mono'
                    : 'w-[58mm] text-[8px] font-mono'
                }`}>
                  {printDocType === 'surat_jalan' ? (
                    <SuratJalanPrintTemplate 
                      po={selectedPO} 
                      branch={activeBranch} 
                      size={printPaperSize}
                      customTitle={printCustomTitle}
                      showPrices={printShowPrices}
                      showNotes={printShowNotes}
                      showSignatures={printShowSignatures}
                    />
                  ) : (
                    <TandaTeimaPrintTemplate 
                      po={selectedPO} 
                      branch={activeBranch} 
                      size={printPaperSize}
                      customTitle={printCustomTitle}
                      showNotes={printShowNotes}
                      showSignatures={printShowSignatures}
                      showTax={printShowTax}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* KANAN: CONFIGURATION & ACTIONS PANEL */}
            <div className="w-full md:w-[350px] p-6 flex flex-col justify-between overflow-y-auto bg-white max-h-[45vh] md:max-h-full">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h5 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                    <Printer className="w-5 h-5 text-blue-600" />
                    <span>Pengaturan Cetak</span>
                  </h5>
                  {isBtConnected && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-black flex items-center gap-1">
                      <Bluetooth className="w-2.5 h-2.5" />
                      Connected
                    </span>
                  )}
                </div>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-gray-500 mb-1">Jenis Dokumen:</label>
                    <select
                      value={printDocType}
                      onChange={(e) => setPrintDocType(e.target.value as any)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold cursor-pointer focus:outline-none"
                    >
                      <option value="surat_jalan">Surat Jalan (Waybill)</option>
                      <option value="tanda_terima">Tanda Terima (Receipt)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-500 mb-1">Ukuran Kertas:</label>
                    <select
                      value={printPaperSize}
                      onChange={(e) => setPrintPaperSize(e.target.value as any)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold cursor-pointer focus:outline-none"
                    >
                      <option value="a4">Kertas A4 / PDF</option>
                      <option value="thermal_80">Kertas Struk 80mm</option>
                      <option value="thermal_58">Kertas Struk 58mm</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-500 mb-1">Judul Kustom:</label>
                    <input
                      type="text"
                      value={printCustomTitle}
                      onChange={(e) => setPrintCustomTitle(e.target.value)}
                      placeholder="Judul bawaan..."
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:bg-white"
                    />
                  </div>
                </div>

                {/* Checkboxes layout settings */}
                <div className="border border-slate-100 p-3 rounded-2xl bg-slate-50/50 space-y-2.5 font-bold text-slate-600 text-[10px]">
                  <span className="block text-[9px] uppercase tracking-wider text-gray-400">Atur Komponen Tampilan</span>
                  {printDocType === 'surat_jalan' && (
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={printShowPrices}
                        onChange={(e) => setPrintShowPrices(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Tampilkan Nilai Harga</span>
                    </label>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={printShowNotes}
                      onChange={(e) => setPrintShowNotes(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Tampilkan Catatan PO</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={printShowSignatures}
                      onChange={(e) => setPrintShowSignatures(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Tampilkan Kolom Ttd</span>
                  </label>
                  {printDocType === 'tanda_terima' && (
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={printShowTax}
                        onChange={(e) => setPrintShowTax(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Tampilkan PPN 11%</span>
                    </label>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handlePrintDocument}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>{printPaperSize === 'a4' ? 'Cetak via Browser (A4)' : isBtConnected ? 'Cetak Langsung (Bluetooth)' : 'Cetak via Browser (Struk)'}</span>
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer text-center text-xs"
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

      {/* ==================== HIDDEN PRINT AREA (RENDER DOKUMEN CETAK) ==================== */}
      {selectedPO && (
        <div id="po-print-area" className={`size-${printPaperSize}`}>
          {printDocType === 'surat_jalan' ? (
            <SuratJalanPrintTemplate 
              po={selectedPO} 
              branch={activeBranch} 
              size={printPaperSize}
              customTitle={printCustomTitle}
              showPrices={printShowPrices}
              showNotes={printShowNotes}
              showSignatures={printShowSignatures}
            />
          ) : (
            <TandaTeimaPrintTemplate 
              po={selectedPO} 
              branch={activeBranch} 
              size={printPaperSize}
              customTitle={printCustomTitle}
              showNotes={printShowNotes}
              showSignatures={printShowSignatures}
              showTax={printShowTax}
            />
          )}
        </div>
      )}

    </div>
  );
};

// ==================== TEMPLATE CETAK: SURAT JALAN ====================
interface PrintProps {
  po: any;
  branch: any;
  size: 'a4' | 'thermal_80' | 'thermal_58';
  customTitle: string;
  showPrices?: boolean;
  showNotes?: boolean;
  showSignatures?: boolean;
  showTax?: boolean;
}

const SuratJalanPrintTemplate: React.FC<PrintProps> = ({ 
  po, 
  branch, 
  size, 
  customTitle,
  showPrices = false,
  showNotes = true,
  showSignatures = true
}) => {
  const isThermal = size === 'thermal_80' || size === 'thermal_58';
  const widthClass = size === 'thermal_58' ? 'w-[58mm]' : 'w-[80mm]';
  const title = customTitle.trim() || 'SURAT JALAN / WAYBILL';

  if (isThermal) {
    return (
      <div className={`${widthClass} p-2 text-black font-mono text-[9px] leading-tight bg-white`}>
        <div className="text-center font-bold border-b border-dashed border-black pb-2 mb-2">
          <span className="text-xs uppercase">{branch?.name || 'OUTLET RESTO'}</span>
          <br />
          <span className="text-[10px]">{title}</span>
        </div>
        <div className="space-y-1 mb-2">
          <div>No. PO: <span className="font-bold">{po.po_number}</span></div>
          <div>Tanggal: {new Date(po.created_at || Date.now()).toLocaleDateString('id-ID')}</div>
          <div>Supplier: {po.supplier_name}</div>
        </div>
        
        <table className="w-full border-t border-b border-dashed border-black my-2 text-[9px]">
          <thead>
            <tr className="font-bold text-left">
              <th className="py-1">Nama Item</th>
              <th className="py-1 text-center">Pesan</th>
              {showPrices && <th className="py-1 text-right">Harga</th>}
            </tr>
          </thead>
          <tbody>
            {po.items?.map((it: any) => (
              <tr key={it.id} className="border-b border-dotted border-gray-300">
                <td className="py-1 font-bold">{it.item_name}</td>
                <td className="py-1 text-center">{it.quantity_ordered} {it.unit}</td>
                {showPrices && <td className="py-1 text-right">Rp {it.unit_price?.toLocaleString('id-ID')}</td>}
              </tr>
            ))}
          </tbody>
        </table>

        {showNotes && po.notes && <div className="my-2 italic">Catatan: {po.notes}</div>}

        {showSignatures && (
          <div className="grid grid-cols-2 text-center mt-6 pt-2 border-t border-dashed border-black">
            <div>
              <span>Pengirim</span>
              <div className="h-10"></div>
              <span>( ............ )</span>
            </div>
            <div>
              <span>Penerima</span>
              <div className="h-10"></div>
              <span>( ............ )</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // A4 Layout
  return (
    <div className="w-[210mm] p-10 text-slate-800 font-sans text-xs bg-white min-h-screen">
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5 mb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">{title}</h1>
          <span className="text-slate-500 font-bold block mt-1">Nusantara POS Enterprise System</span>
        </div>
        <div className="text-right">
          <span className="text-sm font-black text-blue-600 block">{po.po_number}</span>
          <span className="text-[10px] text-gray-500 font-bold block mt-1">Tanggal: {new Date(po.created_at || Date.now()).toLocaleDateString('id-ID')}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-6">
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
          <span className="block text-[10px] font-bold text-gray-400 mb-1">PENGIRIM (SUPPLIER)</span>
          <span className="text-sm font-black text-slate-900 block">{po.supplier_name}</span>
          <span className="text-slate-600 block mt-1">Jatuh Tempo: {new Date(po.due_date).toLocaleDateString('id-ID')}</span>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
          <span className="block text-[10px] font-bold text-gray-400 mb-1">PENERIMA (CABANG OUTLET)</span>
          <span className="text-sm font-black text-slate-900 block">{branch?.name || 'Cabang Resto'}</span>
          <span className="text-slate-600 block mt-1">{branch?.address || '-'}</span>
          <span className="text-slate-600 block">Telp: {branch?.phone || '-'}</span>
        </div>
      </div>

      <div className="mb-6">
        <span className="block font-black text-slate-900 mb-2">DAFTAR ITEM BARANG</span>
        <table className="w-full text-left border border-slate-300 border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-300">
              <th className="p-3 border-r border-slate-300">Nama Bahan Baku</th>
              <th className="p-3 text-center border-r border-slate-300">Kuantitas Dipesan</th>
              {showPrices && <th className="p-3 text-right border-r border-slate-300">Harga Unit</th>}
              {showPrices && <th className="p-3 text-right border-r border-slate-300">Subtotal</th>}
              <th className="p-3">Satuan</th>
            </tr>
          </thead>
          <tbody>
            {po.items?.map((it: any) => (
              <tr key={it.id} className="border-b border-slate-300 font-bold text-slate-700">
                <td className="p-3 border-r border-slate-300">{it.item_name}</td>
                <td className="p-3 text-center border-r border-slate-300">{it.quantity_ordered}</td>
                {showPrices && <td className="p-3 text-right border-r border-slate-300">Rp {it.unit_price?.toLocaleString('id-ID')}</td>}
                {showPrices && <td className="p-3 text-right border-r border-slate-300">Rp {(it.quantity_ordered * it.unit_price)?.toLocaleString('id-ID')}</td>}
                <td className="p-3">{it.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNotes && po.notes && (
        <div className="mb-8 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="block text-[10px] font-bold text-gray-400 mb-0.5">CATATAN / KETERANGAN:</span>
          <p className="text-slate-700 font-bold">{po.notes}</p>
        </div>
      )}

      {showSignatures && (
        <div className="mt-16 flex justify-around text-center font-bold">
          <div className="w-48">
            <span>Hormat Kami,</span>
            <br />
            <span>Pengirim (Supplier)</span>
            <div className="h-20"></div>
            <span className="border-t border-slate-400 block pt-1.5">( ........................................ )</span>
          </div>
          <div className="w-48">
            <span>Diterima Oleh,</span>
            <br />
            <span>Staf Restoran</span>
            <div className="h-20"></div>
            <span className="border-t border-slate-400 block pt-1.5">( ........................................ )</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== TEMPLATE CETAK: TANDA TERIMA ====================
const TandaTeimaPrintTemplate: React.FC<PrintProps> = ({ 
  po, 
  branch, 
  size, 
  customTitle,
  showNotes = true,
  showSignatures = true,
  showTax = true
}) => {
  const isThermal = size === 'thermal_80' || size === 'thermal_58';
  const widthClass = size === 'thermal_58' ? 'w-[58mm]' : 'w-[80mm]';
  const title = customTitle.trim() || 'TANDA TERIMA PEMBELIAN';

  if (isThermal) {
    return (
      <div className={`${widthClass} p-2 text-black font-mono text-[9px] leading-tight bg-white`}>
        <div className="text-center font-bold border-b border-dashed border-black pb-2 mb-2">
          <span className="text-xs uppercase">{branch?.name || 'OUTLET'}</span>
          <br />
          <span className="text-[10px]">{title}</span>
        </div>
        <div className="space-y-1 mb-2">
          <div>No. PO: <span className="font-bold">{po.po_number}</span></div>
          <div>Tanggal: {new Date(po.created_at || Date.now()).toLocaleDateString('id-ID')}</div>
          <div>Supplier: {po.supplier_name}</div>
        </div>
        
        <table className="w-full border-t border-b border-dashed border-black my-2 text-[9px]">
          <thead>
            <tr className="font-bold text-left">
              <th className="py-1">Nama Item</th>
              <th className="py-1 text-center">Qty</th>
              <th className="py-1 text-right">Harga</th>
            </tr>
          </thead>
          <tbody>
            {po.items?.map((it: any) => (
              <tr key={it.id} className="border-b border-dotted border-gray-300">
                <td className="py-1 font-bold">{it.item_name}</td>
                <td className="py-1 text-center">{it.quantity_received || it.quantity_ordered} {it.unit}</td>
                <td className="py-1 text-right">Rp {it.unit_price?.toLocaleString('id-ID')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-right space-y-1 font-bold my-2 border-b border-dashed border-black pb-2">
          <div>Subtotal: Rp {po.subtotal?.toLocaleString('id-ID')}</div>
          {showTax && <div>Pajak (11%): Rp {po.tax_amount?.toLocaleString('id-ID')}</div>}
          <div className="text-[10px]">TOTAL: Rp {(showTax ? po.total_amount : po.subtotal)?.toLocaleString('id-ID')}</div>
        </div>

        {showNotes && po.notes && <div className="my-2 italic">Catatan: {po.notes}</div>}

        {showSignatures && (
          <div className="grid grid-cols-2 text-center mt-6 pt-2">
            <div>
              <span>Supplier</span>
              <div className="h-10"></div>
              <span>( ............ )</span>
            </div>
            <div>
              <span>Penerima</span>
              <div className="h-10"></div>
              <span>( ............ )</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // A4 Layout
  return (
    <div className="w-[210mm] p-10 text-slate-800 font-sans text-xs bg-white min-h-screen">
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5 mb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">{title}</h1>
          <span className="text-slate-500 font-bold block mt-1">Bukti Penerimaan Barang & Tagihan PO</span>
        </div>
        <div className="text-right">
          <span className="text-sm font-black text-blue-600 block">{po.po_number}</span>
          <span className="text-[10px] text-gray-500 font-bold block mt-1">Tanggal: {new Date(po.created_at || Date.now()).toLocaleDateString('id-ID')}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-6">
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
          <span className="block text-[10px] font-bold text-gray-400 mb-1">DITERIMA DARI (SUPPLIER)</span>
          <span className="text-sm font-black text-slate-900 block">{po.supplier_name}</span>
          <span className="text-slate-600 block mt-1">Jatuh Tempo: {new Date(po.due_date).toLocaleDateString('id-ID')}</span>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
          <span className="block text-[10px] font-bold text-gray-400 mb-1">DITERIMA OLEH OUTLET</span>
          <span className="text-sm font-black text-slate-900 block">{branch?.name || 'Cabang Resto'}</span>
          <span className="text-slate-600 block mt-1">{branch?.address || '-'}</span>
        </div>
      </div>

      <div className="mb-6">
        <span className="block font-black text-slate-900 mb-2">RINCIAN HARGA BARANG</span>
        <table className="w-full text-left border border-slate-300 border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-300">
              <th className="p-3 border-r border-slate-300">Nama Bahan</th>
              <th className="p-3 text-center border-r border-slate-300">Qty Diterima</th>
              <th className="p-3 text-right border-r border-slate-300">Harga Unit</th>
              <th className="p-3 text-right">Total Harga</th>
            </tr>
          </thead>
          <tbody>
            {po.items?.map((it: any) => (
              <tr key={it.id} className="border-b border-slate-300 font-bold text-slate-700">
                <td className="p-3 border-r border-slate-300">{it.item_name}</td>
                <td className="p-3 text-center border-r border-slate-300">{it.quantity_received || it.quantity_ordered} {it.unit}</td>
                <td className="p-3 text-right border-r border-slate-300">Rp {it.unit_price?.toLocaleString('id-ID')}</td>
                <td className="p-3 text-right">Rp {((it.quantity_received || it.quantity_ordered) * it.unit_price)?.toLocaleString('id-ID')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-end gap-1.5 font-bold mb-8">
        <div className="flex justify-between w-64 text-[11px] text-slate-500">
          <span>Subtotal:</span>
          <span>Rp {po.subtotal?.toLocaleString('id-ID')}</span>
        </div>
        {showTax && (
          <div className="flex justify-between w-64 text-[11px] text-slate-500">
            <span>Pajak (11%):</span>
            <span>Rp {po.tax_amount?.toLocaleString('id-ID')}</span>
          </div>
        )}
        <div className="flex justify-between w-64 text-sm text-slate-950 font-black pt-1 border-t border-slate-100">
          <span>Grand Total:</span>
          <span>Rp {(showTax ? po.total_amount : po.subtotal)?.toLocaleString('id-ID')}</span>
        </div>
      </div>

      {showNotes && po.notes && (
        <div className="mb-8 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="block text-[10px] font-bold text-gray-400 mb-0.5">CATATAN / KETERANGAN:</span>
          <p className="text-slate-700 font-bold">{po.notes}</p>
        </div>
      )}

      {showSignatures && (
        <div className="mt-16 flex justify-around text-center font-bold">
          <div className="w-48">
            <span>Supplier,</span>
            <div className="h-20"></div>
            <span className="border-t border-slate-400 block pt-1.5">( ........................................ )</span>
          </div>
          <div className="w-48">
            <span>Penerima (Kasir/Staff),</span>
            <div className="h-20"></div>
            <span className="border-t border-slate-400 block pt-1.5">( ........................................ )</span>
          </div>
        </div>
      )}
    </div>
  );
};
