import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePOS } from '../../context/POSContext';
import {
  Store,
  ChefHat,
  QrCode,
  Clock,
  Coffee,
  Package,
  ShoppingCart,
  Calculator,
  UserCheck,
  Award,
  BarChart3,
  Settings,
  Flame,
} from 'lucide-react';

export type ActiveTab =
  | 'pos'
  | 'kds'
  | 'qr_customer'
  | 'tables'
  | 'shift'
  | 'products'
  | 'stock'
  | 'purchase'
  | 'accounting'
  | 'attendance'
  | 'loyalty'
  | 'dashboard'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { user, hasPermission, branches } = useAuth();
  const { pendingSyncCount } = usePOS();

  const navItems: {
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    category: string;
    show: boolean;
    badge?: string;
  }[] = [
    // Executive Dashboard
    { id: 'dashboard', label: 'Executive Dashboard', icon: BarChart3, category: 'Main Control', show: user?.role_id === 'owner' || user?.role_id === 'manager' },

    // Operasional Kasir & Dapur
    { id: 'pos', label: 'Kasir POS (Omni)', icon: Store, category: 'Operasional', show: hasPermission('pos.access') },
    { id: 'kds', label: 'Kitchen KDS', icon: ChefHat, category: 'Operasional', show: hasPermission('kds.food') || hasPermission('kds.beverage') || user?.role_id === 'owner', badge: 'Live' },
    { id: 'qr_customer', label: 'QR Self-Order', icon: Flame, category: 'Operasional', show: true, badge: 'Live QR' },
    { id: 'tables', label: 'Denah Meja & QR', icon: QrCode, category: 'Operasional', show: hasPermission('pos.access') || user?.role_id === 'owner' },
    { id: 'shift', label: 'Shift & Kas Laci', icon: Clock, category: 'Operasional', show: hasPermission('shift.manage') },

    // Menu, Resep & Stok
    { id: 'products', label: 'Menu & Resep (BOM)', icon: Coffee, category: 'Inventory & BOM', show: user?.role_id === 'owner' || user?.role_id === 'manager' },
    { id: 'stock', label: 'Bahan Baku & Stok', icon: Package, category: 'Inventory & BOM', show: hasPermission('stock.view') },
    { id: 'purchase', label: 'Pembelian (PO)', icon: ShoppingCart, category: 'Inventory & BOM', show: hasPermission('purchase.create') || user?.role_id === 'owner' },

    // Akuntansi, Member & HR
    { id: 'accounting', label: 'Accounting & Pajak', icon: Calculator, category: 'Financial & HR', show: hasPermission('accounting.view') || user?.role_id === 'owner' },
    { id: 'loyalty', label: 'CRM & Loyalty Promo', icon: Award, category: 'Financial & HR', show: user?.role_id === 'owner' || user?.role_id === 'manager' || user?.role_id === 'cashier' },
    { id: 'attendance', label: 'Absensi Karyawan', icon: UserCheck, category: 'Financial & HR', show: true },

    // Pengaturan
    { id: 'settings', label: 'Pengaturan Cabang', icon: Settings, category: 'System', show: hasPermission('settings.manage') || user?.role_id === 'owner' },
  ];

  // Group by category
  const categories = Array.from(new Set(navItems.filter((i) => i.show).map((i) => i.category)));

  const handleItemClick = (id: ActiveTab) => {
    setActiveTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between p-4 gap-2 select-none">
      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto pr-1 space-y-4">
        {categories.map((cat) => {
          const itemsInCat = navItems.filter((item) => item.show && item.category === cat);
          if (itemsInCat.length === 0) return null;

          return (
            <div key={cat} className="space-y-1">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest px-2 mb-1.5">{cat}</p>
              <div className="space-y-1">
                {itemsInCat.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-gray-400 hover:text-white hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            isActive ? 'bg-blue-800 text-blue-100' : 'bg-slate-800 text-blue-400'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Branches Status Quick Summary */}
        <div className="pt-2 border-t border-slate-800/80 px-2">
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-2">Live Outlets</p>
          <div className="space-y-1.5">
            {branches.map((b) => (
              <div key={b.id} className="flex items-center justify-between text-gray-400 text-xs py-1">
                <span className="truncate max-w-[150px]">{b.name}</span>
                <span className="w-2 h-2 bg-green-500 rounded-full shrink-0 shadow-xs" title="Outlet Active" />
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* Storage / System Status Widget */}
      <div className="mt-auto bg-[#0F172A] rounded-xl p-3 border border-slate-800/80">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[11px] font-semibold text-gray-300">Sync Engine</p>
          <span className="text-[10px] font-bold text-green-400 font-mono">100% Ready</span>
        </div>
        <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
          <div className="bg-blue-500 h-full w-[85%] rounded-full transition-all"></div>
        </div>
        <p className="text-[10px] text-gray-400 mt-2 font-medium">
          {pendingSyncCount > 0 ? `${pendingSyncCount} transaksi tertunda` : 'Semua outlet tersinkronisasi'}
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#1E293B] text-slate-300 flex-col shrink-0 border-r border-slate-800">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Sliding Panel */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={onCloseMobile}
          />

          {/* Drawer */}
          <div className="relative w-72 max-w-[85vw] bg-[#1E293B] text-slate-300 h-full flex flex-col z-10 shadow-2xl border-r border-slate-800 animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-lg text-white tracking-tight leading-none px-1">POS</h3>
              </div>
              <button
                onClick={onCloseMobile}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden">{sidebarContent}</div>
          </div>
        </div>
      )}
    </>
  );
};
