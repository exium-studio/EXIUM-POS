import React from 'react';
import { usePOS } from '../../context/POSContext';
import { usePWA } from '../../lib/pwa';
import { WifiOff, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

export const OfflineSyncBanner: React.FC = () => {
  const { isOffline, pendingSyncCount, triggerSync } = usePOS();
  const { isUpdateAvailable, updateApp } = usePWA();

  if (isUpdateAvailable) {
    return (
      <div className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-blue-200 animate-spin" />
          <span>Pembaruan sistem Nusantara POS tersedia. Klik untuk menerapkan versi terbaru.</span>
        </div>
        <button
          onClick={updateApp}
          className="flex items-center space-x-1 px-3 py-1 bg-white text-blue-900 rounded-lg text-xs font-black hover:bg-blue-50 transition-colors shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Terapkan Pembaruan</span>
        </button>
      </div>
    );
  }

  if (!isOffline && pendingSyncCount === 0) return null;

  return (
    <div
      className={`px-4 py-2 text-xs font-semibold flex items-center justify-between transition-colors ${
        isOffline
          ? 'bg-rose-600 text-white'
          : 'bg-amber-500 text-white shadow-xs'
      }`}
    >
      <div className="flex items-center space-x-2">
        {isOffline ? <WifiOff className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
        <span>
          {isOffline
            ? 'Mode Offline Aktif: Transaksi kasir disimpan secara lokal di IndexedDB dan akan disinkronkan otomatis saat online.'
            : `Koneksi Online Pulih: Ada ${pendingSyncCount} transaksi offline yang siap disinkronkan ke server.`}
        </span>
      </div>

      {!isOffline && pendingSyncCount > 0 && (
        <button
          onClick={triggerSync}
          className="flex items-center space-x-1 px-3 py-1 bg-white text-amber-900 rounded-lg text-xs font-bold hover:bg-amber-50 transition-colors shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sinkronkan Sekarang</span>
        </button>
      )}
    </div>
  );
};

