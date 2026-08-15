import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePWA } from '../lib/pwa';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
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
  Eye,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { activeBranch, activeBranchId, refreshBranches, branches, user, logout, updateUser } = useAuth();
  const { isInstallable, isInstalled, isUpdateAvailable, installApp, getCacheSize, clearAppCache } = usePWA();
  const { showToast } = useToast();
  
  const isOwnerOrManager = user?.role_id === 'owner' || user?.role_id === 'manager';

  // Navigation: persist activeSubTab in localStorage
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'general' | 'branches' | 'employees'>(() => {
    return (localStorage.getItem('pos_active_sub_tab') as any) || 'profile';
  });

  useEffect(() => {
    localStorage.setItem('pos_active_sub_tab', activeSubTab);
  }, [activeSubTab]);

  // Profile Edit State (Own Account)
  const [profileName, setProfileName] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // General Settings & Customizable Receipt State
  const [taxPct, setTaxPct] = useState<number>(11);
  const [servicePct, setServicePct] = useState<number>(0);
  const [isTaxInclusive, setIsTaxInclusive] = useState<boolean>(false);
  
  // Custom Receipt settings
  const [receiptHeaderName, setReceiptHeaderName] = useState('');
  const [receiptHeaderTagline, setReceiptHeaderTagline] = useState('');
  const [receiptFooterText, setReceiptFooterText] = useState('');
  const [receiptShowSocial, setReceiptShowSocial] = useState(true);
  const [receiptSocialHandle, setReceiptSocialHandle] = useState('');
  const [receiptTaxLabel, setReceiptTaxLabel] = useState('');
  const [receiptServiceLabel, setReceiptServiceLabel] = useState('');
  const [receiptLogoUrl, setReceiptLogoUrl] = useState('');

  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('80mm');
  const [cacheSize, setCacheSize] = useState<string>('Menghitung...');
  const [saving, setSaving] = useState<boolean>(false);
  const [clearing, setClearing] = useState<boolean>(false);

  // Employee State
  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(false);

  // Modals State
  const [showBranchModal, setShowBranchModal] = useState<boolean>(false);
  const [showEditBranchModal, setShowEditBranchModal] = useState<boolean>(false);
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [showEditUserModal, setShowEditUserModal] = useState<boolean>(false);

  // Add Branch Form State
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('');
  const [newBranchEmail, setNewBranchEmail] = useState('');
  const [newBranchOpenTime, setNewBranchOpenTime] = useState('07:00');
  const [newBranchCloseTime, setNewBranchCloseTime] = useState('22:00');
  const [newBranchTax, setNewBranchTax] = useState(11);
  const [newBranchService, setNewBranchService] = useState(0);

  // Edit Branch Form State
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [editBranchName, setEditBranchName] = useState('');
  const [editBranchCode, setEditBranchCode] = useState('');
  const [editBranchAddress, setEditBranchAddress] = useState('');
  const [editBranchPhone, setEditBranchPhone] = useState('');
  const [editBranchEmail, setEditBranchEmail] = useState('');
  const [editBranchOpenTime, setEditBranchOpenTime] = useState('07:00');
  const [editBranchCloseTime, setEditBranchCloseTime] = useState('22:00');
  const [editBranchTax, setEditBranchTax] = useState(11);
  const [editBranchService, setEditBranchService] = useState(0);
  const [editBranchActive, setEditBranchActive] = useState(true);

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

      // Customizable receipt defaults
      setReceiptHeaderName(activeBranch.receipt_header_name || activeBranch.name || 'Kopi Nusantara');
      setReceiptHeaderTagline(activeBranch.receipt_header_tagline || activeBranch.address || '');
      setReceiptFooterText(activeBranch.receipt_footer_text || 'Terima Kasih Atas Kunjungan Anda!\nSimpan struk ini sebagai bukti transaksi');
      setReceiptShowSocial(activeBranch.receipt_show_social !== false);
      setReceiptSocialHandle(activeBranch.receipt_social_handle || '@kopinusantara.id');
      setReceiptTaxLabel(activeBranch.receipt_tax_label || 'PPN (11%)');
      setReceiptServiceLabel(activeBranch.receipt_service_label || 'Service Charge');
      setReceiptLogoUrl(activeBranch.receipt_logo_url || '');
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
      showToast('Nama Lengkap dan Username tidak boleh kosong', 'error');
      return;
    }
    setUpdatingProfile(true);
    try {
      const updatedUser = await api.put('/auth/me', {
        full_name: profileName,
        username: profileUsername,
        password: profilePassword || undefined,
      });

      // Update local state in context dynamically
      const newUserState = {
        ...user,
        full_name: updatedUser.full_name,
        username: updatedUser.username,
      };
      localStorage.setItem('pos_user', JSON.stringify(newUserState));
      updateUser(newUserState);

      showToast('Profil Anda berhasil diperbarui!', 'success');
      setProfilePassword('');
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui profil', 'error');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800 * 1024) {
        showToast('Ukuran logo maksimal 800KB agar database tetap ringan', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.put(`/branches/${activeBranchId}`, {
        tax_percentage: Number(taxPct),
        service_charge_percentage: Number(servicePct),
        is_tax_inclusive: isTaxInclusive,
        // Customized receipt settings
        receipt_header_name: receiptHeaderName,
        receipt_header_tagline: receiptHeaderTagline,
        receipt_footer_text: receiptFooterText,
        receipt_show_social: receiptShowSocial,
        receipt_social_handle: receiptSocialHandle,
        receipt_tax_label: receiptTaxLabel,
        receipt_service_label: receiptServiceLabel,
        receipt_logo_url: receiptLogoUrl,
      });
      showToast('Pengaturan outlet dan struk berhasil diperbarui!', 'success');
      refreshBranches();
    } catch (e: any) {
      showToast(e.message || 'Gagal memperbarui pengaturan', 'error');
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
      showToast('Nama cabang harus diisi', 'error');
      return;
    }
    try {
      const combinedHours = `${newBranchOpenTime} - ${newBranchCloseTime}`;
      await api.post('/branches', {
        name: newBranchName,
        code: newBranchCode,
        address: newBranchAddress,
        phone: newBranchPhone,
        email: newBranchEmail,
        operating_hours: combinedHours,
        tax_percentage: Number(newBranchTax),
        service_charge_percentage: Number(newBranchService),
      });
      showToast('Cabang baru berhasil dibuat!', 'success');
      setShowBranchModal(false);
      refreshBranches();
      
      // Reset form
      setNewBranchName('');
      setNewBranchCode('');
      setNewBranchAddress('');
      setNewBranchPhone('');
      setNewBranchEmail('');
      setNewBranchOpenTime('07:00');
      setNewBranchCloseTime('22:00');
    } catch (err: any) {
      showToast(err.message || 'Gagal menambahkan cabang', 'error');
    }
  };

  // Open Edit Branch Modal
  const openEditBranch = (b: any) => {
    setSelectedBranchId(b.id);
    setEditBranchName(b.name || '');
    setEditBranchCode(b.code || '');
    setEditBranchAddress(b.address || '');
    setEditBranchPhone(b.phone || '');
    setEditBranchEmail(b.email || '');
    setEditBranchTax(b.tax_percentage || 11);
    setEditBranchService(b.service_charge_percentage || 0);
    setEditBranchActive(b.is_active !== false);

    const hours = b.operating_hours || '07:00 - 22:00';
    const parts = hours.split('-');
    if (parts.length === 2) {
      setEditBranchOpenTime(parts[0].trim());
      setEditBranchCloseTime(parts[1].trim());
    } else {
      setEditBranchOpenTime('07:00');
      setEditBranchCloseTime('22:00');
    }

    // Make sure we have latest employees list for the detail display
    fetchEmployees();
    setShowEditBranchModal(true);
  };

  // Edit Branch Submit
  const handleEditBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBranchName.trim()) {
      showToast('Nama cabang harus diisi', 'error');
      return;
    }
    try {
      const combinedHours = `${editBranchOpenTime} - ${editBranchCloseTime}`;
      await api.put(`/branches/${selectedBranchId}`, {
        name: editBranchName,
        code: editBranchCode,
        address: editBranchAddress,
        phone: editBranchPhone,
        email: editBranchEmail,
        operating_hours: combinedHours,
        tax_percentage: Number(editBranchTax),
        service_charge_percentage: Number(editBranchService),
        is_active: editBranchActive,
      });
      showToast('Data cabang berhasil diperbarui!', 'success');
      setShowEditBranchModal(false);
      refreshBranches();
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui data cabang', 'error');
    }
  };

  // Add Employee Submit
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim() || !newEmpUsername.trim()) {
      showToast('Nama Lengkap dan Username wajib diisi', 'error');
      return;
    }
    if (newEmpBranches.length === 0) {
      showToast('Karyawan harus ditugaskan minimal ke 1 cabang', 'error');
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
      showToast('Karyawan baru berhasil terdaftar!', 'success');
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
      showToast(err.message || 'Gagal menambahkan karyawan', 'error');
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
      showToast('Nama Lengkap dan Username wajib diisi', 'error');
      return;
    }
    if (editEmpBranches.length === 0) {
      showToast('Karyawan harus ditugaskan minimal ke 1 cabang', 'error');
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
      showToast('Data karyawan berhasil diperbarui!', 'success');
      setShowEditUserModal(false);
      fetchEmployees();
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui data karyawan', 'error');
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

  // Filter employees assigned to selected branch for the modal view
  const assignedEmployees = employees.filter((emp) => emp.branch_ids?.includes(selectedBranchId));

  // Translate role key to Indonesian readable role
  const translateRole = (roleId: string) => {
    switch (roleId) {
      case 'owner': return 'Owner / Direksi';
      case 'manager': return 'Manajer Cabang';
      case 'cashier': return 'Kasir Utama';
      case 'kitchen_food': return 'Dapur Makanan';
      case 'kitchen_beverage': return 'Dapur Minuman / Bar';
      default: return roleId;
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
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeSubTab === 'general' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Umum & PWA
              </button>
              <button
                onClick={() => setActiveSubTab('branches')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeSubTab === 'branches' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Cabang ({branches.length})</span>
              </button>
              <button
                onClick={() => setActiveSubTab('employees')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
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
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">ID Pengguna (Username):</label>
                <input
                  type="text"
                  required
                  value={profileUsername}
                  onChange={(e) => setProfileUsername(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
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
                    className="w-full p-2.5 pl-9 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-6xl">
          {/* Settings inputs column */}
          <div className="lg:col-span-7 space-y-6">
            {/* Tax & Service configuration */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-5">
              <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
                <Building2 className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-gray-900 text-sm">Konfigurasi Finansial Cabang: {activeBranch?.name}</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Pajak Restoran PB1 / PPN (%):</label>
                  <input
                    type="number"
                    value={taxPct}
                    onChange={(e) => setTaxPct(Number(e.target.value))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Service Charge (%):</label>
                  <input
                    type="number"
                    value={servicePct}
                    onChange={(e) => setServicePct(Number(e.target.value))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex items-center space-x-3 pt-3 md:col-span-2">
                  <input
                    type="checkbox"
                    id="taxInclusive"
                    checked={isTaxInclusive}
                    onChange={(e) => setIsTaxInclusive(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                  <label htmlFor="taxInclusive" className="font-semibold text-gray-700 cursor-pointer">
                    Harga Menu Sudah Termasuk Pajak (Tax Inclusive / Nett Price)
                  </label>
                </div>
              </div>
            </div>

            {/* Custom receipt config */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-5">
              <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
                <Printer className="w-4 h-4 text-purple-600" />
                <h4 className="font-bold text-gray-900 text-sm">Pengaturan Kustom Teks Struk Kasir</h4>
              </div>

              <div className="space-y-4 text-xs">
                {/* Logo Struk (Opsional) */}
                <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-2">
                  <span className="block font-bold text-purple-900">Logo Kustom Struk (Opsional)</span>
                  <div className="flex items-center space-x-4">
                    {receiptLogoUrl ? (
                      <div className="relative w-16 h-16 bg-white border border-purple-200 rounded-xl flex items-center justify-center p-1 group overflow-hidden">
                        <img src={receiptLogoUrl} alt="Logo Struk" className="max-w-full max-h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => setReceiptLogoUrl('')}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                          title="Hapus Logo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center text-gray-400">
                        <Printer className="w-6 h-6 stroke-[1.5]" />
                      </div>
                    )}
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center space-x-2">
                        <label className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-[10px] cursor-pointer transition-colors shadow-xs">
                          Unggah Logo
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </label>
                        {receiptLogoUrl && (
                          <button
                            type="button"
                            onClick={() => setReceiptLogoUrl('')}
                            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl font-bold text-[10px] transition-colors cursor-pointer"
                          >
                            Hapus Logo
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 leading-normal">Direkomendasikan format PNG transparan atau monokrom, rasio persegi, maks 800KB.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Nama Toko (Header):</label>
                    <input
                      type="text"
                      value={receiptHeaderName}
                      onChange={(e) => setReceiptHeaderName(e.target.value)}
                      placeholder="e.g. Kopi Nusantara Menteng"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Lebar Kertas Thermal:</label>
                    <div className="flex space-x-2">
                      {(['58mm', '80mm'] as const).map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setPaperWidth(w)}
                          className={`flex-1 py-2.5 rounded-xl font-bold border text-[11px] transition-all cursor-pointer ${
                            paperWidth === w
                              ? 'bg-purple-50 text-purple-700 border-purple-300'
                              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {w} {w === '80mm' ? '(POS)' : '(Mini)'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tagline / Alamat Struk (Header):</label>
                  <textarea
                    rows={2}
                    value={receiptHeaderTagline}
                    onChange={(e) => setReceiptHeaderTagline(e.target.value)}
                    placeholder="e.g. Jl. Teuku Cik Ditiro No. 42&#10;Menteng, Jakarta Pusat"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-medium text-gray-900 focus:outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Label Pajak Struk:</label>
                    <input
                      type="text"
                      value={receiptTaxLabel}
                      onChange={(e) => setReceiptTaxLabel(e.target.value)}
                      placeholder="e.g. PPN (11%) atau PB1 (10%)"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Label Service Charge:</label>
                    <input
                      type="text"
                      value={receiptServiceLabel}
                      onChange={(e) => setReceiptServiceLabel(e.target.value)}
                      placeholder="e.g. Service Charge atau Biaya Layanan"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Catatan Kaki Struk (Footer):</label>
                  <textarea
                    rows={2}
                    value={receiptFooterText}
                    onChange={(e) => setReceiptFooterText(e.target.value)}
                    placeholder="Tulis ucapan terima kasih..."
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-medium text-gray-900 focus:outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="showSocial"
                      checked={receiptShowSocial}
                      onChange={(e) => setReceiptShowSocial(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                    <label htmlFor="showSocial" className="font-bold text-gray-700 cursor-pointer">
                      Tampilkan Akun Sosial Media
                    </label>
                  </div>
                  {receiptShowSocial && (
                    <div>
                      <input
                        type="text"
                        value={receiptSocialHandle}
                        onChange={(e) => setReceiptSocialHandle(e.target.value)}
                        placeholder="e.g. @kopinusantara.id"
                        className="w-full p-2 bg-white border border-gray-200 hover:border-slate-300 focus:border-blue-500 rounded-lg font-bold text-gray-900 focus:outline-none transition-colors"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-3">
                  <button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan Semua Pengaturan & Format Struk'}
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
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs flex items-center space-x-1 cursor-pointer"
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
                    className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Cache</span>
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl font-bold text-xs transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reload App</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Live receipt preview column */}
          <div className="lg:col-span-5">
            <div className="sticky top-6 bg-slate-900 text-slate-300 rounded-3xl p-5 border border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-black text-white">Live Preview Struk ({paperWidth})</span>
                </div>
                <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 font-bold rounded-full text-[9px]">Thermal Sim</span>
              </div>

              {/* Thermal Paper Container */}
              <div className="bg-white text-slate-800 p-4 rounded-xl shadow-inner font-mono text-[10px] overflow-x-auto leading-normal select-none">
                <div className={`mx-auto bg-white ${paperWidth === '80mm' ? 'w-full' : 'max-w-[220px]'}`}>
                  {receiptLogoUrl && (
                    <div className="flex justify-center mb-3">
                      <img src={receiptLogoUrl} alt="Logo" className="max-h-12 object-contain" />
                    </div>
                  )}
                  <div className="text-center font-bold text-slate-950 text-xs mb-1 uppercase tracking-tight break-all">
                    {receiptHeaderName || 'NAMA OUTLET'}
                  </div>
                  {receiptHeaderTagline && (
                    <div className="text-center text-[9px] text-slate-500 mb-1 whitespace-pre-wrap break-words leading-tight">
                      {receiptHeaderTagline}
                    </div>
                  )}
                  {activeBranch?.phone && (
                    <div className="text-center text-[9px] text-slate-500 mb-1">
                      Telp: {activeBranch.phone}
                    </div>
                  )}
                  <div className="my-1 border-t border-dashed border-slate-300" />
                  
                  <div className="flex justify-between text-[9px] text-slate-600">
                    <span>No: TRX-100201</span>
                    <span>15/08/2026</span>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-600">
                    <span>Kasir: {user?.full_name || 'Kasir'}</span>
                    <span>17:08:44</span>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-600 mb-1">
                    <span>Pelanggan: Bpk. Budi</span>
                    <span>Meja: 02</span>
                  </div>
                  <div className="border-t border-dashed border-slate-300 my-1" />

                  {/* Items */}
                  <div className="space-y-1 my-1">
                    <div>
                      <div className="font-bold text-slate-900">Es Kopi Susu Gula Aren</div>
                      <div className="flex justify-between text-slate-500">
                        <span>  1x @Rp 22.000</span>
                        <span className="text-slate-900">Rp 22.000</span>
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">Nasi Goreng Kampung Spesial</div>
                      <div className="flex justify-between text-slate-500">
                        <span>  1x @Rp 38.000</span>
                        <span className="text-slate-900">Rp 38.000</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-dashed border-slate-300 my-1" />

                  {/* Pricing details */}
                  <div className="space-y-0.5 text-[9px]">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>Rp 60.000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{receiptServiceLabel || 'Service Charge'}:</span>
                      <span>Rp 3.000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{receiptTaxLabel || 'PPN (11%)'}:</span>
                      <span>Rp 6.930</span>
                    </div>
                  </div>
                  
                  <div className="border-t border-dashed border-slate-400 my-1.5" />
                  
                  <div className="flex justify-between font-black text-slate-950 mb-0.5">
                    <span>TOTAL AKHIR:</span>
                    <span>Rp 69.930</span>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-600">
                    <span>Bayar (TUNAI):</span>
                    <span>Rp 100.000</span>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-600">
                    <span>Kembalian:</span>
                    <span>Rp 30.070</span>
                  </div>
                  
                  <div className="border-t border-dashed border-slate-300 my-1.5" />

                  {/* Footer message */}
                  {receiptFooterText ? (
                    <div className="text-center text-[9px] text-slate-500 whitespace-pre-wrap leading-tight break-words">
                      {receiptFooterText}
                    </div>
                  ) : (
                    <div className="text-center text-[9px] text-slate-500">
                      Terima Kasih Atas Kunjungan Anda
                    </div>
                  )}

                  {receiptShowSocial && receiptSocialHandle && (
                    <div className="text-center text-[9px] text-blue-600 font-bold mt-1">
                      Sosmed: {receiptSocialHandle}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                Tampilan di atas mensimulasikan struk thermal asli 58mm/80mm saat tercetak ke printer POS kasir Anda.
              </p>
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
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Cabang</span>
              </button>
            )}
          </div>

          {/* Branches list table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="p-4">Kode</th>
                    <th className="p-4">Nama Cabang</th>
                    <th className="p-4">Alamat</th>
                    <th className="p-4">Telepon / Email</th>
                    <th className="p-4">Jam Operasional</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {branches.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full font-black text-[9px] uppercase tracking-wider">
                          {b.code}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-900">{b.name}</td>
                      <td className="p-4 max-w-[200px] truncate" title={b.address}>
                        {b.address}
                      </td>
                      <td className="p-4">
                        <span className="block font-semibold text-slate-800">{b.phone || '-'}</span>
                        <span className="text-[10px] text-slate-400 block">{b.email || '-'}</span>
                      </td>
                      <td className="p-4 flex items-center gap-1.5 pt-5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{b.operating_hours || '07:00 - 22:00'}</span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${b.is_active !== false ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-500'}`}>
                          {b.is_active !== false ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => openEditBranch(b)}
                          className="p-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-xl transition-colors cursor-pointer"
                          title="Edit Info Cabang & Karyawan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
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
                              {translateRole(emp.role_id)}
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
              <button onClick={() => setShowBranchModal(false)} className="text-slate-400 hover:text-slate-900 font-bold text-sm cursor-pointer">✕</button>
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
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-medium text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Kode Cabang (Singkat):</label>
                  <input
                    type="text"
                    value={newBranchCode}
                    onChange={(e) => setNewBranchCode(e.target.value)}
                    placeholder="Contoh: JKT-01"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-medium text-gray-900 focus:outline-none transition-colors"
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
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-medium text-gray-900 focus:outline-none transition-colors"
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
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-medium text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email Outlet:</label>
                  <input
                    type="email"
                    value={newBranchEmail}
                    onChange={(e) => setNewBranchEmail(e.target.value)}
                    placeholder="outlet@kopinusantara.id"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-medium text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Jam Buka:</label>
                  <input
                    type="time"
                    value={newBranchOpenTime}
                    onChange={(e) => setNewBranchOpenTime(e.target.value)}
                    className="w-full p-2 bg-white border border-gray-200 hover:border-slate-300 focus:border-blue-500 rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Jam Tutup:</label>
                  <input
                    type="time"
                    value={newBranchCloseTime}
                    onChange={(e) => setNewBranchCloseTime(e.target.value)}
                    className="w-full p-2 bg-white border border-gray-200 hover:border-slate-300 focus:border-blue-500 rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Pajak PB1 (%):</label>
                  <input
                    type="number"
                    value={newBranchTax}
                    onChange={(e) => setNewBranchTax(Number(e.target.value))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-medium text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Service Charge (%):</label>
                  <input
                    type="number"
                    value={newBranchService}
                    onChange={(e) => setNewBranchService(Number(e.target.value))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-medium text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  Simpan & Buat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: EDIT BRANCH ==================== */}
      {showEditBranchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
              <h5 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span>Edit Informasi Cabang & Detail Karyawan</span>
              </h5>
              <button onClick={() => setShowEditBranchModal(false)} className="text-slate-400 hover:text-slate-900 font-bold text-sm cursor-pointer">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleEditBranch} className="space-y-6 text-xs">
                {/* Form fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Nama Cabang:</label>
                    <input
                      type="text"
                      required
                      value={editBranchName}
                      onChange={(e) => setEditBranchName(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Kode Cabang:</label>
                    <input
                      type="text"
                      value={editBranchCode}
                      onChange={(e) => setEditBranchCode(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Alamat Lengkap:</label>
                  <input
                    type="text"
                    value={editBranchAddress}
                    onChange={(e) => setEditBranchAddress(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-medium text-gray-900 focus:outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Nomor Telepon:</label>
                    <input
                      type="text"
                      value={editBranchPhone}
                      onChange={(e) => setEditBranchPhone(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-medium text-gray-900 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Email:</label>
                    <input
                      type="email"
                      value={editBranchEmail}
                      onChange={(e) => setEditBranchEmail(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-medium text-gray-900 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Operating hours split with Time Pickers */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Jam Operasional Buka:</label>
                    <input
                      type="time"
                      value={editBranchOpenTime}
                      onChange={(e) => setEditBranchOpenTime(e.target.value)}
                      className="w-full p-2 bg-white border border-gray-200 hover:border-slate-300 focus:border-blue-500 rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Jam Operasional Tutup:</label>
                    <input
                      type="time"
                      value={editBranchCloseTime}
                      onChange={(e) => setEditBranchCloseTime(e.target.value)}
                      className="w-full p-2 bg-white border border-gray-200 hover:border-slate-300 focus:border-blue-500 rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Pajak Restoran PB1 (%):</label>
                    <input
                      type="number"
                      value={editBranchTax}
                      onChange={(e) => setEditBranchTax(Number(e.target.value))}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-medium text-gray-900 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Service Charge (%):</label>
                    <input
                      type="number"
                      value={editBranchService}
                      onChange={(e) => setEditBranchService(Number(e.target.value))}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-medium text-gray-900 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Assigned employees list (Requirement 5) */}
                <div className="border-t border-slate-100 pt-4 space-y-2">
                  <span className="block font-black text-slate-800">Daftar Karyawan di Cabang Ini ({assignedEmployees.length})</span>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-500 font-bold">
                          <th className="p-2.5">Nama Lengkap</th>
                          <th className="p-2.5">Username</th>
                          <th className="p-2.5">Jabatan</th>
                          <th className="p-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/60 font-semibold text-slate-700">
                        {assignedEmployees.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-4 text-center text-slate-400">
                              Tidak ada karyawan yang ditugaskan ke cabang ini.
                            </td>
                          </tr>
                        ) : (
                          assignedEmployees.map((emp) => (
                            <tr key={emp.id} className="hover:bg-slate-100/50 transition-colors">
                              <td className="p-2.5 font-bold text-slate-900">{emp.full_name}</td>
                              <td className="p-2.5 text-slate-500">@{emp.username}</td>
                              <td className="p-2.5">
                                <span className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded-md text-[9px]">
                                  {translateRole(emp.role_id)}
                                </span>
                              </td>
                              <td className="p-2.5">
                                <span className={emp.is_active ? 'text-green-600' : 'text-slate-400'}>
                                  {emp.is_active ? 'Aktif' : 'Nonaktif'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Active Switch */}
                <div className="flex items-center space-x-2.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <input
                    type="checkbox"
                    id="editBranchActive"
                    checked={editBranchActive}
                    onChange={(e) => setEditBranchActive(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                  <label htmlFor="editBranchActive" className="font-bold text-gray-700 cursor-pointer">
                    Cabang ini Aktif & Beroperasi
                  </label>
                </div>

                <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 bg-white">
                  <button
                    type="button"
                    onClick={() => setShowEditBranchModal(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: REGISTER EMPLOYEE ==================== */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h5 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <span>Daftarkan Karyawan Baru</span>
              </h5>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-900 font-bold text-sm cursor-pointer">✕</button>
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
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-medium text-gray-900 focus:outline-none transition-colors"
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
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-medium text-gray-900 focus:outline-none transition-colors"
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
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-medium text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">No Telepon:</label>
                  <input
                    type="text"
                    value={newEmpPhone}
                    onChange={(e) => setNewEmpPhone(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-medium text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Peran (Role):</label>
                  <select
                    value={newEmpRole}
                    onChange={(e) => setNewEmpRole(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-slate-800 focus:outline-none transition-colors cursor-pointer"
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
                      className="w-full p-2.5 pl-9 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-mono font-bold text-gray-900 focus:outline-none transition-colors"
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
                        className="w-4 h-4 rounded text-blue-600 border-gray-300 cursor-pointer"
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
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer"
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
              <button onClick={() => setShowEditUserModal(false)} className="text-slate-400 hover:text-slate-900 font-bold text-sm cursor-pointer">✕</button>
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
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-medium text-gray-900 focus:outline-none transition-colors"
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
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-medium text-gray-900 focus:outline-none transition-colors"
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
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-medium text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">No Telepon:</label>
                  <input
                    type="text"
                    value={editEmpPhone}
                    onChange={(e) => setEditEmpPhone(e.target.value)}
                    placeholder="no telp"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-medium text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Peran (Role):</label>
                  <select
                    value={editEmpRole}
                    onChange={(e) => setEditEmpRole(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-slate-800 focus:outline-none transition-colors cursor-pointer"
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
                      className="w-full p-2.5 pl-9 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-mono font-bold text-gray-900 focus:outline-none transition-colors"
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
                        className="w-4 h-4 rounded text-blue-600 border-gray-300 cursor-pointer"
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
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer"
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
