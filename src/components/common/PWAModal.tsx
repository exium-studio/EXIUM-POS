import React, { useState, useEffect } from 'react';
import { usePWA } from '../../lib/pwa';
import {
  Smartphone,
  Download,
  HardDrive,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Wifi,
  Sparkles,
  Layers,
  ShieldCheck,
  X,
} from 'lucide-react';

interface PWAModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAModal: React.FC<PWAModalProps> = ({ isOpen, onClose }) => {
  const {
    isInstallable,
    isInstalled,
    isUpdateAvailable,
    isOnline,
    installApp,
    updateApp,
    getCacheSize,
    clearAppCache,
  } = usePWA();

  const [cacheSize, setCacheSize] = useState<string>('Menghitung...');
  const [clearing, setClearing] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      getCacheSize().then(setCacheSize);
    }
  }, [isOpen]);

  const handleClearCache = async () => {
    if (window.confirm('Hapus seluruh cache offline aplikasi? Halaman akan dimuat ulang.')) {
      setClearing(true);
      await clearAppCache();
      window.location.reload();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-100 bg-[#0F172A] text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base tracking-tight text-white">
                Progressive Web App (PWA) Support
              </h3>
              <p className="text-xs text-slate-400">
                Aplikasi Kasir Native Standalone & Offline Mode
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-gray-700">
          {/* Update Banner if available */}
          {isUpdateAvailable && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
              <div>
                <p className="font-bold text-blue-900">Pembaruan Tersedia!</p>
                <p className="text-[11px] text-blue-700 mt-0.5">Versi baru POS telah diunduh di latar belakang.</p>
              </div>
              <button
                onClick={updateApp}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs flex items-center space-x-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload</span>
              </button>
            </div>
          )}

          {/* Installation Status Card */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900 text-sm">Status Instalasi Perangkat</span>
              {isInstalled ? (
                <span className="px-2.5 py-1 bg-green-50 border border-green-200 text-green-700 font-black text-[11px] rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Terpasang (Standalone)
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 font-bold text-[11px] rounded-full">
                  Mode Browser Web
                </span>
              )}
            </div>

            <p className="text-[11px] text-gray-500 leading-relaxed">
              Memasang aplikasi PWA memungkinkan staf kasir menjalankan POS dalam layar penuh tanpa bilah browser (fullscreen standalone), akses cepat dari Home Screen / Desktop, serta keandalan offline tanpa koneksi internet.
            </p>

            {!isInstalled && (
              <button
                onClick={installApp}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs shadow-xs flex items-center justify-center space-x-2 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Pasang Aplikasi POS Sekarang (Install PWA)</span>
              </button>
            )}
          </div>

          {/* PWA Capabilities & Checklist */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider text-gray-400">
              Kapabilitas Offline & Service Worker
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 bg-white rounded-xl border border-gray-200 flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold text-gray-900 block">Service Worker Caching</span>
                  <span className="text-[10px] text-gray-500">Aset static & app shell tersimpan lokal di browser cache</span>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-gray-200 flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold text-gray-900 block">Dexie IndexedDB Engine</span>
                  <span className="text-[10px] text-gray-500">Database offline untuk produk, resep, transaksi & antrian sync</span>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-gray-200 flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold text-gray-900 block">Auto-Sync on Reconnect</span>
                  <span className="text-[10px] text-gray-500">Otomatis kirim data kas saat internet kembali tersambung</span>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-gray-200 flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold text-gray-900 block">Fast Tablet / Touch UX</span>
                  <span className="text-[10px] text-gray-500">Optimasi layout responsif 60fps untuk tablet kasir & KDS monitor</span>
                </div>
              </div>
            </div>
          </div>

          {/* Storage & Maintenance */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <HardDrive className="w-4 h-4 text-gray-500" />
                <span className="font-bold text-gray-800">Estimasi Ruang Penyimpanan Cache</span>
              </div>
              <span className="font-mono font-bold text-gray-900">{cacheSize}</span>
            </div>

            <div className="flex space-x-2 pt-1">
              <button
                onClick={handleClearCache}
                disabled={clearing}
                className="flex-1 py-2 bg-white hover:bg-gray-100 text-red-600 border border-gray-200 rounded-lg text-xs font-bold transition-colors flex items-center justify-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bersihkan Cache Lokal</span>
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-bold transition-colors flex items-center justify-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Muat Ulang Aplikasi</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
