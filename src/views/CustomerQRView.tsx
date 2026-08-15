import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
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
} from 'lucide-react';

export const CustomerQRView: React.FC = () => {
  const { activeBranchId } = useAuth();
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [paymentFlow, setPaymentFlow] = useState<'pay_at_cashier' | 'instant_qris'>('pay_at_cashier');
  const [submittedOrder, setSubmittedOrder] = useState<any>(null);
  const [qrisData, setQrisData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tablesData, prodsData, catsData] = await Promise.all([
          api.get('/pos/tables', { branch_id: activeBranchId }),
          api.get('/products', { branch_id: activeBranchId }),
          api.get('/products/categories'),
        ]);
        setTables(tablesData);
        
        // Dynamic table selection from URL params (Cloudflare / QR scan redirect)
        const urlParams = new URLSearchParams(window.location.search);
        const urlTableId = urlParams.get('table_id');
        const urlTableToken = urlParams.get('table_token');
        
        let targetTable = null;
        if (urlTableId) {
          targetTable = tablesData.find((t: any) => t.id === urlTableId);
        } else if (urlTableToken) {
          targetTable = tablesData.find((t: any) => t.qr_token === urlTableToken);
        }
        
        setSelectedTable(targetTable || tablesData[0] || null);
        setProducts(prodsData);
        setCategories(catsData);
      } catch (e) {
        console.error(e);
      }
    };
    loadData();
  }, [activeBranchId]);

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
        .filter(Boolean)
    );
  };

  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);
  const tax = Math.round(subtotal * 0.11);
  const total = subtotal + tax;

  const handleSubmitOrder = async () => {
    if (!customerName) {
      alert('Mohon masukkan nama Anda terlebih dahulu.');
      return;
    }
    if (cart.length === 0) return;

    setIsSubmitting(true);
    try {
      const payload = {
        branch_id: activeBranchId,
        table_id: selectedTable?.id,
        customer_name: customerName,
        order_source: 'qr_customer',
        order_type: 'dine_in',
        items: cart,
        tax_amount: tax,
        subtotal,
        notes: orderNotes,
      };

      const res = await api.post('/pos/orders', payload);
      setSubmittedOrder(res);

      if (paymentFlow === 'instant_qris') {
        const qris = await api.post('/pos/payment/qris', {
          order_id: res.id,
          amount: res.total_amount,
          customer_name: customerName,
        });
        setQrisData(qris);
      }
    } catch (e: any) {
      alert('Gagal mengirim pesanan: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 bg-[#F8FAFC] p-4 md:p-6 flex flex-col items-center overflow-y-auto">
      {/* Mobile Simulator Frame */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden flex flex-col min-h-[750px]">
        {/* Customer Header */}
        <div className="bg-[#1E293B] text-white p-5 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Coffee className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-black text-base text-white">POS Multi-Cabang</h2>
                <p className="text-[10px] text-gray-400 font-medium">Self-Order Menu</p>
              </div>
            </div>
            {selectedTable && (
              <span className="bg-blue-600/30 border border-blue-500/40 text-blue-300 px-3 py-1 rounded-full text-xs font-black font-mono">
                Meja {selectedTable.table_number}
              </span>
            )}
          </div>

          {/* Table Switcher Demo */}
          <div className="mt-4 bg-[#0F172A] p-2 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-gray-400 text-[11px] font-medium">Simulasi Meja:</span>
            <select
              value={selectedTable?.id || ''}
              onChange={(e) => {
                const t = tables.find((tbl) => tbl.id === e.target.value);
                setSelectedTable(t);
              }}
              className="bg-slate-800 text-white text-xs font-bold rounded-lg px-2.5 py-1 border border-slate-700 focus:outline-none"
            >
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  Meja {t.table_number} ({t.zone})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Order Status Screen (if placed) */}
        {submittedOrder ? (
          <div className="flex-1 p-6 flex flex-col items-center justify-between text-center space-y-4">
            <div className="space-y-4 w-full">
              <div className="w-16 h-16 bg-green-50 text-green-600 border border-green-200 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">Pesanan Berhasil Terkirim!</h3>
                <p className="text-xs text-gray-500 font-mono mt-1">No. Pesanan: {submittedOrder.order_number}</p>
              </div>

              {paymentFlow === 'instant_qris' && qrisData ? (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 mt-4">
                  <p className="text-xs font-bold text-gray-700">Scan QRIS untuk Bayar Sekarang:</p>
                  <img src={qrisData.qr_image_url} alt="QRIS" className="w-44 h-44 mx-auto rounded-xl border border-gray-200 p-2 bg-white" />
                  <p className="text-base font-black text-blue-600">Rp {submittedOrder.total_amount.toLocaleString('id-ID')}</p>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs text-left">
                  <p className="font-bold">Silakan bayar di Kasir setelah selesai makan.</p>
                  <p className="text-[11px] text-amber-700 mt-1">
                    Sebutkan Nomor Meja {selectedTable?.table_number} ke kasir saat checkout.
                  </p>
                </div>
              )}

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs text-left space-y-2">
                <p className="font-bold text-gray-800">Item Pesanan ({customerName}):</p>
                <div className="space-y-1 divide-y divide-gray-100">
                  {submittedOrder.items?.map((it: any) => (
                    <div key={it.id} className="flex justify-between text-[11px] text-gray-600 pt-1">
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
                setCart([]);
                setQrisData(null);
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors"
            >
              Pesan Menu Lainnya
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            {/* Category scroll */}
            <div className="p-3 border-b border-gray-200 flex space-x-2 overflow-x-auto bg-gray-50/50">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                Semua
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === c.id ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {products
                .filter((p) => selectedCategory === 'all' || p.category_id === selectedCategory)
                .map((p) => {
                  const inCart = cart.find((i) => i.product_id === p.id);
                  return (
                    <div
                      key={p.id}
                      className="p-3 bg-white hover:bg-gray-50/50 rounded-2xl border border-gray-200 flex items-center justify-between space-x-3 transition-colors shadow-2xs"
                    >
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="w-16 h-16 rounded-xl object-cover border border-gray-100 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 text-xs truncate">{p.name}</h4>
                        <p className="text-[10px] text-gray-500 line-clamp-1">{p.description}</p>
                        <span className="font-black text-blue-600 text-xs mt-1 block">
                          Rp {p.base_price.toLocaleString('id-ID')}
                        </span>
                      </div>

                      {inCart ? (
                        <div className="flex items-center space-x-1.5 bg-gray-50 border border-gray-200 rounded-xl p-1 shrink-0">
                          <button
                            onClick={() => updateQuantity(p.id, -1)}
                            className="w-6 h-6 rounded-lg bg-white border border-gray-200 text-gray-700 flex items-center justify-center font-bold text-xs hover:bg-gray-100"
                          >
                            -
                          </button>
                          <span className="text-xs font-black px-1 text-gray-900">{inCart.quantity}</span>
                          <button
                            onClick={() => updateQuantity(p.id, 1)}
                            className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs hover:bg-blue-700"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(p)}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs shrink-0 transition-colors"
                        >
                          + Tambah
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Bottom Checkout Sheet */}
            {cart.length > 0 && (
              <div className="p-4 bg-white border-t border-gray-200 shadow-xl space-y-3">
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Nama Anda (Wajib)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Catatan pesanan (misal: kurangi gula)"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-blue-500"
                  />

                  {/* Payment flow switch */}
                  <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold">
                    <button
                      onClick={() => setPaymentFlow('pay_at_cashier')}
                      className={`flex-1 py-1.5 rounded-lg transition-all ${
                        paymentFlow === 'pay_at_cashier' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500'
                      }`}
                    >
                      Bayar di Kasir
                    </button>
                    <button
                      onClick={() => setPaymentFlow('instant_qris')}
                      className={`flex-1 py-1.5 rounded-lg transition-all ${
                        paymentFlow === 'instant_qris' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-500'
                      }`}
                    >
                      QRIS Langsung
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-wider">Total Tagihan</span>
                    <span className="font-black text-gray-900 text-base">
                      Rp {total.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <button
                    onClick={handleSubmitOrder}
                    disabled={isSubmitting || !customerName}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 flex items-center space-x-1.5 transition-colors"
                  >
                    <span>{isSubmitting ? 'Mengirim...' : 'Kirim Pesanan'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
