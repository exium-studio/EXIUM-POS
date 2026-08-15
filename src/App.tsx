import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { POSProvider, usePOS } from './context/POSContext';
import { Header } from './components/common/Header';
import { Sidebar, ActiveTab } from './components/common/Sidebar';
import { OfflineSyncBanner } from './components/common/OfflineSyncBanner';
import { ReceiptModal } from './components/common/ReceiptModal';
import {
  Store,
  ChefHat,
  QrCode,
  Flame,
  LayoutGrid,
} from 'lucide-react';

// Views
import { POSView } from './views/POSView';
import { KDSView } from './views/KDSView';
import { CustomerQRView } from './views/CustomerQRView';
import { DashboardView } from './views/DashboardView';
import { TableView } from './views/TableView';
import { ShiftView } from './views/ShiftView';
import { ProductsView } from './views/ProductsView';
import { StockView } from './views/StockView';
import { PurchaseView } from './views/PurchaseView';
import { AccountingView } from './views/AccountingView';
import { LoyaltyView } from './views/LoyaltyView';
import { AttendanceView } from './views/AttendanceView';
import { SettingsView } from './views/SettingsView';
import { LoginView } from './views/LoginView';
import { useAuth } from './context/AuthContext';

const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (user?.role_id === 'kitchen_food' || user?.role_id === 'kitchen_beverage') {
      return 'kds';
    }
    return 'pos';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { activeReceiptId, setActiveReceiptId } = usePOS();

  return (
    <div className="flex flex-col h-screen w-full bg-[#F8FAFC] font-sans overflow-hidden select-none">
      {/* Offline Sync Banner */}
      <OfflineSyncBanner />

      {/* Main App Header */}
      <Header
        onOpenShiftModal={() => setActiveTab('shift')}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
      />

      {/* App Body (Sidebar + Active View) */}
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        <main className="flex-1 flex overflow-hidden">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'pos' && <POSView onOpenShiftModal={() => setActiveTab('shift')} />}
          {activeTab === 'kds' && <KDSView />}
          {activeTab === 'qr_customer' && <CustomerQRView />}
          {activeTab === 'tables' && <TableView />}
          {activeTab === 'shift' && <ShiftView />}
          {activeTab === 'products' && <ProductsView />}
          {activeTab === 'stock' && <StockView />}
          {activeTab === 'purchase' && <PurchaseView />}
          {activeTab === 'accounting' && <AccountingView />}
          {activeTab === 'loyalty' && <LoyaltyView />}
          {activeTab === 'attendance' && <AttendanceView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Mobile Bottom Quick Navigation Bar (Phones & Small Screens) */}
      <div className="lg:hidden h-14 bg-[#1E293B] border-t border-slate-800 flex items-center justify-around px-2 z-20 shrink-0">
        <button
          onClick={() => setActiveTab('pos')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'pos' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Store className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Kasir</span>
        </button>

        <button
          onClick={() => setActiveTab('kds')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'kds' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ChefHat className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Dapur KDS</span>
        </button>

        <button
          onClick={() => setActiveTab('tables')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'tables' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Meja & QR</span>
        </button>

        <button
          onClick={() => setActiveTab('qr_customer')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'qr_customer' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Self-Order</span>
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <LayoutGrid className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Semua</span>
        </button>
      </div>

      {/* Global Thermal Receipt & Kitchen Ticket Modal */}
      {activeReceiptId && (
        <ReceiptModal
          transactionId={activeReceiptId}
          onClose={() => setActiveReceiptId(null)}
        />
      )}
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user } = useAuth();
  
  // Check if accessing via table QR code link (Guest customer self-ordering mode)
  const isCustomerSelfOrder = window.location.search.includes('table_token') || window.location.search.includes('table_id');

  if (isCustomerSelfOrder) {
    return (
      <POSProvider>
        <div className="flex flex-col h-screen w-full bg-[#F8FAFC] font-sans overflow-hidden">
          <CustomerQRView />
        </div>
      </POSProvider>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <POSProvider>
      <MainLayout />
    </POSProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

