import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePWA } from '../lib/pwa';
import { api } from '../lib/api';
import {
  Settings,
  Building2,
  Printer,
  Percent,
  ShieldCheck,
  RefreshCw,
  Smartphone,
  HardDrive,
  Trash2,
  CheckCircle2,
  Download,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { activeBranch, activeBranchId, refreshBranches } = useAuth();
  const { isInstallable, isInstalled, isUpdateAvailable, installApp, updateApp, getCacheSize, clearAppCache } = usePWA();
  
  const [taxPct, setTaxPct] = useState<number>(11);
  const [servicePct, setServicePct] = useState<number>(0);
  const [isTaxInclusive, setIsTaxInclusive] = useState<boolean>(false);
  const [receiptFooter, setReceiptFooter] = useState<string>('Terima Kasih Atas Kunjungan Anda!\nFollow Instagram kami @omnipos');
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('80mm');
  const [cacheSize, setCacheSize] = useState<string>('Menghitung...');
  const [saving, setSaving] = useState<boolean>(false);
  const [clearing, setClearing] = useState<boolean>(false);

  useEffect(() => {
    if (activeBranch) {
      setTaxPct(activeBranch.tax_percentage || 11);
      setServicePct(activeBranch.service_charge_percentage || 0);
      setIsTaxInclusive(activeBranch.is_tax_inclusive || false);
    }
    getCacheSize().then(setCacheSize);
  }, [activeBranch]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.put(`/branches/${activeBranchId}`, {
        tax_percentage: Number(taxPct),
        service_charge_percentage: Number(servicePct),
        is_tax_inclusive: isTaxInclusive,
      });
      alert('Pengaturan outlet cabang berhasil diperbarui!');
      refreshBranches();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async () => {
    if (window.confirm('Bersihkan seluruh cache aplikasi offline? Halaman akan dimuat ulang.')) {
      setClearing(true);
      await clearAppCache();
      window.location.reload();
    }
  };

  return (
    <div className="flex-1 bg-[#F8FAFC] overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-gray-900 tracking-tight">Pengaturan Outlet, PWA & Sistem</h2>
        <p className="text-xs text-gray-500 font-medium mt-0.5">
          Atur persentase pajak restoran PB1, service charge, status PWA offline, dan parameter printer struk kasir
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
        {/* Branch Tax & Service Charge Configuration */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-5">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h4 className="font-bold text-gray-900 text-sm">Konfigurasi Outlet: {activeBranch?.name}</h4>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Pajak Restoran PB1 / PPN (%):</label>
              <input
                type="number"
                value={taxPct}
                onChange={(e) => setTaxPct(Number(e.target.value))}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Service Charge (%):</label>
              <input
                type="number"
                value={servicePct}
                onChange={(e) => setServicePct(Number(e.target.value))}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center space-x-3 pt-1">
              <input
                type="checkbox"
                id="taxInclusive"
                checked={isTaxInclusive}
                onChange={(e) => setIsTaxInclusive(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="taxInclusive" className="font-semibold text-gray-700 cursor-pointer">
                Harga Menu Sudah Termasuk Pajak (Tax Inclusive / Nett Price)
              </label>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors"
              >
                {saving ? 'Menyimpan...' : 'Simpan Pengaturan Cabang'}
              </button>
            </div>
          </div>
        </div>

        {/* PWA & Offline Diagnostics */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-5">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <h4 className="font-bold text-gray-900 text-sm">Status PWA & Mode Offline</h4>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-gray-900 block">Status Instalasi Perangkat</span>
                <span className="text-[10px] text-gray-500">
                  {isInstalled ? 'Aplikasi berjalan dalam mode Standalone PWA' : 'Aplikasi berjalan di browser web'}
                </span>
              </div>
              {isInstalled ? (
                <span className="px-2.5 py-1 bg-green-50 border border-green-200 text-green-700 font-black text-[10px] rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Terpasang
                </span>
              ) : (
                <button
                  onClick={installApp}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs flex items-center space-x-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Install PWA</span>
                </button>
              )}
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <HardDrive className="w-4 h-4 text-gray-500" />
                <span className="font-bold text-gray-800">Kapasitas Cache Offline:</span>
              </div>
              <span className="font-mono font-bold text-gray-900">{cacheSize}</span>
            </div>

            <div className="flex space-x-2 pt-1">
              <button
                onClick={handleClearCache}
                disabled={clearing}
                className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs transition-colors flex items-center justify-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Cache</span>
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl font-bold text-xs transition-colors flex items-center justify-center space-x-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload App</span>
              </button>
            </div>
          </div>
        </div>

        {/* Printer & Receipt Configuration */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-5 lg:col-span-2">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
            <Printer className="w-4 h-4 text-purple-600" />
            <h4 className="font-bold text-gray-900 text-sm">Pengaturan Struk Kasir & Printer Thermal</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Lebar Kertas Thermal:</label>
              <div className="flex space-x-3">
                {(['58mm', '80mm'] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setPaperWidth(w)}
                    className={`flex-1 py-2.5 rounded-xl font-bold border transition-all ${
                      paperWidth === w
                        ? 'bg-purple-50 text-purple-700 border-purple-300'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Format {w} {w === '80mm' ? '(Standar POS Resto)' : '(Mini Portable)'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Catatan Kaki Struk (Footer Note):</label>
              <textarea
                rows={2}
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

