import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, ProductVariant, CartItemModifier, Member, Shift, Promotion, DiningTable, Order } from '../types';
import { useAuth } from './AuthContext';
import { api, syncOfflineQueueToServer } from '../lib/api';
import { localDB } from '../lib/db';

export interface CartItem {
  id: string; // unique item line id
  product: Product;
  variant?: ProductVariant | null;
  modifiers: CartItemModifier[];
  quantity: number;
  unit_price: number;
  unit_cogs: number;
  subtotal: number;
  notes: string;
}

interface POSContextType {
  cart: CartItem[];
  addToCart: (product: Product, variant?: ProductVariant | null, modifiers?: CartItemModifier[], notes?: string) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  selectedTable: DiningTable | null;
  setSelectedTable: (table: DiningTable | null) => void;
  orderType: 'dine_in' | 'take_away';
  setOrderType: (type: 'dine_in' | 'take_away') => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  selectedMember: Member | null;
  setSelectedMember: (member: Member | null) => void;
  pointsToRedeem: number;
  setPointsToRedeem: (pts: number) => void;
  appliedPromo: Promotion | null;
  setAppliedPromo: (promo: Promotion | null) => void;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  totalAmount: number;
  activeShift: Shift | null;
  refreshShift: () => Promise<void>;
  isOffline: boolean;
  setIsOffline: (val: boolean) => void;
  pendingSyncCount: number;
  triggerSync: () => Promise<void>;
  activeReceiptId: string | null;
  setActiveReceiptId: (id: string | null) => void;
  activeOpenOrder: Order | null;
  setActiveOpenOrder: (order: Order | null) => void;
  openBillsCount: number;
  refreshOpenBillsCount: () => Promise<void>;
  loadOpenBillIntoCart: (order: Order, productsList: Product[], tablesList: DiningTable[]) => void;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export const POSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeBranch, activeBranchId, user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null);
  const [orderType, setOrderType] = useState<'dine_in' | 'take_away'>('dine_in');
  const [customerName, setCustomerName] = useState<string>('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [appliedPromo, setAppliedPromo] = useState<Promotion | null>(null);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [activeReceiptId, setActiveReceiptId] = useState<string | null>(null);
  const [activeOpenOrder, setActiveOpenOrder] = useState<Order | null>(null);
  const [openBillsCount, setOpenBillsCount] = useState<number>(0);

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      triggerSync();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check of pending sync
    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updatePendingCount = async () => {
    try {
      const count = await localDB.sync_queue.where('status').equals('pending').count();
      setPendingSyncCount(count);
    } catch (e) {
      console.error(e);
    }
  };

  const refreshOpenBillsCount = async () => {
    try {
      const bills = await api.get('/pos/open-bills', { branch_id: activeBranchId });
      setOpenBillsCount(Array.isArray(bills) ? bills.length : 0);
    } catch (e) {
      console.error('Error fetching open bills count', e);
    }
  };

  useEffect(() => {
    refreshOpenBillsCount();
  }, [activeBranchId]);

  const triggerSync = async () => {
    try {
      await syncOfflineQueueToServer((remaining) => setPendingSyncCount(remaining));
      await updatePendingCount();
    } catch (e) {
      console.error('Error triggering sync', e);
    }
  };

  const refreshShift = async () => {
    try {
      const res = await api.get('/shifts/active', { branch_id: activeBranchId });
      if (res.active && res.shift) {
        setActiveShift(res.shift);
        await localDB.shifts.put(res.shift);
      } else {
        setActiveShift(null);
      }
    } catch (e) {
      console.error('Error fetching shift', e);
      // Try localDB
      const cached = await localDB.shifts.where('branch_id').equals(activeBranchId).first();
      if (cached && cached.status === 'open') {
        setActiveShift(cached);
      }
    }
  };

  useEffect(() => {
    refreshShift();
  }, [activeBranchId]);

  const addToCart = (product: Product, variant?: ProductVariant | null, modifiers: CartItemModifier[] = [], notes: string = '') => {
    const variantPrice = variant ? variant.additional_price : 0;
    const modifiersPrice = modifiers.reduce((sum, m) => sum + m.price, 0);
    const unitPrice = product.base_price + variantPrice + modifiersPrice;
    const unitCogs = product.cost_price * (variant?.recipe_multiplier || 1.0);

    const modifierKey = modifiers.map((m) => m.id).sort().join(',');
    const lineId = `${product.id}-${variant?.id || 'none'}-${modifierKey}`;

    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.id === lineId && item.notes === notes);
      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        updated[existingIdx].subtotal = updated[existingIdx].quantity * updated[existingIdx].unit_price;
        return updated;
      }
      return [
        ...prev,
        {
          id: lineId,
          product,
          variant: variant || null,
          modifiers,
          quantity: 1,
          unit_price: unitPrice,
          unit_cogs: unitCogs,
          subtotal: unitPrice,
          notes,
        },
      ];
    });
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.id === cartItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0
              ? {
                  ...item,
                  quantity: newQty,
                  subtotal: newQty * item.unit_price,
                }
              : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== cartItemId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedTable(null);
    setCustomerName('');
    setSelectedMember(null);
    setPointsToRedeem(0);
    setAppliedPromo(null);
    setActiveOpenOrder(null);
  };

  const loadOpenBillIntoCart = (order: Order, productsList: Product[], tablesList: DiningTable[]) => {
    // 1. Set Table
    if (order.table_id) {
      const tbl = tablesList.find((t) => t.id === order.table_id);
      setSelectedTable(tbl || null);
    } else {
      setSelectedTable(null);
    }

    // 2. Set Customer details & Order Type
    setCustomerName(order.customer_name || '');
    setOrderType((order.order_type as any) || 'dine_in');
    setActiveOpenOrder(order);

    // 3. Populate Cart Items
    const reconstructedCart: CartItem[] = (order.items || []).map((it) => {
      let product = productsList.find((p) => p.id === it.product_id);
      if (!product) {
        // Fallback placeholder product if not in current loaded list
        product = {
          id: it.product_id,
          code: 'PROD',
          name: it.product_name,
          category_id: 'cat-food',
          base_price: it.unit_price,
          cost_price: it.unit_cogs || 0,
          is_recipe_based: false,
          has_variants: Boolean(it.variant_id),
          is_available: true,
          track_stock: false,
        };
      }

      let variant: ProductVariant | null = null;
      if (it.variant_id && product.variants) {
        variant = product.variants.find((v) => v.id === it.variant_id) || null;
      } else if (it.variant_name) {
        variant = {
          id: it.variant_id || 'var-custom',
          product_id: product.id,
          name: it.variant_name,
          additional_price: 0,
          recipe_multiplier: 1.0,
        };
      }

      const modifierKey = (it.modifiers || []).map((m) => m.id).sort().join(',');
      const lineId = `${product.id}-${variant?.id || 'none'}-${modifierKey}`;

      return {
        id: lineId,
        product,
        variant,
        modifiers: it.modifiers || [],
        quantity: it.quantity,
        unit_price: it.unit_price,
        unit_cogs: it.unit_cogs || 0,
        subtotal: it.subtotal,
        notes: it.notes || '',
      };
    });

    setCart(reconstructedCart);
  };

  // Pricing calculations
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);

  let discountAmount = 0;
  // 1. Promo discount
  if (appliedPromo && subtotal >= appliedPromo.min_order_amount) {
    if (appliedPromo.promo_type === 'percentage_discount') {
      discountAmount += (subtotal * appliedPromo.discount_value) / 100;
    } else if (appliedPromo.promo_type === 'fixed_amount' || appliedPromo.promo_type === 'bogo') {
      discountAmount += appliedPromo.discount_value;
    }
  }

  // 2. Member points discount (1 point = Rp 1.000 discount)
  if (pointsToRedeem > 0) {
    discountAmount += pointsToRedeem * 1000;
  }
  discountAmount = Math.min(discountAmount, subtotal);

  const taxableBase = Math.max(0, subtotal - discountAmount);
  const taxPct = activeBranch?.tax_percentage || 11.0;
  const servicePct = activeBranch?.service_charge_percentage || 0.0;

  const taxAmount = activeBranch?.is_tax_inclusive ? 0 : Math.round((taxableBase * taxPct) / 100);
  const serviceChargeAmount = Math.round((taxableBase * servicePct) / 100);
  const totalAmount = taxableBase + taxAmount + serviceChargeAmount;

  return (
    <POSContext.Provider
      value={{
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
        refreshShift,
        isOffline,
        setIsOffline,
        pendingSyncCount,
        triggerSync,
        activeReceiptId,
        setActiveReceiptId,
        activeOpenOrder,
        setActiveOpenOrder,
        openBillsCount,
        refreshOpenBillsCount,
        loadOpenBillIntoCart,
      }}
    >
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) throw new Error('usePOS must be used within a POSProvider');
  return context;
};
