import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePWA } from '../lib/pwa';
import { api } from '../lib/api';
import {
  Settings,
  Building2,
  Printer,
  RefreshCw,
  Smartphone,
  HardDrive,
  Trash2,
  CheckCircle2,
  Download,
  Users,
  Plus,
  UserPlus,
  Mail,
  Phone,
  Clock,
  Shield,
  MapPin,
  Lock,
  User as UserIcon,
  Edit2,
  Check,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { activeBranch, activeBranchId, refreshBranches, branches, user, logout } = useAuth();
  const { isInstallable, isInstalled, isUpdateAvailable, installApp, getCacheSize, clearAppCache } = usePWA();
  
  const isOwnerOrManager = user?.role_id === 'owner' || user?.role_id === 'manager';

  // Navigation: profile is accessible to everyone, other tabs only for authorized users
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'general' | 'branches' | 'employees'>('profile');

  // Profile Edit State (Own Account)
  const [profileName, setProfileName] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // General Settings State
  const [taxPct, setTaxPct] = useState<number>(11);
  const [servicePct, setServicePct] = useState<number>(0);
  const [isTaxInclusive, setIsTaxInclusive] = useState<boolean>(false);
  const [receiptFooter, setReceiptFooter] = useState<string>('Terima Kasih Atas Kunjungan Anda!\nFollow Instagram kami @omnipos');
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('80mm');
  const [cacheSize, setCacheSize] = useState<string>('Menghitung...');
  const [saving, setSaving] = useState<boolean>(false);
  const [clearing, setClearing] = useState<boolean>(false);

  // Employee State
  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(false);

  // Modal State
  const [showBranchModal, setShowBranchModal] = useState<boolean>(false);
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [showEditUserModal, setShowEditUserModal] = useState<boolean>(false);

  // Add Branch Form State
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('');
  const [newBranchEmail, setNewBranchEmail] = useState('');
  const [newBranchHours, setNewBranchHours] = useState('07:00 - 22:00');
  const [newBranchTax, setNewBranchTax] = useState(11);
  const [newBranchService, setNewBranchService] = useState(0);

  // Add Employee Form State
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpUsername, setNewEmpUsername] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('cashier');
  const [newEmpPassword, setNewEmpPassword] = useState('123456');
  const [newEmpBranches, setNewEmpBranches] = useState<string[]>([]);

  // Edit Employee Form State
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [editEmpName, setEditEmpName] = useState('');
  const [editEmpUsername, setEditEmpUsername] = useState('');
  const [editEmpEmail, setEditEmpEmail] = useState('');
  const [editEmpPhone, setEditEmpPhone] = useState('');
  const [editEmpRole, setEditEmpRole] = useState('');
  const [editEmpPassword, setEditEmpPassword] = useState('');
  const [editEmpBranches, setEditEmpBranches] = useState<string[]>([]);
  const [editEmpActive, setEditEmpActive] = useState(true);

  // Fetch employees
  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const data = await api.get('/auth/users');
      setEmployees(data);
    } catch (e) {
      console.error('Failed to fetch employees', e);
    } finally {
      setLoadingEmployees(false);
    }
  };

  useEffect(() => {
    if (user) {
      setProfileName(user.full_name || '');
      setProfileUsername(user.username || '');
    }

    if (activeBranch) {
      setTaxPct(activeBranch.tax_percentage || 11);
      setServicePct(activeBranch.service_charge_percentage || 0);
      setIsTaxInclusive(activeBranch.is_tax_inclusive || false);
    }
    getCacheSize().then(setCacheSize);
    
    if (activeSubTab === 'employees' && isOwnerOrManager) {
      fetchEmployees();
    }
  }, [activeBranch, activeSubTab, user]);

  // Update Own Profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !profileUsername.trim()) {
      alert('Nama Lengkap dan Username tidak boleh kosong');
      return;
    }
    setUpdatingProfile(true);
    try {
      const updatedUser = await api.put('/auth/me', {
        full_name: profileName,
        username: profileUsername,
        password: profilePassword || undefined,
      });

      // Update local state in context
      localStorage.setItem('pos_user', JSON.stringify({
        ...user,
        full_name: updatedUser.full_name,
        username: updatedUser.username,
      }));

      alert('Profil Anda berhasil diperbarui! Perubahan akan langsung diterapkan.');
      setProfilePassword('');
      // Force reload or refresh logic if needed
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui profil');
    } finally {
      setUpdatingProfile(false);
    }
  };

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

  // Add Branch Submit
  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) {
      alert('Nama cabang harus diisi');
      return;
    }
    try {
      await api.post('/branches', {
        name: newBranchName,
        code: newBranchCode,
        address: newBranchAddress,
        phone: newBranchPhone,
        email: newBranchEmail,
        operating_hours: newBranchHours,
        tax_percentage: Number(newBranchTax),
        service_charge_percentage: Number(newBranchService),
      });
      alert('Cabang baru berhasil dibuat! Menu stok dan meja telah diinisialisasi secara otomatis.');
      setShowBranchModal(false);
      refreshBranches();
      
      // Reset form
      setNewBranchName('');
      setNewBranchCode('');
      setNewBranchAddress('');
      setNewBranchPhone('');
      setNewBranchEmail('');
      setNewBranchHours('07:00 - 22:00');
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan cabang');
    }
  };

  // Add Employee Submit
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim() || !newEmpUsername.trim()) {
      alert('Nama Lengkap dan Username wajib diisi');
      return;
    }
    if (newEmpBranches.length === 0) {
      alert('Karyawan harus ditugaskan minimal ke 1 cabang');
      return;
    }

    try {
      await api.post('/auth/users', {
        username: newEmpUsername,
        full_name: newEmpName,
        email: newEmpEmail,
        phone: newEmpPhone,
        role_id: newEmpRole,
        password: newEmpPassword,
        branch_ids: newEmpBranches,
      });
      alert('Karyawan baru berhasil terdaftar!');
      setShowUserModal(false);
      fetchEmployees();

      // Reset form
      setNewEmpName('');
      setNewEmpUsername('');
      setNewEmpEmail('');
      setNewEmpPhone('');
      setNewEmpRole('cashier');
      setNewEmpPassword('123456');
      setNewEmpBranches([]);
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan karyawan');
    }
  };

  // Open Edit Employee Modal
  const openEditEmployee = (emp: any) => {
    setSelectedEmpId(emp.id);
    setEditEmpName(emp.full_name || '');
    setEditEmpUsername(emp.username || '');
    setEditEmpEmail(emp.email || '');
    setEditEmpPhone(emp.phone || '');
    setEditEmpRole(emp.role_id || 'cashier');
    setEditEmpBranches(emp.branch_ids || []);
    setEditEmpActive(emp.is_active !== false);
    setEditEmpPassword(''); // leave blank for no change
    setShowEditUserModal(true);
  };

  // Edit Employee Submit
  const handleEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEmpName.trim() || !editEmpUsername.trim()) {
      alert('Nama Lengkap dan Username wajib diisi');
      return;
    }
    if (editEmpBranches.length === 0) {
      alert('Karyawan harus ditugaskan minimal ke 1 cabang');
      return;
    }

    try {
      await api.put(`/auth/users/${selectedEmpId}`, {
        username: editEmpUsername,
        full_name: editEmpName,
        email: editEmpEmail,
        phone: editEmpPhone,
        role_id: editEmpRole,
        branch_ids: editEmpBranches,
        is_active: editEmpActive,
        password: editEmpPassword || undefined, // only send if filled
      });
      alert('Data karyawan berhasil diperbarui!');
      setShowEditUserModal(false);
      fetchEmployees();
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui data karyawan');
    }
  };

  const handleBranchCheckboxChange = (bId: string, isEdit: boolean) => {
    if (isEdit) {
      setEditEmpBranches((prev) =>
        prev.includes(bId) ? prev.filter((id) => id !== bId) : [...prev, bId]
      );
    } else {
      setNewEmpBranches((prev) =>
        prev.includes(bId) ? prev.filter((id) => id !== bId) : [...prev, bId]
      );
    }
  };

  return (
    <div className="flex-grow bg-[#F8FAFC] overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* Header and Sub Tabs Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Pengaturan & Profil Pengguna</h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Atur informasi pribadi Anda, atau konfigurasikan administrasi cabang dan karyawan.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-200/60 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setActiveSubTab('profile')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'profile' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Profil Saya</span>
          </button>
          
          {isOwnerOrManager && (
            <>
              <button
                onClick={() => setActiveSubTab('general')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeSubTab === 'general' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Umum & PWA
              </button>
              <button
                onClick={() => setActiveSubTab('branches')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeSubTab === 'branches' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Cabang ({branches.length})</span>
              </button>
              <button
                onClick={() => setActiveSubTab('employees')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeSubTab === 'employees' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Karyawan</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ==================== SUBTAB: PROFILE ==================== */}
      {activeSubTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
          {/* Card User Detail */}
          <div className="bg-slate-900 rounded-3xl p-6 text-white flex flex-col items-center text-center justify-center border border-slate-800 shadow-xl relative overflow-hidden h-72">
            <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[60px]" />
            <div className="w-20 h-20 rounded-full bg-blue-600 border-2 border-slate-700 flex items-center justify-center font-black text-2xl text-white shadow-lg relative z-10">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <h4 className="text-base font-bold mt-4 relative z-10">{user?.full_name}</h4>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1 relative z-10">@{user?.username}</p>
            <span className="px-3 py-0.5 bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold rounded-full text-[10px] tracking-wider mt-4 relative z-10">
              {user?.role_name || user?.role_id}
            </span>
          </div>

          {/* Form Edit Profile */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 md:col-span-2">
            <div className="flex items-center space-x-2 border-b border-gray-100 pb-3 mb-5">
              <UserIcon className="w-4 h-4 text-blue-600" />
              <h4 className="font-bold text-gray-900 text-sm">Informasi Personal Akun</h4>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nama Lengkap Anda:</label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">ID Pengguna (Username):</label>
                <input
                  type="text"
                  required
                  value={profileUsername}
                  onChange={(e) => setProfileUsername(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Kata Sandi Baru (Kosongkan jika tidak ingin mengubah):</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-3.5 text-slate-400" />
                  <input
                    type="password"
                    value={profilePassword}
                    onChange={(e) => setProfilePassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full p-2.5 pl-9 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  {updatingProfile ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Simpan Perubahan Profil</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== SUBTAB: GENERAL ==================== */}
      {activeSubTab === 'general' && isOwnerOrManager && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
          {/* Tax & Service configuration */}
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
                  <span className="font-bold text-gray-900 block">Status PWA</span>
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

          {/* Printer configuration */}
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
      )}

      {/* ==================== SUBTAB: BRANCHES ==================== */}
      {activeSubTab === 'branches' && isOwnerOrManager && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-800 text-sm">Daftar Cabang Aktif</h4>
            {user?.role_id === 'owner' && (
              <button
                onClick={() => setShowBranchModal(true)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Cabang</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {branches.map((b) => (
              <div key={b.id} className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 relative overflow-hidden flex flex-col justify-between h-48">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full font-black text-[9px] uppercase tracking-wider">
                      {b.code}
                    </span>
                    <span className={`w-2.5 h-2.5 rounded-full ${b.is_active ? 'bg-green-500' : 'bg-slate-300'}`} />
                  </div>
                  <h5 className="font-bold text-gray-900 text-sm mt-3.5 truncate">{b.name}</h5>
                  <p className="text-gray-500 text-[11px] font-medium mt-1.5 line-clamp-2 min-h-[2rem]">
                    <MapPin className="w-3.5 h-3.5 inline mr-1 text-slate-400 shrink-0 align-text-top" />
                    {b.address}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] font-bold text-slate-500">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {b.phone || '-'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {b.operating_hours || '07:00 - 22:00'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== SUBTAB: EMPLOYEES ==================== */}
      {activeSubTab === 'employees' && isOwnerOrManager && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-800 text-sm">Manajemen Akun Karyawan</h4>
            <button
              onClick={() => setShowUserModal(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Karyawan</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="p-4">Nama Lengkap</th>
                    <th className="p-4">Username / Email</th>
                    <th className="p-4">Jabatan (Role)</th>
                    <th className="p-4">Cabang Penugasan</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingEmployees ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                        Memuat data karyawan...
                      </td>
                    </tr>
                  ) : employees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        Belum ada karyawan terdaftar
                      </td>
                    </tr>
                  ) : (
                    employees.map((emp) => {
                      const assignedBranches = branches.filter((b) => emp.branch_ids?.includes(b.id));
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors font-medium text-slate-700">
                          <td className="p-4">
                            <span className="font-bold text-slate-900 block">{emp.full_name}</span>
                            <span className="text-[10px] text-slate-400">Phone: {emp.phone || '-'}</span>
                          </td>
                          <td className="p-4">
                            <span className="font-semibold text-slate-800">@{emp.username}</span>
                            <span className="text-[10px] text-slate-400 block">{emp.email || '-'}</span>
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-[10px] font-bold">
                              {emp.role_id === 'owner' ? 'Owner' : emp.role_id === 'manager' ? 'Manager' : emp.role_id === 'cashier' ? 'Kasir' : 'KDS Dapur'}
                            </span>
                          </td>
                          <td className="p-4 max-w-[240px]">
                            <div className="flex flex-wrap gap-1">
                              {assignedBranches.map((ab) => (
                                <span key={ab.id} className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 font-bold rounded text-[9px] uppercase">
                                  {ab.code}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${emp.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-500'}`}>
                              {emp.is_active ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => openEditEmployee(emp)}
                              className="p-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-xl transition-colors cursor-pointer"
                              title="Edit Info & Reset Password Karyawan"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ADD BRANCH ==================== */}
      {showBranchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h5 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span>Buat Cabang / Outlet Baru</span>
              </h5>
              <button onClick={() => setShowBranchModal(false)} className="text-slate-400 hover:text-slate-900 font-bold text-sm">✕</button>
            </div>
            
            <form onSubmit={handleAddBranch} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nama Cabang (Wajib):</label>
                  <input
                    type="text"
                    required
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder="Contoh: Kopi Nusantara Menteng"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Kode Cabang (Singkat):</label>
                  <input
                    type="text"
                    value={newBranchCode}
                    onChange={(e) => setNewBranchCode(e.target.value)}
                    placeholder="Contoh: JKT-01"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Alamat Lengkap:</label>
                <input
                  type="text"
                  value={newBranchAddress}
                  onChange={(e) => setNewBranchAddress(e.target.value)}
                  placeholder="Jl. Teuku Cik Ditiro No. 42"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nomor Telepon:</label>
                  <input
                    type="text"
                    value={newBranchPhone}
                    onChange={(e) => setNewBranchPhone(e.target.value)}
                    placeholder="021-xxxxxx"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email Outlet:</label>
                  <input
                    type="email"
                    value={newBranchEmail}
                    onChange={(e) => setNewBranchEmail(e.target.value)}
                    placeholder="outlet@kopinusantara.id"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Jam Operasional:</label>
                  <input
                    type="text"
                    value={newBranchHours}
                    onChange={(e) => setNewBranchHours(e.target.value)}
                    placeholder="07:00 - 22:00"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Pajak PB1 (%):</label>
                  <input
                    type="number"
                    value={newBranchTax}
                    onChange={(e) => setNewBranchTax(Number(e.target.value))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Service Charge (%):</label>
                  <input
                    type="number"
                    value={newBranchService}
                    onChange={(e) => setNewBranchService(Number(e.target.value))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                >
                  Simpan & Buat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ADD EMPLOYEE ==================== */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h5 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <span>Daftarkan Karyawan Baru</span>
              </h5>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-900 font-bold text-sm">✕</button>
            </div>
            
            <form onSubmit={handleAddEmployee} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nama Lengkap Karyawan:</label>
                  <input
                    type="text"
                    required
                    value={newEmpName}
                    onChange={(e) => setNewEmpName(e.target.value)}
                    placeholder="Contoh: John Doe"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">ID Pengguna (Username):</label>
                  <input
                    type="text"
                    required
                    value={newEmpUsername}
                    onChange={(e) => setNewEmpUsername(e.target.value)}
                    placeholder="Contoh: johndoe"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email:</label>
                  <input
                    type="email"
                    value={newEmpEmail}
                    onChange={(e) => setNewEmpEmail(e.target.value)}
                    placeholder="john@kopinusantara.id"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">No Telepon:</label>
                  <input
                    type="text"
                    value={newEmpPhone}
                    onChange={(e) => setNewEmpPhone(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Peran (Role):</label>
                  <select
                    value={newEmpRole}
                    onChange={(e) => setNewEmpRole(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="owner">Owner / Direksi</option>
                    <option value="manager">Manajer Cabang</option>
                    <option value="cashier">Kasir Utama</option>
                    <option value="kitchen_food">KDS Dapur Makanan</option>
                    <option value="kitchen_beverage">KDS Bar Minuman</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Kata Sandi (Default):</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 absolute left-3 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={newEmpPassword}
                      onChange={(e) => setNewEmpPassword(e.target.value)}
                      placeholder="Default: 123456"
                      className="w-full p-2.5 pl-9 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-gray-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Branch Assignment Checkboxes */}
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">Cabang Penugasan (Bisa Pilih Lebih Dari Satu):</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 max-h-36 overflow-y-auto">
                  {branches.map((b) => (
                    <label key={b.id} className="flex items-center space-x-2.5 cursor-pointer hover:bg-slate-100 p-1.5 rounded-lg transition-colors font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={newEmpBranches.includes(b.id)}
                        onChange={() => handleBranchCheckboxChange(b.id, false)}
                        className="w-4 h-4 rounded text-blue-600 border-gray-300"
                      />
                      <span className="truncate">{b.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                >
                  Simpan & Daftarkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: EDIT EMPLOYEE ==================== */}
      {showEditUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h5 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <span>Edit & Reset Sandi Karyawan</span>
              </h5>
              <button onClick={() => setShowEditUserModal(false)} className="text-slate-400 hover:text-slate-900 font-bold text-sm">✕</button>
            </div>
            
            <form onSubmit={handleEditEmployee} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nama Lengkap Karyawan:</label>
                  <input
                    type="text"
                    required
                    value={editEmpName}
                    onChange={(e) => setEditEmpName(e.target.value)}
                    placeholder="Nama lengkap"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">ID Pengguna (Username):</label>
                  <input
                    type="text"
                    required
                    value={editEmpUsername}
                    onChange={(e) => setEditEmpUsername(e.target.value)}
                    placeholder="username"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email:</label>
                  <input
                    type="email"
                    value={editEmpEmail}
                    onChange={(e) => setEditEmpEmail(e.target.value)}
                    placeholder="email@address.com"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">No Telepon:</label>
                  <input
                    type="text"
                    value={editEmpPhone}
                    onChange={(e) => setEditEmpPhone(e.target.value)}
                    placeholder="no telp"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Peran (Role):</label>
                  <select
                    value={editEmpRole}
                    onChange={(e) => setEditEmpRole(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="owner">Owner / Direksi</option>
                    <option value="manager">Manajer Cabang</option>
                    <option value="cashier">Kasir Utama</option>
                    <option value="kitchen_food">KDS Makanan</option>
                    <option value="kitchen_beverage">KDS Minuman</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Reset Kata Sandi (Isi untuk reset):</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 absolute left-3 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={editEmpPassword}
                      onChange={(e) => setEditEmpPassword(e.target.value)}
                      placeholder="Masukkan sandi baru"
                      className="w-full p-2.5 pl-9 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-gray-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Branch Assignment Checkboxes */}
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">Cabang Penugasan:</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 max-h-36 overflow-y-auto">
                  {branches.map((b) => (
                    <label key={b.id} className="flex items-center space-x-2.5 cursor-pointer hover:bg-slate-100 p-1.5 rounded-lg transition-colors font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={editEmpBranches.includes(b.id)}
                        onChange={() => handleBranchCheckboxChange(b.id, true)}
                        className="w-4 h-4 rounded text-blue-600 border-gray-300"
                      />
                      <span className="truncate">{b.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Account Status Switch */}
              <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <input
                  type="checkbox"
                  id="editEmpActive"
                  checked={editEmpActive}
                  onChange={(e) => setEditEmpActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
                <label htmlFor="editEmpActive" className="font-bold text-slate-700 cursor-pointer">
                  Status Akun Karyawan Ini Aktif (Bisa Login)
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditUserModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
