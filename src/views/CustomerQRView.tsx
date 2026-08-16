import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { isBranchOpen } from '../lib/utils';
import {
  QrCode,
  UtensilsCrossed,
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  Coffee,
  AlertCircle,
  Receipt,
  Move,
  X,
  History
} from 'lucide-react';

export const CustomerQRView: React.FC = () => {
  const { activeBranchId, branches } = useAuth();
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Cart
  const [cart, setCart] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState<string>(() => {
    return localStorage.getItem('pos_customer_name') || '';
  });
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [paymentFlow, setPaymentFlow] = useState<'pay_at_cashier' | 'instant_qris'>('pay_at_cashier');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<any>(null);
  const [qrisData, setQrisData] = useState<any>(null);

  // Modals / Drawer views
  const [showSessionBill, setShowSessionBill] = useState(false);
  const [showMoveTable, setShowMoveTable] = useState(false);

  const loadData = async () => {
    try {
      const [tablesData, prodsData, catsData] = await Promise.all([
        api.get('/pos/tables', { branch_id: activeBranchId }),
        api.get('/products', { branch_id: activeBranchId }),
        api.get('/products/categories'),
      ]);
      setTables(tablesData);

      // Extract table from URL search parameters if scanning QR code
      const urlParams = new URLSearchParams(window.location.search);
      const urlTableId = urlParams.get('table_id');
      const urlTableToken = urlParams.get('table_token');

      let targetTable = null;
      if (urlTableId) {
        targetTable = tablesData.find((t: any) => t.id === urlTableId);
      } else if (urlTableToken) {
        targetTable = tablesData.find((t: any) => t.qr_token === urlTableToken);
      }

      // Sync local state table with API response
      if (targetTable) {
        const freshTargetTable = tablesData.find((t: any) => t.id === targetTable.id);
        setSelectedTable(freshTargetTable || targetTable);
      } else {
        setSelectedTable(tablesData[0] || null);
      }

      setProducts(prodsData);
      setCategories(catsData);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    // Poll table status every 5 seconds to ensure real-time sync with cashier payments/closes
    const interval = setInterval(() => {
      loadData();
    }, 5000);
    return () => clearInterval(interval);
  }, [activeBranchId]);

  // Save customer name to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem('pos_customer_name', customerName);
  }, [customerName]);

  const addToCart = (product: any) => {
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.product_id === product.id);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx].quantity += 1;
        updated[idx].subtotal = updated[idx].quantity * updated[idx].unit_price;
        return updated;
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          unit_price: product.base_price,
          unit_cogs: product.cost_price,
          quantity: 1,
          subtotal: product.base_price,
          kitchen_station: product.category_id === 'cat-food' || product.category_id === 'cat-snack' ? 'food' : 'beverage',
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((it) => {
          if (it.product_id === productId) {
            const newQty = it.quantity + delta;
            return newQty > 0 ? { ...it, quantity: newQty, subtotal: newQty * it.unit_price } : null;
          }
          return it;
        })
        .filter(Boolean) as any[]
    );
  };

  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);
  const tax = Math.round(subtotal * 0.11);
  const total = subtotal + tax;

  const handleSubmitOrder = async () => {
    if (!customerName.trim()) {
      alert('Mohon masukkan nama Anda terlebih dahulu.');
      return;
    }
    if (cart.length === 0) return;

    setIsSubmitting(true);
    try {
      let finalItems = [...cart];
      let orderIdToSend = undefined;

      // Session integration: If table has a running bill, append to it
      if (selectedTable?.occupied && selectedTable?.current_order) {
        orderIdToSend = selectedTable.current_order.id;
        const existingItems = selectedTable.current_order.items || [];
        
        // Clone existing items
        const mergedItems = JSON.parse(JSON.stringify(existingItems));
        
        // Append new items from cart
        cart.forEach((cartItem) => {
          const matched = mergedItems.find((it: any) => it.product_id === cartItem.product_id);
          if (matched) {
            matched.quantity += cartItem.quantity;
            matched.subtotal = matched.quantity * matched.unit_price;
          } else {
            mergedItems.push({
              ...cartItem,
              id: `oi-${Math.random().toString(36).substring(2, 9)}`,
              order_id: orderIdToSend
            });
          }
        });
        finalItems = mergedItems;
      }

      // Calculate total subtotal of final payload
      const finalSubtotal = finalItems.reduce((sum: number, it: any) => sum + it.subtotal, 0);
      const finalTax = Math.round(finalSubtotal * 0.11);

      const payload = {
        order_id: orderIdToSend,
        branch_id: activeBranchId,
        table_id: selectedTable?.id,
        customer_name: customerName,
        order_source: 'qr_customer',
        order_type: 'dine_in',
        items: finalItems,
        tax_amount: finalTax,
        subtotal: finalSubtotal,
        notes: orderNotes,
      };

      const res = await api.post('/pos/orders', payload);
      setSubmittedOrder(res);
      setCart([]); // Clear local cart on success
      setOrderNotes('');

      if (paymentFlow === 'instant_qris') {
        const qris = await api.post('/pos/payment/qris', {
          order_id: res.id,
          amount: res.total_amount,
          customer_name: customerName,
        });
        setQrisData(qris);
      }
      
      // Refresh state
      await loadData();
    } catch (e: any) {
      alert('Gagal mengirim pesanan: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Move Table Action
  const handleMoveTable = async (targetTableId: string) => {
    if (!selectedTable?.current_order) return;
    try {
      await api.post('/pos/orders', {
        order_id: selectedTable.current_order.id,
        table_id: targetTableId,
      });
      alert('Berhasil pindah meja!');
      setShowMoveTable(false);
      
      // Update URL param to match new table
      const newTable = tables.find((t) => t.id === targetTableId);
      if (newTable) {
        const newUrl = `${window.location.pathname}?table_token=${newTable.qr_token}&table_id=${newTable.id}`;
        window.history.replaceState({}, '', newUrl);
      }
      
      await loadData();
    } catch (e: any) {
      alert('Gagal memindahkan meja: ' + e.message);
    }
  };

  const activeBranch = branches.find((b) => b.id === activeBranchId);
  const isOpen = activeBranch ? isBranchOpen(activeBranch.operating_hours) : true;

  if (!isOpen) {
    return (
      <div className="w-full min-h-screen bg-[#0F172A] flex items-center justify-center font-sans p-6 text-center text-white">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
          <AlertCircle className="w-16 h-16 text-rose-500 mb-5 animate-bounce" />
          <h2 className="text-xl font-black mb-2 text-white">Outlet Sedang Tutup</h2>
          <p className="text-sm text-slate-400 max-w-xs mb-6">
            Mohon maaf, saat ini outlet <strong>{activeBranch?.name}</strong> sedang tutup. Jam operasional kami adalah pukul <strong>{activeBranch?.operating_hours || '07:00 - 22:00'}</strong>.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Muat Ulang Halaman
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#0F172A] flex justify-center overflow-x-hidden font-sans">
      
      {/* Mobile-First Container (100% viewport on mobile, mockup frame on desktop) */}
      <div className="w-full h-full lg:max-w-md lg:h-[800px] lg:my-auto lg:rounded-3xl lg:shadow-2xl lg:border lg:border-slate-800 bg-[#F8FAFC] overflow-hidden flex flex-col relative">
        
        {/* Header (Top Nav) */}
        <div className="bg-[#1E293B] text-white p-4 shrink-0 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Coffee className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-black text-sm text-white tracking-tight">POS</h2>
                <p className="text-[9px] text-gray-400 font-medium">Self-Order Menu</p>
              </div>
            </div>
            
            {/* Table Badge Selection */}
            {selectedTable && (
              <button 
                onClick={() => selectedTable?.current_order && setShowMoveTable(true)}
                className="bg-blue-600/30 border border-blue-500/40 text-blue-300 px-3 py-1 rounded-full text-xs font-black font-mono flex items-center gap-1 active:scale-95 transition-all"
              >
                <span>Meja {selectedTable.table_number}</span>
                {selectedTable?.current_order && <Move className="w-3 h-3 text-blue-400" />}
              </button>
            )}
          </div>

          {/* Quick Table Switch Selector (Matches URL scan) */}
          <div className="mt-3 bg-[#0F172A] p-1.5 rounded-xl border border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-gray-400 font-bold px-1.5">Meja:</span>
            <select
              value={selectedTable?.id || ''}
              onChange={(e) => {
                const t = tables.find((tbl) => tbl.id === e.target.value);
                if (t) {
                  setSelectedTable(t);
                  // Update URL parameter dynamically
                  const newUrl = `${window.location.pathname}?table_token=${t.qr_token}&table_id=${t.id}`;
                  window.history.replaceState({}, '', newUrl);
                }
              }}
              className="bg-slate-800 text-white font-bold rounded-lg px-2 py-0.5 border border-slate-700 focus:outline-none cursor-pointer"
            >
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  Meja {t.table_number} ({t.zone})
                </option>
              ))}
            </select>
          </div>

          {/* Table Session/Bill Warning Alert */}
          {selectedTable?.occupied && selectedTable?.current_order && (
            <div className="mt-2.5 bg-blue-500/15 border border-blue-500/30 rounded-xl p-2 flex items-center justify-between animate-in fade-in duration-200">
              <div className="flex items-center space-x-2 text-[10px] text-blue-300">
                <Receipt className="w-3.5 h-3.5" />
                <span className="font-semibold truncate max-w-[160px]">
                  Tagihan aktif: {selectedTable.current_order.customer_name}
                </span>
              </div>
              <button 
                onClick={() => setShowSessionBill(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
              >
                Lihat Tagihan
              </button>
            </div>
          )}
        </div>

        {/* Dynamic content rendering */}
        {submittedOrder ? (
          /* Order success screen */
          <div className="flex-1 p-5 flex flex-col items-center justify-between text-center overflow-y-auto">
            <div className="space-y-4 w-full">
              <div className="w-14 h-14 bg-green-50 text-green-600 border border-green-200 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900">Pesanan Dikirim ke Dapur!</h3>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">No. Order: {submittedOrder.order_number}</p>
              </div>

              {paymentFlow === 'instant_qris' && qrisData ? (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 mt-2">
                  <p className="text-[11px] font-bold text-gray-700">Scan QRIS untuk Bayar Sekarang:</p>
                  <img src={qrisData.qr_image_url} alt="QRIS" className="w-40 h-40 mx-auto rounded-xl border border-gray-200 p-2 bg-white" />
                  <p className="text-sm font-black text-blue-600">Rp {submittedOrder.total_amount.toLocaleString('id-ID')}</p>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-left text-[11px] space-y-1">
                  <p className="font-bold">🛎️ Tagihan Meja {selectedTable?.table_number} Aktif!</p>
                  <p className="text-[10px] text-amber-700">
                    Pesanan Anda telah ditambahkan ke antrean dapur. Silakan melakukan pembayaran ke kasir setelah Anda selesai bersantap.
                  </p>
                </div>
              )}

              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-left text-xs space-y-1.5">
                <p className="font-black text-gray-800">Detail Pesanan Anda:</p>
                <div className="space-y-1 divide-y divide-gray-100 max-h-40 overflow-y-auto pr-1">
                  {submittedOrder.items?.map((it: any) => (
                    <div key={it.id} className="flex justify-between text-[10px] text-gray-600 pt-1">
                      <span>{it.quantity}x {it.product_name}</span>
                      <span className="font-bold text-gray-900">Rp {it.subtotal.toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setSubmittedOrder(null);
                setQrisData(null);
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-md transition-colors mt-4 shrink-0"
            >
              Kembali ke Menu Utama
            </button>
          </div>
        ) : (
          /* Menu & Ordering flow screen */
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            {/* Category horizontal scroll */}
            <div className="p-2 border-b border-gray-200 flex space-x-1.5 overflow-x-auto bg-gray-50/50 shrink-0 select-none">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
                  selectedCategory === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                Semua
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
                    selectedCategory === c.id ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* Scrollable Product List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {products
                .filter((p) => selectedCategory === 'all' || p.category_id === selectedCategory)
                .map((p) => {
                  const inCart = cart.find((i) => i.product_id === p.id);
                  return (
                    <div
                      key={p.id}
                      className="p-2.5 bg-white rounded-2xl border border-gray-200 flex items-center justify-between space-x-3 shadow-2xs hover:border-blue-200 transition-colors"
                    >
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="w-14 h-14 rounded-xl object-cover border border-gray-100 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 text-xs truncate">{p.name}</h4>
                        <p className="text-[9px] text-gray-500 line-clamp-1 mt-0.5">{p.description}</p>
                        <span className="font-black text-blue-600 text-[11px] mt-1 block">
                          Rp {p.base_price.toLocaleString('id-ID')}
                        </span>
                      </div>

                      {inCart ? (
                        <div className="flex items-center space-x-1 bg-gray-50 border border-gray-200 rounded-lg p-0.5 shrink-0">
                          <button
                            onClick={() => updateQuantity(p.id, -1)}
                            className="w-5 h-5 rounded-md bg-white border border-gray-200 text-gray-700 flex items-center justify-center font-bold text-xs hover:bg-gray-100"
                          >
                            -
                          </button>
                          <span className="text-xs font-black px-1 text-gray-900">{inCart.quantity}</span>
                          <button
                            onClick={() => updateQuantity(p.id, 1)}
                            className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs hover:bg-blue-700"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(p)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black rounded-lg shadow-xs shrink-0 transition-colors"
                        >
                          + Tambah
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Bottom Checkout Action Sheet */}
            {cart.length > 0 && (
              <div className="p-3 bg-white border-t border-gray-200 shadow-2xl shrink-0 space-y-2">
                <div className="grid grid-cols-1 gap-1.5">
                  <input
                    type="text"
                    placeholder="Nama Anda (Wajib)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Catatan pesanan (misal: pedas/manis)"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-blue-500"
                  />

                  {/* Payment flow switch */}
                  <div className="flex bg-gray-100 p-0.5 rounded-lg text-[10px] font-black">
                    <button
                      onClick={() => setPaymentFlow('pay_at_cashier')}
                      className={`flex-1 py-1 rounded-md transition-all ${
                        paymentFlow === 'pay_at_cashier' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500'
                      }`}
                    >
                      Bayar di Kasir
                    </button>
                    <button
                      onClick={() => setPaymentFlow('instant_qris')}
                      className={`flex-1 py-1 rounded-md transition-all ${
                        paymentFlow === 'instant_qris' ? 'bg-white text-blue-600 shadow-2xs' : 'text-gray-500'
                      }`}
                    >
                      Bayar QRIS
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[8px] text-gray-400 block uppercase font-bold tracking-wider">Total Pesanan</span>
                    <span className="font-black text-slate-900 text-sm">
                      Rp {total.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <button
                    onClick={handleSubmitOrder}
                    disabled={isSubmitting || !customerName.trim()}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50 flex items-center space-x-1 transition-colors"
                  >
                    <span>{isSubmitting ? 'Mengirim...' : 'Kirim Pesanan'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ==================== DRAWER: VIEW CURRENT SESSION BILL ==================== */}
      {showSessionBill && selectedTable?.current_order && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-end justify-center lg:items-center z-50 p-0 lg:p-4">
          <div 
            className="fixed inset-0" 
            onClick={() => setShowSessionBill(false)} 
          />
          <div className="bg-white rounded-t-3xl lg:rounded-3xl w-full lg:max-w-md overflow-hidden shadow-2xl z-10 flex flex-col max-h-[85vh] animate-in slide-in-from-bottom lg:zoom-in-95 duration-200">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h5 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-blue-600" />
                <span>Tagihan Berjalan (Meja {selectedTable.table_number})</span>
              </h5>
              <button 
                onClick={() => setShowSessionBill(false)} 
                className="p-1 text-slate-400 hover:text-slate-900 font-bold text-xs"
              >
                ✕
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="flex items-center justify-between text-slate-500 font-bold text-[10px] uppercase">
                <span>Pelanggan: {selectedTable.current_order.customer_name}</span>
                <span className="font-mono">NO: {selectedTable.current_order.order_number}</span>
              </div>

              {/* Items List */}
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                {selectedTable.current_order.items?.map((it: any) => (
                  <div key={it.id} className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                    <div>
                      <span className="font-bold text-slate-900">{it.quantity}x {it.product_name}</span>
                      {it.notes && <p className="text-[10px] text-slate-400 mt-0.5 font-medium">*{it.notes}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-black text-slate-900 block">Rp {it.subtotal.toLocaleString('id-ID')}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block mt-1 ${
                        it.kitchen_status === 'served' ? 'bg-green-50 border border-green-200 text-green-700' :
                        it.kitchen_status === 'ready' ? 'bg-blue-50 border border-blue-200 text-blue-700' :
                        it.kitchen_status === 'in_prep' ? 'bg-amber-50 border border-amber-200 text-amber-700 animate-pulse' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {it.kitchen_status === 'served' ? 'Disajikan' :
                         it.kitchen_status === 'ready' ? 'Siap Saji' :
                         it.kitchen_status === 'in_prep' ? 'Dimasak' : 'Diterima'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Summary */}
              <div className="space-y-1.5 border-t border-slate-100 pt-3 text-[11px] font-bold text-slate-500">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-slate-800">Rp {selectedTable.current_order.subtotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pajak PB1 (11%)</span>
                  <span className="text-slate-800">Rp {selectedTable.current_order.tax_amount.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-xs font-black text-slate-900 border-t border-dashed border-slate-200 pt-2">
                  <span>Total Tagihan</span>
                  <span className="text-blue-600">Rp {selectedTable.current_order.total_amount.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => setShowSessionBill(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors text-center shadow-xs"
              >
                Paham, Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== DRAWER: MOVE TABLE FORM ==================== */}
      {showMoveTable && selectedTable?.current_order && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-end justify-center lg:items-center z-50 p-0 lg:p-4">
          <div 
            className="fixed inset-0" 
            onClick={() => setShowMoveTable(false)} 
          />
          <div className="bg-white rounded-t-3xl lg:rounded-3xl w-full lg:max-w-md overflow-hidden shadow-2xl z-10 flex flex-col max-h-[85vh] animate-in slide-in-from-bottom lg:zoom-in-95 duration-200">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h5 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                <Move className="w-4 h-4 text-blue-600" />
                <span>Pindahkan Meja (Meja {selectedTable.table_number})</span>
              </h5>
              <button 
                onClick={() => setShowMoveTable(false)} 
                className="p-1 text-slate-400 hover:text-slate-900 font-bold text-xs"
              >
                ✕
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-3.5 text-xs flex-1">
              <p className="text-slate-500 font-medium leading-relaxed">
                Pilih meja tujuan untuk memindahkan seluruh pesanan aktif Meja {selectedTable.table_number}:
              </p>
              
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                {tables
                  .filter((t) => t.id !== selectedTable.id && !t.occupied)
                  .map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleMoveTable(t.id)}
                      className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 font-bold rounded-2xl text-center transition-all cursor-pointer"
                    >
                      Meja {t.table_number} ({t.zone})
                    </button>
                  ))}
              </div>

              {tables.filter((t) => t.id !== selectedTable.id && !t.occupied).length === 0 && (
                <p className="text-center py-4 text-slate-400 font-semibold">Tidak ada meja kosong yang tersedia saat ini.</p>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => setShowMoveTable(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors text-center"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
