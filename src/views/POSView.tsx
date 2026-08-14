import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePOS, CartItem } from '../context/POSContext';
import { Product, ProductCategory, ProductVariant, CartItemModifier, Member, DiningTable, Order } from '../types';
import { api } from '../lib/api';
import { localDB } from '../lib/db';
import { OpenBillsModal } from '../components/pos/OpenBillsModal';
import { PreBillModal } from '../components/pos/PreBillModal';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  QrCode,
  CreditCard,
  Banknote,
  Percent,
  User,
  Users,
  UtensilsCrossed,
  ShoppingBag,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  Split,
  FileText,
  Bookmark,
  Check,
  ArrowRightLeft,
  X,
} from 'lucide-react';

export const POSView: React.FC<{ onOpenShiftModal: () => void }> = ({ onOpenShiftModal }) => {
  const { activeBranch, activeBranchId, user } = useAuth();
  const {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    selectedTable,
    setSelectedTable,
    orderType,
    setOrderType,
    customerName,
    setCustomerName,
    selectedMember,
    setSelectedMember,
    pointsToRedeem,
    setPointsToRedeem,
    appliedPromo,
    setAppliedPromo,
    subtotal,
    discountAmount,
    taxAmount,
    serviceChargeAmount,
    totalAmount,
    activeShift,
    isOffline,
    setActiveReceiptId,
    activeOpenOrder,
    setActiveOpenOrder,
    openBillsCount,
    refreshOpenBillsCount,
    loadOpenBillIntoCart,
  } = usePOS();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [modifiers, setModifiers] = useState<any[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Open Bills State
  const [showOpenBillsModal, setShowOpenBillsModal] = useState(false);
  const [showPreBillModal, setShowPreBillModal] = useState(false);
  const [preBillOrderId, setPreBillOrderId] = useState<string | null>(null);
  const [isSavingOpenBill, setIsSavingOpenBill] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal states
  const [customizeProduct, setCustomizeProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<CartItemModifier[]>([]);
  const [itemNotes, setItemNotes] = useState<string>('');
  const [mobileTab, setMobileTab] = useState<'menu' | 'cart'>('menu');

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'debit' | 'transfer'>('cash');
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [qrisData, setQrisData] = useState<any>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Member Search
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberPhoneQuery, setMemberPhoneQuery] = useState('');
  const [memberList, setMemberList] = useState<Member[]>([]);

  // Promo Code Modal
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [availablePromos, setAvailablePromos] = useState<any[]>([]);

  // Load Products & Categories
  const loadData = async () => {
    setLoading(true);
    try {
      const [prodsData, catsData, modsData, tablesData] = await Promise.all([
        api.get('/products', { branch_id: activeBranchId }),
        api.get('/products/categories'),
        api.get('/products/modifiers'),
        api.get('/pos/tables', { branch_id: activeBranchId }),
      ]);
      setProducts(prodsData);
      setCategories(catsData);
      setModifiers(modsData);
      setTables(tablesData);

      // Save to localDB for offline cache
      await localDB.products.bulkPut(prodsData);
      await localDB.categories.bulkPut(catsData);
    } catch (e) {
      console.warn('Loading from offline cache...', e);
      const cachedProds = await localDB.products.toArray();
      const cachedCats = await localDB.categories.toArray();
      if (cachedProds.length > 0) setProducts(cachedProds);
      if (cachedCats.length > 0) setCategories(cachedCats);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBranchId]);

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategoryId === 'all' || p.category_id === selectedCategoryId;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleProductClick = (product: Product) => {
    if (product.has_variants || product.is_recipe_based) {
      setCustomizeProduct(product);
      setSelectedVariant(product.variants && product.variants.length > 0 ? product.variants[0] : null);
      setSelectedModifiers([]);
      setItemNotes('');
    } else {
      addToCart(product, null, [], '');
    }
  };

  const handleConfirmCustomize = () => {
    if (!customizeProduct) return;
    addToCart(customizeProduct, selectedVariant, selectedModifiers, itemNotes);
    setCustomizeProduct(null);
  };

  const toggleModifier = (mod: any) => {
    const exists = selectedModifiers.some((m) => m.id === mod.id);
    if (exists) {
      setSelectedModifiers(selectedModifiers.filter((m) => m.id !== mod.id));
    } else {
      setSelectedModifiers([
        ...selectedModifiers,
        {
          id: mod.id,
          name: mod.name,
          price: mod.price,
          ingredient_id: mod.ingredient_id,
          ingredient_qty: mod.ingredient_qty,
        },
      ]);
    }
  };

  // Payment Quick Amounts
  const quickCashOptions = [
    totalAmount,
    Math.ceil(totalAmount / 10000) * 10000,
    Math.ceil(totalAmount / 50000) * 50000,
    100000,
    200000,
  ].filter((v, i, a) => v >= totalAmount && a.indexOf(v) === i);

  // Generate QRIS when QRIS tab is selected in payment modal
  const handleSelectQRIS = async () => {
    setPaymentMethod('qris');
    try {
      const qris = await api.post('/pos/payment/qris', {
        amount: totalAmount,
        customer_name: customerName || 'Customer POS',
      });
      setQrisData(qris);
    } catch (e) {
      console.error(e);
    }
  };

  // Save or Update Open Bill (Hold Bill & send to kitchen)
  const handleSaveOpenBill = async () => {
    if (!activeShift) {
      alert('Shift kasir belum dibuka. Harap buka shift terlebih dahulu!');
      onOpenShiftModal();
      return;
    }

    if (cart.length === 0) {
      alert('Keranjang masih kosong. Tambahkan menu terlebih dahulu untuk membuat Open Bill.');
      return;
    }

    setIsSavingOpenBill(true);
    try {
      const orderPayload = {
        order_id: activeOpenOrder ? activeOpenOrder.id : undefined,
        branch_id: activeBranchId,
        shift_id: activeShift.id,
        table_id: selectedTable ? selectedTable.id : null,
        customer_name: customerName || (selectedTable ? `Tamu Meja ${selectedTable.table_number}` : 'Tamu'),
        order_source: 'pos_cashier',
        order_type: orderType,
        items: cart.map((c) => ({
          id: c.id,
          product_id: c.product.id,
          variant_id: c.variant ? c.variant.id : null,
          product_name: c.product.name,
          variant_name: c.variant ? c.variant.name : null,
          quantity: c.quantity,
          unit_price: c.unit_price,
          unit_cogs: c.unit_cogs,
          subtotal: c.subtotal,
          notes: c.notes,
          modifiers: c.modifiers,
          kitchen_station: c.product.category_id === 'cat-food' || c.product.category_id === 'cat-snack' ? 'food' : 'beverage',
        })),
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        service_charge_amount: serviceChargeAmount,
        member_id: selectedMember ? selectedMember.id : null,
        points_used: pointsToRedeem,
        user_id: user?.id,
      };

      const savedOrder = await api.post('/pos/open-bills', orderPayload);

      setToastMessage(`Open Bill ${savedOrder.order_number || ''} berhasil disimpan & dikirim ke KDS Dapur!`);
      setTimeout(() => setToastMessage(null), 4000);

      clearCart();
      await refreshOpenBillsCount();
      await loadData();
    } catch (err: any) {
      alert('Gagal menyimpan Open Bill: ' + err.message);
    } finally {
      setIsSavingOpenBill(false);
    }
  };

  const handleLoadBillFromModal = (order: Order) => {
    loadOpenBillIntoCart(order, products, tables);
    setMobileTab('cart');
    setToastMessage(`Tagihan ${order.order_number} dimuat ke keranjang.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSettleBillFromModal = (order: Order) => {
    loadOpenBillIntoCart(order, products, tables);
    setMobileTab('cart');
    setCashGiven(order.total_amount);
    setShowPaymentModal(true);
  };

  const handlePrintPreBillFromModal = (order: Order) => {
    setPreBillOrderId(order.id);
    setShowPreBillModal(true);
  };

  // Submit Order & Process Payment
  const handleProcessTransaction = async () => {
    if (!activeShift) {
      alert('Shift kasir belum dibuka. Harap buka shift terlebih dahulu!');
      onOpenShiftModal();
      return;
    }

    if (cart.length === 0) return;

    setIsProcessingPayment(true);
    const clientUuid = `client-trx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const changeAmt = paymentMethod === 'cash' ? Math.max(0, cashGiven - totalAmount) : 0;

    const orderPayload = {
      order_id: activeOpenOrder ? activeOpenOrder.id : undefined,
      client_uuid: activeOpenOrder ? activeOpenOrder.id : `ord-${clientUuid}`,
      branch_id: activeBranchId,
      shift_id: activeShift.id,
      table_id: selectedTable ? selectedTable.id : null,
      customer_name: customerName || 'Guest',
      order_source: 'pos_cashier',
      order_type: orderType,
      items: cart.map((c) => ({
        product_id: c.product.id,
        variant_id: c.variant ? c.variant.id : null,
        product_name: c.product.name,
        variant_name: c.variant ? c.variant.name : null,
        quantity: c.quantity,
        unit_price: c.unit_price,
        unit_cogs: c.unit_cogs,
        subtotal: c.subtotal,
        notes: c.notes,
        modifiers: c.modifiers,
        kitchen_station: c.product.category_id === 'cat-food' || c.product.category_id === 'cat-snack' ? 'food' : 'beverage',
      })),
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      service_charge_amount: serviceChargeAmount,
      member_id: selectedMember ? selectedMember.id : null,
      points_used: pointsToRedeem,
      user_id: user?.id,
    };

    const trxPayload = {
      client_uuid: clientUuid,
      order_id: activeOpenOrder ? activeOpenOrder.id : `ord-${clientUuid}`,
      branch_id: activeBranchId,
      shift_id: activeShift.id,
      total_amount: totalAmount,
      paid_amount: paymentMethod === 'cash' ? cashGiven || totalAmount : totalAmount,
      change_amount: changeAmt,
      payment_method: paymentMethod,
      payment_gateway_ref: qrisData ? qrisData.transaction_id : null,
      is_offline_sync: isOffline,
      user_id: user?.id,
    };

    try {
      if (isOffline) {
        // Save to offline sync queue in IndexedDB
        await localDB.sync_queue.add({
          id: `queue-${clientUuid}-1`,
          action: 'create_order',
          client_uuid: activeOpenOrder ? activeOpenOrder.id : `ord-${clientUuid}`,
          payload: orderPayload,
          status: 'pending',
          timestamp: new Date().toISOString(),
        });

        await localDB.sync_queue.add({
          id: `queue-${clientUuid}-2`,
          action: 'create_transaction',
          client_uuid: clientUuid,
          payload: trxPayload,
          status: 'pending',
          timestamp: new Date().toISOString(),
        });

        alert('Transaksi berhasil dicatat secara OFFLINE. Data akan disinkronkan otomatis saat online.');
        setActiveReceiptId(clientUuid);
      } else {
        // Online direct API
        if (activeOpenOrder) {
          // Finalize open bill changes before paying
          await api.post('/pos/open-bills', orderPayload);
          trxPayload.order_id = activeOpenOrder.id;
        } else {
          const orderRes = await api.post('/pos/orders', orderPayload);
          trxPayload.order_id = orderRes.id;
        }
        const trxRes = await api.post('/pos/transactions', trxPayload);
        setActiveReceiptId(trxRes.transaction.id);
      }

      // Reset cart and modal
      clearCart();
      setShowPaymentModal(false);
      setCashGiven(0);
      setQrisData(null);
      await refreshOpenBillsCount();
      await loadData();
    } catch (err: any) {
      alert('Gagal memproses transaksi: ' + err.message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Search Members
  const handleSearchMember = async () => {
    try {
      const res = await api.get('/loyalty/members', { q: memberPhoneQuery });
      setMemberList(res);
    } catch (e) {
      console.error(e);
    }
  };

  // Load Promos
  const handleOpenPromoModal = async () => {
    try {
      const res = await api.get('/loyalty/promotions');
      setAvailablePromos(res);
      setShowPromoModal(true);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#F8FAFC] relative">
      {/* Toast Notification for Open Bill actions */}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700 flex items-center space-x-2 animate-in slide-in-from-top-4 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-gray-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mobile Top View Switcher (Phones & Small Tablets) */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-3 py-2 flex items-center gap-2 shrink-0">
        <button
          onClick={() => setMobileTab('menu')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'menu'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <UtensilsCrossed className="w-3.5 h-3.5" />
          <span>Katalog ({filteredProducts.length})</span>
        </button>
        <button
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 relative ${
            mobileTab === 'cart'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Pesanan ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
          {cart.length > 0 && (
            <span className="text-[10px] font-mono bg-amber-400 text-slate-900 px-1.5 py-0.2 rounded-full font-black">
              Rp {totalAmount >= 1000 ? `${Math.round(totalAmount / 1000)}k` : totalAmount}
            </span>
          )}
        </button>
        <button
          onClick={() => setShowOpenBillsModal(true)}
          className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0"
        >
          <FileText className="w-3.5 h-3.5 text-amber-600" />
          <span>Bill ({openBillsCount})</span>
        </button>
      </div>

      {/* Left: Product Catalog & Touch Screen Grid */}
      <div
        className={`flex-1 flex-col overflow-hidden p-2.5 sm:p-4 md:p-5 space-y-3 sm:space-y-4 relative ${
          mobileTab === 'menu' ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {/* Top Filter Bar: Search, Categories, Tables & Open Bills Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 bg-white p-2.5 sm:p-3 rounded-2xl border border-gray-200 shadow-2xs">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari menu, SKU, atau kategori..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs md:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
            />
          </div>

          {/* Table Selector & Open Bills Quick Button */}
          <div className="flex items-center space-x-2">
            <select
              value={selectedTable?.id || ''}
              onChange={(e) => {
                const tbl = tables.find((t) => t.id === e.target.value);
                setSelectedTable(tbl || null);
              }}
              className="flex-1 sm:w-auto bg-gray-50 border border-gray-200 text-xs md:text-sm font-bold rounded-xl px-3 py-2 text-[#1E293B] focus:outline-none cursor-pointer"
            >
              <option value="">-- Pilih Meja --</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  Meja {t.table_number} ({t.zone}) {t.occupied ? '🔴' : '🟢'}
                </option>
              ))}
            </select>

            {/* Desktop Open Bills Button */}
            <button
              onClick={() => setShowOpenBillsModal(true)}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all whitespace-nowrap"
              title="Daftar Open Bill (Tagihan Berjalan)"
            >
              <FileText className="w-4 h-4" />
              <span>Open Bill ({openBillsCount})</span>
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedCategoryId('all')}
            className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategoryId === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            Semua Menu
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategoryId(c.id)}
              className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategoryId === c.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3.5 pr-1 pb-16 lg:pb-0">
          {filteredProducts.map((p) => {
            const isOutOfStock = (p.stock_in_branch || 0) <= 0;
            return (
              <div
                key={p.id}
                onClick={() => !isOutOfStock && handleProductClick(p)}
                className={`bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs hover:shadow-md active:scale-98 transition-all cursor-pointer flex flex-col justify-between group ${
                  isOutOfStock ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500'
                }`}
              >
                <div className="relative h-24 sm:h-32 bg-gray-100 overflow-hidden">
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  {p.is_recipe_based && (
                    <span className="absolute top-1.5 left-1.5 bg-[#1E293B]/90 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs">
                      BOM Resep
                    </span>
                  )}
                  {isOutOfStock ? (
                    <span className="absolute top-1.5 right-1.5 bg-red-600 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                      Habis
                    </span>
                  ) : (
                    <span className="absolute top-1.5 right-1.5 bg-green-600/90 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs">
                      Stok: {p.stock_in_branch}
                    </span>
                  )}
                </div>

                <div className="p-2.5 sm:p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-[#1E293B] text-xs sm:text-sm line-clamp-1 leading-snug">{p.name}</h4>
                    <p className="text-[9px] sm:text-[10px] text-gray-400 font-mono mt-0.5">{p.code}</p>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="font-black text-[#1E293B] text-xs sm:text-sm">
                      Rp {p.base_price.toLocaleString('id-ID')}
                    </span>
                    <button className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs sm:text-sm hover:bg-blue-600 hover:text-white transition-colors">
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Floating Cart Summary Button */}
        {cart.length > 0 && mobileTab === 'menu' && (
          <div className="lg:hidden absolute bottom-3 left-3 right-3 z-20">
            <button
              onClick={() => setMobileTab('cart')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between active:scale-98 transition-all"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 bg-blue-800 rounded-xl flex items-center justify-center font-bold text-xs">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </div>
                <div className="text-left leading-tight">
                  <p className="text-[11px] text-blue-100 font-medium">Keranjang Pesanan</p>
                  <p className="font-black text-sm">Rp {totalAmount.toLocaleString('id-ID')}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1 font-bold text-xs bg-white/20 px-3 py-1.5 rounded-xl">
                <span>Lihat Pesanan</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Right: Cart & Checkout Summary */}
      <div
        className={`w-full lg:w-96 bg-white border-l border-gray-200 flex-col justify-between shadow-sm shrink-0 overflow-hidden ${
          mobileTab === 'cart' ? 'flex flex-1' : 'hidden lg:flex'
        }`}
      >
        {/* Order Meta Header */}
        <div className="p-3 sm:p-4 border-b border-gray-200 bg-gray-50/50 space-y-2.5 sm:space-y-3">
          {/* Mobile Back Button to Catalog */}
          <div className="lg:hidden flex items-center justify-between pb-2 border-b border-gray-200">
            <button
              onClick={() => setMobileTab('menu')}
              className="text-xs font-bold text-blue-600 flex items-center space-x-1"
            >
              <span>← Tambah Menu Lain</span>
            </button>
            <span className="text-xs font-bold text-gray-500">
              {cart.reduce((s, i) => s + i.quantity, 0)} Item Terpilih
            </span>
          </div>

          {/* Active Open Bill Alert Banner */}
          {activeOpenOrder && (
            <div className="bg-amber-500/10 border border-amber-300 p-2.5 rounded-xl space-y-1.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs font-black text-amber-950">
                    Open Bill: {activeOpenOrder.order_number}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      setPreBillOrderId(activeOpenOrder.id);
                      setShowPreBillModal(true);
                    }}
                    className="px-2 py-0.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold shadow-2xs flex items-center gap-1"
                    title="Cetak Tagihan Sementara"
                  >
                    <Printer className="w-3 h-3" />
                    <span>Pre-Bill</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Batal mengedit open bill ini dan buat pesanan baru?')) {
                        clearCart();
                      }
                    }}
                    className="px-2 py-0.5 bg-amber-200 hover:bg-amber-300 text-amber-950 rounded-lg text-[10px] font-bold"
                  >
                    Batal Edit
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-amber-800 font-medium">
                {selectedTable ? `Meja ${selectedTable.table_number}` : 'Take Away'} • {customerName || 'Pelanggan'}
              </p>
            </div>
          )}

          {/* Order Type & Table */}
          <div className="flex items-center justify-between">
            <div className="flex bg-gray-200/80 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setOrderType('dine_in')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                  orderType === 'dine_in' ? 'bg-white text-[#1E293B] shadow-2xs font-bold' : 'text-gray-500'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>Dine In</span>
              </button>
              <button
                onClick={() => setOrderType('take_away')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                  orderType === 'take_away' ? 'bg-white text-[#1E293B] shadow-2xs font-bold' : 'text-gray-500'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Take Away</span>
              </button>
            </div>

            {selectedTable && (
              <span className="text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg font-mono">
                Meja {selectedTable.table_number}
              </span>
            )}
          </div>

          {/* Customer & Member Details */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Nama Pelanggan (opsional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setShowMemberModal(true)}
              className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center space-x-1 ${
                selectedMember
                  ? 'bg-blue-50 border-blue-300 text-blue-800'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
              title="Lookup Member Loyalty"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">{selectedMember ? selectedMember.name.split(' ')[0] : 'Member'}</span>
            </button>
          </div>

          {selectedMember && (
            <div className="flex items-center justify-between text-[11px] bg-blue-50/70 p-2.5 rounded-xl border border-blue-200 text-blue-900">
              <div>
                <span className="font-bold">{selectedMember.name}</span> ({selectedMember.tier})
                <p className="text-[10px] text-blue-700">{selectedMember.points} Poin Tersedia</p>
              </div>
              {selectedMember.points > 0 && pointsToRedeem === 0 && (
                <button
                  onClick={() => setPointsToRedeem(Math.min(selectedMember.points, Math.floor(subtotal / 1000)))}
                  className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold hover:bg-blue-700"
                >
                  Tukar Poin
                </button>
              )}
              {pointsToRedeem > 0 && (
                <button
                  onClick={() => setPointsToRedeem(0)}
                  className="text-red-600 font-bold text-[10px] hover:underline"
                >
                  Batal Tukar
                </button>
              )}
            </div>
          )}
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-3.5 space-y-2.5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs space-y-2 py-12">
              <ShoppingBag className="w-12 h-12 text-gray-300" />
              <p className="font-bold text-[#1E293B]">Keranjang masih kosong</p>
              <p className="text-[11px] text-gray-400 text-center max-w-[200px]">
                Pilih menu di katalog untuk menambahkan item ke pesanan.
              </p>
              <button
                onClick={() => setMobileTab('menu')}
                className="lg:hidden mt-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl"
              >
                Buka Katalog Menu
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="bg-gray-50/80 p-3 rounded-2xl border border-gray-200 flex flex-col space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-bold text-[#1E293B] text-xs leading-tight">{item.product.name}</h5>
                    {item.variant && (
                      <span className="text-[10px] font-bold text-blue-700">{item.variant.name} </span>
                    )}
                    {item.modifiers.length > 0 && (
                      <p className="text-[10px] text-gray-500">
                        + {item.modifiers.map((m) => m.name).join(', ')}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-[10px] text-gray-400 italic">"{item.notes}"</p>
                    )}
                  </div>
                  <span className="font-black text-[#1E293B] text-xs">
                    Rp {item.subtotal.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-gray-200">
                  <span className="text-[10px] text-gray-400 font-mono">
                    @ Rp {item.unit_price.toLocaleString('id-ID')}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-6 h-6 rounded-lg bg-white border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-100 font-bold text-xs"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-black text-[#1E293B] px-1.5">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-6 h-6 rounded-lg bg-white border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-100 font-bold text-xs"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="w-6 h-6 rounded-lg text-red-500 hover:bg-red-50 flex items-center justify-center ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bill Summary & Payment Trigger */}
        <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50 space-y-2.5">
          {/* Promo Button */}
          <div className="flex items-center justify-between text-xs">
            <button
              onClick={handleOpenPromoModal}
              className="text-blue-600 font-bold flex items-center space-x-1 hover:underline text-[11px]"
            >
              <Percent className="w-3.5 h-3.5" />
              <span>{appliedPromo ? `Promo: ${appliedPromo.code}` : 'Gunakan Voucher Promo'}</span>
            </button>
            {appliedPromo && (
              <button onClick={() => setAppliedPromo(null)} className="text-[10px] text-red-600 font-semibold">
                Hapus
              </button>
            )}
          </div>

          {/* Pricing Breakdown */}
          <div className="space-y-1 text-xs text-gray-600 border-t border-gray-200 pt-2.5">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-gray-800">Rp {subtotal.toLocaleString('id-ID')}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-700 font-bold">
                <span>Diskon / Promo</span>
                <span>- Rp {discountAmount.toLocaleString('id-ID')}</span>
              </div>
            )}
            {taxAmount > 0 && (
              <div className="flex justify-between text-[11px] text-gray-500">
                <span>PB1 / PPN (11%)</span>
                <span>Rp {taxAmount.toLocaleString('id-ID')}</span>
              </div>
            )}
            {serviceChargeAmount > 0 && (
              <div className="flex justify-between text-[11px] text-gray-500">
                <span>Service Charge</span>
                <span>Rp {serviceChargeAmount.toLocaleString('id-ID')}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-[#1E293B] pt-2 border-t border-gray-200">
              <span>Total Bayar</span>
              <span className="text-lg sm:text-xl font-black text-[#1E293B]">
                Rp {totalAmount.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center space-x-2">
              <button
                onClick={clearCart}
                disabled={cart.length === 0}
                className="p-3 rounded-xl border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40"
                title="Kosongkan Keranjang"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Open Bill (Simpan Pesanan / Hold Bill) Button */}
              <button
                onClick={handleSaveOpenBill}
                disabled={cart.length === 0 || isSavingOpenBill}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center space-x-1.5 transition-all disabled:opacity-40"
                title="Simpan pesanan ke meja tanpa langsung bayar"
              >
                <Bookmark className="w-4 h-4" />
                <span>{activeOpenOrder ? 'Perbarui Open Bill' : 'Open Bill (Simpan)'}</span>
              </button>

              {/* Bayar Langsung Button */}
              <button
                onClick={() => {
                  if (!activeShift) {
                    alert('Harap buka shift kasir terlebih dahulu!');
                    onOpenShiftModal();
                    return;
                  }
                  setCashGiven(totalAmount);
                  setShowPaymentModal(true);
                }}
                disabled={cart.length === 0}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 flex items-center justify-center space-x-1.5 transition-all disabled:opacity-40"
              >
                <span>Bayar Pesanan</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Customize Variant & Modifiers */}
      {customizeProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="font-bold text-[#1E293B] text-base">{customizeProduct.name}</h3>
                <p className="text-xs text-gray-500">Pilih varian & kustomisasi resep</p>
              </div>
              <button onClick={() => setCustomizeProduct(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200">
                ✕
              </button>
            </div>

            <div className="p-4 max-h-[70vh] overflow-y-auto space-y-4">
              {/* Variants */}
              {customizeProduct.variants && customizeProduct.variants.length > 0 && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Varian Ukuran / Suhu
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {customizeProduct.variants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariant(v)}
                        className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-start transition-all ${
                          selectedVariant?.id === v.id
                            ? 'bg-blue-50 border-blue-600 text-blue-900 font-bold'
                            : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span>{v.name}</span>
                        <span className="text-[10px] text-blue-700 font-mono mt-0.5">
                          {v.additional_price > 0 ? `+Rp ${v.additional_price.toLocaleString('id-ID')}` : 'Standar'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Modifiers */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Tambahan / Modifiers
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {modifiers.map((m) => {
                    const isSelected = selectedModifiers.some((sm) => sm.id === m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggleModifier(m)}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold'
                            : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span>{m.name}</span>
                        <span className="text-[10px] text-gray-500">+Rp {m.price.toLocaleString('id-ID')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                  Catatan Khusus (Dapur / Bar)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Less sugar, extra ice, pisahkan sambal..."
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:bg-white"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Harga Item</span>
                <span className="font-black text-[#1E293B] text-base">
                  Rp{' '}
                  {(
                    customizeProduct.base_price +
                    (selectedVariant?.additional_price || 0) +
                    selectedModifiers.reduce((s, m) => s + m.price, 0)
                  ).toLocaleString('id-ID')}
                </span>
              </div>
              <button
                onClick={handleConfirmCustomize}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20"
              >
                Tambahkan ke Pesanan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Payment Checkout */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="font-bold text-[#1E293B] text-base">Pembayaran Transaksi</h3>
                <p className="text-xs text-gray-500">Pilih metode pembayaran & cetak struk</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200">
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Payment Methods */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-2.5 sm:p-3 rounded-xl border flex flex-col items-center space-y-1 transition-all ${
                    paymentMethod === 'cash' ? 'bg-blue-50 border-blue-600 text-blue-950 font-bold shadow-xs' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Banknote className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs">Tunai (Cash)</span>
                </button>
                <button
                  onClick={handleSelectQRIS}
                  className={`p-2.5 sm:p-3 rounded-xl border flex flex-col items-center space-y-1 transition-all ${
                    paymentMethod === 'qris' ? 'bg-blue-50 border-blue-600 text-blue-950 font-bold shadow-xs' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <QrCode className="w-5 h-5 text-blue-600" />
                  <span className="text-xs">QRIS Dinamis</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('debit')}
                  className={`p-2.5 sm:p-3 rounded-xl border flex flex-col items-center space-y-1 transition-all ${
                    paymentMethod === 'debit' ? 'bg-blue-50 border-blue-600 text-blue-950 font-bold shadow-xs' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  <span className="text-xs">Kartu Debit</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('transfer')}
                  className={`p-2.5 sm:p-3 rounded-xl border flex flex-col items-center space-y-1 transition-all ${
                    paymentMethod === 'transfer' ? 'bg-blue-50 border-blue-600 text-blue-950 font-bold shadow-xs' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Banknote className="w-5 h-5 text-amber-600" />
                  <span className="text-xs">Transfer Bank</span>
                </button>
              </div>

              {/* Total Tagihan Box */}
              <div className="bg-[#1E293B] text-white p-4 rounded-xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-xs text-gray-400 block font-medium">Total Tagihan</span>
                  <span className="text-2xl font-black font-mono text-white">
                    Rp {totalAmount.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="text-right text-xs text-gray-300">
                  <p className="font-semibold">{orderType === 'dine_in' ? `Dine In ${selectedTable ? `(Meja ${selectedTable.table_number})` : ''}` : 'Take Away'}</p>
                  <p className="text-[11px] text-gray-400">{customerName || 'Guest Customer'}</p>
                </div>
              </div>

              {/* Cash Input & Suggestions */}
              {paymentMethod === 'cash' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                      Uang Diterima (Rp)
                    </label>
                    <input
                      type="number"
                      value={cashGiven || ''}
                      onChange={(e) => setCashGiven(Number(e.target.value))}
                      className="w-full text-lg font-bold p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Quick Cash Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {quickCashOptions.map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setCashGiven(amt)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-900 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 transition-colors"
                      >
                        {amt === totalAmount ? 'Uang Pas' : `Rp ${amt.toLocaleString('id-ID')}`}
                      </button>
                    ))}
                  </div>

                  {/* Change calculation */}
                  <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-bold text-green-900">Kembalian</span>
                    <span className="text-base font-black text-green-700 font-mono">
                      Rp {Math.max(0, cashGiven - totalAmount).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              )}

              {/* Dynamic QRIS Box */}
              {paymentMethod === 'qris' && qrisData && (
                <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                  <div className="p-3 bg-white rounded-2xl shadow-xs border border-gray-200">
                    <img src={qrisData.qr_image_url} alt="QRIS Code" className="w-44 h-44 object-contain" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-[#1E293B]">Scan via BCA, GoPay, OVO, ShopeePay, Dana</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-mono">Ref: {qrisData.transaction_id}</p>
                  </div>
                  <button
                    onClick={handleProcessTransaction}
                    className="text-xs text-green-700 font-bold bg-green-100 hover:bg-green-200 px-3.5 py-2 rounded-xl flex items-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simulasikan Webhook Sukses (Test)</span>
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end space-x-2">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleProcessTransaction}
                disabled={isProcessingPayment || (paymentMethod === 'cash' && cashGiven < totalAmount)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 flex items-center space-x-1.5 disabled:opacity-50"
              >
                {isProcessingPayment ? <span>Memproses...</span> : <span>Selesaikan Pembayaran & Cetak</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Member Lookup */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-[#1E293B] text-base">Cari Member Loyalty</h3>
              <button onClick={() => setShowMemberModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200">
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Ketik nomor HP atau nama member..."
                  value={memberPhoneQuery}
                  onChange={(e) => setMemberPhoneQuery(e.target.value)}
                  className="flex-1 p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800"
                />
                <button
                  onClick={handleSearchMember}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Cari
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {memberList.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedMember(m);
                      setCustomerName(m.name);
                      setShowMemberModal(false);
                    }}
                    className="p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-xl cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="font-bold text-[#1E293B] text-xs">{m.name}</p>
                      <p className="text-[10px] text-gray-500 font-mono">{m.phone}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-blue-700">{m.points} Poin</span>
                      <span className="block text-[10px] text-gray-400">{m.tier}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Voucher Promosi */}
      {showPromoModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-[#1E293B] text-base">Pilih Voucher Promosi</h3>
              <button onClick={() => setShowPromoModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200">
                ✕
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
              {availablePromos.map((promo) => (
                <div
                  key={promo.id}
                  onClick={() => {
                    setAppliedPromo(promo);
                    setShowPromoModal(false);
                  }}
                  className="p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-xl cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div>
                    <span className="font-bold text-blue-800 text-xs bg-blue-100 px-2 py-0.5 rounded">
                      {promo.code}
                    </span>
                    <p className="text-xs font-bold text-[#1E293B] mt-1">{promo.name}</p>
                    <p className="text-[10px] text-gray-400">Min. Pembelian: Rp {promo.min_order_amount.toLocaleString('id-ID')}</p>
                  </div>
                  <span className="text-xs font-bold text-green-700">
                    {promo.promo_type === 'percentage_discount' ? `${promo.discount_value}% OFF` : `Potongan Rp ${promo.discount_value.toLocaleString('id-ID')}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* MODAL: Open Bills (Daftar Tagihan Berjalan) */}
      {showOpenBillsModal && (
        <OpenBillsModal
          onClose={() => {
            setShowOpenBillsModal(false);
            refreshOpenBillsCount();
          }}
          onLoadBill={handleLoadBillFromModal}
          onSettleBill={handleSettleBillFromModal}
          onPrintPreBill={handlePrintPreBillFromModal}
          tables={tables}
        />
      )}

      {/* MODAL: Pre-Bill (Tagihan Sementara) Preview & Print */}
      {showPreBillModal && preBillOrderId && (
        <PreBillModal
          orderId={preBillOrderId}
          onClose={() => {
            setShowPreBillModal(false);
            setPreBillOrderId(null);
          }}
          onPayNow={() => {
            // Find order if in open bills
            setShowPreBillModal(false);
            setShowPaymentModal(true);
          }}
        />
      )}
    </div>
  );
};
