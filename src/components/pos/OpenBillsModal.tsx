import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Order, DiningTable } from '../../types';
import {
  FileText,
  Search,
  RefreshCw,
  X,
  CreditCard,
  Printer,
  Trash2,
  Clock,
  UtensilsCrossed,
  ShoppingBag,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';

interface OpenBillsModalProps {
  onClose: () => void;
  onLoadBill: (order: Order) => void;
  onSettleBill: (order: Order) => void;
  onPrintPreBill: (order: Order) => void;
  tables: DiningTable[];
}

export const OpenBillsModal: React.FC<OpenBillsModalProps> = ({
  onClose,
  onLoadBill,
  onSettleBill,
  onPrintPreBill,
  tables,
}) => {
  const { activeBranchId } = useAuth();
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'dine_in' | 'take_away'>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [movingOrder, setMovingOrder] = useState<any | null>(null);
  const [targetTableId, setTargetTableId] = useState<string>('');

  const loadOpenBills = async () => {
    setLoading(true);
    try {
      const data = await api.get('/pos/open-bills', { branch_id: activeBranchId });
      setBills(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error loading open bills', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpenBills();
  }, [activeBranchId]);

  const handleCancelBill = async (orderId: string, orderNumber: string) => {
    if (!confirm(`Batalkan dan hapus Open Bill ${orderNumber}? Tagihan ini belum dibayar.`)) {
      return;
    }
    try {
      await api.delete(`/pos/orders/${orderId}`);
      await loadOpenBills();
    } catch (e: any) {
      alert('Gagal membatalkan tagihan: ' + e.message);
    }
  };

  const handleMoveTable = async () => {
    if (!movingOrder || !targetTableId) return;
    try {
      await api.post(`/pos/orders/${movingOrder.id}/move-table`, { table_id: targetTableId });
      setMovingOrder(null);
      setTargetTableId('');
      await loadOpenBills();
    } catch (e: any) {
      alert('Gagal memindahkan meja: ' + e.message);
    }
  };

  // Filtered bills
  const filteredBills = bills.filter((b) => {
    const matchesType = filterType === 'all' || b.order_type === filterType;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      (b.order_number || '').toLowerCase().includes(query) ||
      (b.customer_name || '').toLowerCase().includes(query) ||
      (b.table_number || '').toLowerCase().includes(query);
    return matchesType && matchesSearch;
  });

  const getDurationString = (createdAt: string) => {
    const elapsedMs = Date.now() - new Date(createdAt).getTime();
    const mins = Math.floor(elapsedMs / 60000);
    if (mins < 1) return 'Baru saja';
    if (mins < 60) return `${mins} mnt lalu`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}j ${remMins}m lalu`;
  };

  const getKitchenStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">Siap Saji</span>;
      case 'preparing':
        return <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">Sedang Dimasak</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">Pesanan Masuk</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:px-6 sm:py-4 border-b border-gray-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-[#1E293B] text-base sm:text-lg leading-tight">
                  Kelola Open Bill (Tagihan Aktif)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-xs">
                  {bills.length} Tagihan
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Daftar pesanan aktif & meja yang sedang berjalan sebelum pelunasan
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto">
            <button
              onClick={loadOpenBills}
              className="p-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"
              title="Refresh Tagihan"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors font-bold"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Search & Filter Tabs */}
        <div className="p-3 sm:px-6 sm:py-3 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between shrink-0">
          {/* Filter Tabs */}
          <div className="flex bg-gray-200/80 p-1 rounded-xl text-xs font-bold w-fit">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Semua ({bills.length})
            </button>
            <button
              onClick={() => setFilterType('dine_in')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                filterType === 'dine_in' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Dine In ({bills.filter((b) => b.order_type === 'dine_in').length})</span>
            </button>
            <button
              onClick={() => setFilterType('take_away')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                filterType === 'take_away' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Take Away ({bills.filter((b) => b.order_type === 'take_away').length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Meja, No Order, Pelanggan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </div>

        {/* Bills List Grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-50">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400 space-y-2">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold">Memuat data Open Bill...</p>
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-gray-400 space-y-3 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <p className="font-bold text-gray-700 text-sm">Tidak ada Open Bill yang aktif</p>
                <p className="text-xs text-gray-400 max-w-sm mt-1">
                  Saat kasir melayani pesanan di meja, klik tombol <strong>"Open Bill (Simpan)"</strong> di kasir untuk menyimpan tagihan tanpa harus bayar seketika.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              {filteredBills.map((order) => {
                const isExpanded = expandedOrderId === order.id;
                const isDineIn = order.order_type === 'dine_in';

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-gray-200 hover:border-amber-400 transition-all shadow-xs overflow-hidden flex flex-col justify-between"
                  >
                    {/* Card Top Banner */}
                    <div className="p-3.5 sm:p-4 border-b border-gray-100 bg-linear-to-r from-gray-50 to-white">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 shadow-2xs ${
                                isDineIn
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-emerald-600 text-white'
                              }`}
                            >
                              {isDineIn ? <UtensilsCrossed className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                              <span>{isDineIn ? `Meja ${order.table_number || '-'}` : 'Take Away'}</span>
                            </span>
                            <span className="font-mono text-xs font-black text-gray-900">
                              {order.order_number}
                            </span>
                          </div>

                          <p className="font-bold text-gray-800 text-sm truncate">
                            {order.customer_name || 'Pelanggan'}
                          </p>
                        </div>

                        <div className="flex flex-col items-end space-y-1 shrink-0">
                          {getKitchenStatusBadge(order.status)}
                          <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {getDurationString(order.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Middle: Summary & Expandable Items */}
                    <div className="p-3.5 sm:p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 font-medium">
                          {order.item_count || (order.items || []).length} Menu Dipesan
                        </span>
                        <button
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          className="text-blue-600 hover:text-blue-700 font-bold text-[11px] flex items-center space-x-0.5"
                        >
                          <span>{isExpanded ? 'Tutup Rincian' : 'Lihat Rincian'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Items Preview / Accordion */}
                      {isExpanded ? (
                        <div className="bg-gray-50 rounded-xl p-2.5 space-y-1.5 border border-gray-200 text-xs">
                          {(order.items || []).map((it: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-start text-[11px]">
                              <div>
                                <span className="font-bold text-gray-800">
                                  {it.quantity}x {it.product_name}
                                </span>
                                {it.variant_name && (
                                  <span className="text-gray-500 text-[10px] ml-1">({it.variant_name})</span>
                                )}
                                {it.notes && (
                                  <p className="text-[10px] text-gray-400 italic">"{it.notes}"</p>
                                )}
                              </div>
                              <span className="font-mono text-gray-700">
                                Rp {(it.subtotal || it.quantity * it.unit_price).toLocaleString('id-ID')}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {(order.items || [])
                            .map((it: any) => `${it.quantity}x ${it.product_name}`)
                            .join(', ')}
                        </p>
                      )}

                      {/* Total Price */}
                      <div className="flex items-baseline justify-between pt-1 border-t border-gray-100">
                        <span className="text-xs text-gray-500 font-semibold">Total Tagihan:</span>
                        <span className="text-base sm:text-lg font-black text-[#1E293B]">
                          Rp {Number(order.total_amount || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="p-3 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center gap-1.5">
                      {/* Buka / Tambah Menu */}
                      <button
                        onClick={() => {
                          onLoadBill(order);
                          onClose();
                        }}
                        className="flex-1 min-w-[110px] py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center space-x-1"
                        title="Buka pesanan ini di kasir untuk tambah menu atau edit"
                      >
                        <UtensilsCrossed className="w-3.5 h-3.5" />
                        <span>Buka / Edit</span>
                      </button>

                      {/* Bayar Langsung */}
                      <button
                        onClick={() => {
                          onSettleBill(order);
                          onClose();
                        }}
                        className="flex-1 min-w-[110px] py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center space-x-1"
                        title="Langsung bayar tagihan ini"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Bayar Sekarang</span>
                      </button>

                      {/* Cetak Pre-Bill */}
                      <button
                        onClick={() => onPrintPreBill(order)}
                        className="p-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold transition-colors"
                        title="Cetak Struk Tagihan Sementara (Pre-Bill)"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {/* Pindah Meja (Dine In only) */}
                      {isDineIn && (
                        <button
                          onClick={() => {
                            setMovingOrder(order);
                            setTargetTableId(order.table_id || '');
                          }}
                          className="p-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold transition-colors"
                          title="Pindahkan ke Meja Lain"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </button>
                      )}

                      {/* Batalkan Open Bill */}
                      <button
                        onClick={() => handleCancelBill(order.id, order.order_number)}
                        className="p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors"
                        title="Batalkan Open Bill"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Move Table Dialog Modal */}
        {movingOrder && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h4 className="font-black text-gray-900 text-sm sm:text-base">
                  Pindah Meja ({movingOrder.order_number})
                </h4>
                <button
                  onClick={() => setMovingOrder(null)}
                  className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700">Pilih Meja Tujuan Baru:</label>
                <select
                  value={targetTableId}
                  onChange={(e) => setTargetTableId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Pilih Meja --</option>
                  {tables.map((tbl) => (
                    <option key={tbl.id} value={tbl.id}>
                      Meja {tbl.table_number} ({tbl.zone} • {tbl.capacity} Org) {tbl.occupied ? '(Terisi)' : '(Kosong)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setMovingOrder(null)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  onClick={handleMoveTable}
                  disabled={!targetTableId || targetTableId === movingOrder.table_id}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  Pindahkan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
