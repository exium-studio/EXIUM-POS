import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePOS } from '../../context/POSContext';
import { RoleType } from '../../types';
import { usePWA } from '../../lib/pwa';
import { PWAModal } from './PWAModal';
import {
  Building2,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  Shield,
  ChevronDown,
  Smartphone,
  Download,
  Menu,
} from 'lucide-react';

interface HeaderProps {
  onOpenShiftModal?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenShiftModal, onToggleMobileMenu }) => {
  const { branches, activeBranchId, setActiveBranchId, user, logout } = useAuth();
  const { isOffline, setIsOffline, pendingSyncCount, triggerSync, activeShift } = usePOS();
  const { isInstalled, isInstallable, isUpdateAvailable } = usePWA();
  const [isSyncing, setIsSyncing] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPWAModal, setShowPWAModal] = useState(false);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await triggerSync();
    setIsSyncing(false);
  };

  const rolesList: { id: RoleType; label: string }[] = [
    { id: 'owner', label: 'Owner / Direksi (Full Access)' },
    { id: 'manager', label: 'Manajer Cabang' },
    { id: 'cashier', label: 'Kasir Utama' },
    { id: 'kitchen_food', label: 'Dapur Makanan (KDS Food)' },
    { id: 'kitchen_beverage', label: 'Dapur Minuman / Bar (KDS Bar)' },
  ];

  return (
    <>
      <header className="h-16 bg-white border-b border-gray-200 px-3 sm:px-4 md:px-6 flex items-center justify-between z-30 sticky top-0 shrink-0">
        {/* Brand, Mobile Menu Button & Branch Selector */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Mobile Hamburger Drawer Toggle */}
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl text-gray-700 hover:bg-gray-100 active:scale-95 transition-all border border-gray-200 shadow-2xs"
            aria-label="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Brand Name */}
          <div className="flex items-center">
            <h1 className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight leading-none px-1">
              POS
            </h1>
          </div>

          <div className="h-7 w-px bg-gray-200 hidden sm:block" />

          {/* Branch Selector */}
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-2 sm:px-2.5 py-1 sm:py-1.5 space-x-1.5 max-w-[140px] sm:max-w-[220px]">
            <Building2 className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <select
              value={activeBranchId}
              onChange={(e) => setActiveBranchId(e.target.value)}
              className="bg-transparent text-xs sm:text-sm font-bold text-[#1E293B] focus:outline-none cursor-pointer truncate w-full"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Controls: Cloud Sync, Shift, PWA, Role Switcher */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 md:space-x-4">
          {/* PWA App Button */}
          <button
            onClick={() => setShowPWAModal(true)}
            className={`flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold transition-colors border ${
              isUpdateAvailable
                ? 'bg-blue-600 text-white border-blue-700 animate-bounce'
                : isInstalled
                ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
            }`}
            title="Kelola Progressive Web App (PWA) & Offline Cache"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isUpdateAvailable ? 'Update PWA' : isInstalled ? 'PWA Native' : 'Pasang PWA'}</span>
            <span className="sm:hidden">{isInstalled ? 'PWA' : 'App'}</span>
          </button>

          {/* Shift Badge */}
          {activeShift ? (
            <button
              onClick={onOpenShiftModal}
              className="hidden sm:flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-[11px] sm:text-xs font-bold hover:bg-emerald-100 transition-colors"
              title="Klik untuk kelola kas / tutup shift"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Clock className="w-3.5 h-3.5" />
              <span>Shift Aktif</span>
            </button>
          ) : (
            <button
              onClick={onOpenShiftModal}
              className="hidden sm:flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-[11px] sm:text-xs font-bold hover:bg-amber-100 transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Buka Shift</span>
            </button>
          )}

          {/* Cloud Sync Status */}
          <div className="flex items-center gap-1.5 bg-green-50 px-2 sm:px-3 py-1 rounded-full border border-green-200">
            <div className={`w-2 h-2 rounded-full ${isOffline ? 'bg-red-500' : 'bg-green-500'}`} />
            <span className="text-[10px] sm:text-[11px] font-bold text-green-700 uppercase tracking-wider hidden md:inline">
              {isOffline ? 'Offline' : 'Synced'}
            </span>
          </div>

          {/* Offline / Online Quick Toggle */}
          <button
            onClick={() => setIsOffline(!isOffline)}
            className={`flex items-center space-x-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
              isOffline
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
            title="Simulasi koneksi kasir"
          >
            {isOffline ? <WifiOff className="w-3.5 h-3.5 text-red-600" /> : <Wifi className="w-3.5 h-3.5 text-gray-500" />}
            <span className="hidden xl:inline">{isOffline ? 'Offline' : 'Online'}</span>
          </button>

          {pendingSyncCount > 0 && (
            <button
              onClick={handleManualSync}
              disabled={isOffline || isSyncing}
              className="flex items-center space-x-1 px-2 sm:px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
              title="Sinkronkan antrian transaksi"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{pendingSyncCount}</span>
            </button>
          )}

          <div className="h-7 w-px bg-gray-200 hidden md:block"></div>

          {/* User Account & Dropdown */}
          <div className="relative">
            <div
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity"
            >
              <div className="text-right leading-none hidden lg:block">
                <p className="text-xs font-bold text-[#1E293B]">{user?.full_name || 'Administrator'}</p>
                <p className="text-[10px] text-gray-500 font-medium mt-0.5">{user?.role_name || 'Global Admin'}</p>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center font-black text-xs text-blue-700 shadow-2xs">
                {user?.full_name?.charAt(0) || 'A'}
              </div>
            </div>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-xs font-bold text-[#1E293B]">{user?.full_name}</p>
                  <p className="text-[10px] text-gray-500 font-medium mt-0.5">@{user?.username} • {user?.role_name}</p>
                  <p className="text-[9px] text-gray-400 font-mono mt-1 break-all">{user?.email}</p>
                </div>
                <div className="p-2 border-b border-gray-100">
                  <div className="bg-slate-50 rounded-xl p-2.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Hak Akses Aktif</p>
                    <p className="text-[10px] text-slate-600 font-semibold mt-1">
                      {user?.role_id === 'owner' 
                        ? 'Akses Penuh (Full Control)' 
                        : `${user?.permissions?.length || 0} Izin diaktifkan`}
                    </p>
                  </div>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-3 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Keluar dari Sistem</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* PWA Modal */}
      <PWAModal isOpen={showPWAModal} onClose={() => setShowPWAModal(false)} />
    </>
  );
};
