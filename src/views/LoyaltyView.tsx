import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { Award, Gift, Tag, Users, RefreshCw, Plus, Settings, Percent, Calendar, Check, X, Edit2, Trash2 } from 'lucide-react';

export const LoyaltyView: React.FC = () => {
  const { showToast } = useToast();
  const [members, setMembers] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loyaltyConfig, setLoyaltyConfig] = useState<any>({
    points_multiplier_idr: 10000,
    tier_silver_min: 1000000,
    tier_gold_min: 5000000,
    tier_platinum_min: 10000000,
  });
  
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  // Modals
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [showEditPromoModal, setShowEditPromoModal] = useState(false);

  // Add Member Form
  const [newMemName, setNewMemName] = useState('');
  const [newMemPhone, setNewMemPhone] = useState('');
  const [newMemEmail, setNewMemEmail] = useState('');

  // Add Promo Form
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoName, setNewPromoName] = useState('');
  const [newPromoType, setNewPromoType] = useState('percentage_discount');
  const [newPromoVal, setNewPromoVal] = useState(0);
  const [newPromoMin, setNewPromoMin] = useState(0);
  const [newPromoStart, setNewPromoStart] = useState('');
  const [newPromoEnd, setNewPromoEnd] = useState('');
  const [newPromoMemberOnly, setNewPromoMemberOnly] = useState(false);
  const [newPromoMinTier, setNewPromoMinTier] = useState('all');

  // Edit Promo Form
  const [editPromoId, setEditPromoId] = useState('');
  const [editPromoCode, setEditPromoCode] = useState('');
  const [editPromoName, setEditPromoName] = useState('');
  const [editPromoType, setEditPromoType] = useState('percentage_discount');
  const [editPromoVal, setEditPromoVal] = useState(0);
  const [editPromoMin, setEditPromoMin] = useState(0);
  const [editPromoStart, setEditPromoStart] = useState('');
  const [editPromoEnd, setEditPromoEnd] = useState('');
  const [editPromoActive, setEditPromoActive] = useState(true);
  const [editPromoMemberOnly, setEditPromoMemberOnly] = useState(false);
  const [editPromoMinTier, setEditPromoMinTier] = useState('all');

  const loadData = async () => {
    setLoading(true);
    try {
      const [mems, proms, config] = await Promise.all([
        api.get('/loyalty/members'),
        api.get('/loyalty/promotions'),
        api.get('/loyalty/config').catch(() => null),
      ]);
      setMembers(mems);
      setPromotions(proms);
      if (config) {
        setLoyaltyConfig(config);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await api.put('/loyalty/config', loyaltyConfig);
      setLoyaltyConfig(res);
      showToast('Konfigurasi loyalitas berhasil diperbarui!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan konfigurasi', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemName.trim() || !newMemPhone.trim()) {
      showToast('Nama Lengkap dan Nomor Telepon wajib diisi', 'error');
      return;
    }
    try {
      await api.post('/loyalty/members', {
        name: newMemName,
        phone: newMemPhone,
        email: newMemEmail,
      });
      showToast('Member baru berhasil ditambahkan!', 'success');
      setShowMemberModal(false);
      setNewMemName('');
      setNewMemPhone('');
      setNewMemEmail('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Gagal menambahkan member', 'error');
    }
  };

  const handleAddPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoCode.trim() || !newPromoName.trim() || !newPromoVal) {
      showToast('Kode Voucher, Nama Promo, dan Nilai Diskon wajib diisi', 'error');
      return;
    }
    try {
      await api.post('/loyalty/promotions', {
        code: newPromoCode,
        name: newPromoName,
        promo_type: newPromoType,
        discount_value: newPromoVal,
        min_order_amount: newPromoMin,
        start_hour: newPromoStart || null,
        end_hour: newPromoEnd || null,
        member_only: newPromoMemberOnly,
        min_member_tier: newPromoMinTier,
      });
      showToast('Promo/Voucher baru berhasil diterbitkan!', 'success');
      setShowPromoModal(false);
      
      // Reset form
      setNewPromoCode('');
      setNewPromoName('');
      setNewPromoType('percentage_discount');
      setNewPromoVal(0);
      setNewPromoMin(0);
      setNewPromoStart('');
      setNewPromoEnd('');
      setNewPromoMemberOnly(false);
      setNewPromoMinTier('all');

      loadData();
    } catch (err: any) {
      showToast(err.message || 'Gagal membuat promo', 'error');
    }
  };

  const openEditPromo = (promo: any) => {
    setEditPromoId(promo.id);
    setEditPromoCode(promo.code || '');
    setEditPromoName(promo.name || '');
    setEditPromoType(promo.promo_type || 'percentage_discount');
    setEditPromoVal(promo.discount_value || 0);
    setEditPromoMin(promo.min_order_amount || 0);
    setEditPromoStart(promo.start_hour || '');
    setEditPromoEnd(promo.end_hour || '');
    setEditPromoActive(promo.is_active !== false);
    setEditPromoMemberOnly(promo.member_only === true);
    setEditPromoMinTier(promo.min_member_tier || 'all');
    setShowEditPromoModal(true);
  };

  const handleEditPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPromoCode.trim() || !editPromoName.trim() || !editPromoVal) {
      showToast('Kode Voucher, Nama Promo, dan Nilai Diskon wajib diisi', 'error');
      return;
    }
    try {
      await api.put(`/loyalty/promotions/${editPromoId}`, {
        code: editPromoCode,
        name: editPromoName,
        promo_type: editPromoType,
        discount_value: editPromoVal,
        min_order_amount: editPromoMin,
        start_hour: editPromoStart || null,
        end_hour: editPromoEnd || null,
        is_active: editPromoActive,
        member_only: editPromoMemberOnly,
        min_member_tier: editPromoMinTier,
      });
      showToast('Perubahan voucher promo berhasil disimpan!', 'success');
      setShowEditPromoModal(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui promo', 'error');
    }
  };

  const togglePromoActiveState = async (promo: any) => {
    try {
      const nextState = !promo.is_active;
      await api.put(`/loyalty/promotions/${promo.id}`, {
        is_active: nextState
      });
      showToast(`Voucher ${promo.code} berhasil ${nextState ? 'diaktifkan' : 'dinonaktifkan'}!`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Gagal mengubah status aktif voucher', 'error');
    }
  };

  const handleDeleteMember = async (member: any) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus member "${member.name}"?`)) return;
    try {
      await api.delete(`/loyalty/members/${member.id}`);
      showToast(`Member "${member.name}" berhasil dihapus!`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus member', 'error');
    }
  };

  const handleDeletePromo = async (promo: any) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus voucher "${promo.code}"?`)) return;
    try {
      await api.delete(`/loyalty/promotions/${promo.id}`);
      showToast(`Voucher promo "${promo.code}" berhasil dihapus!`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus voucher', 'error');
    }
  };

  return (
    <div className="flex-grow bg-[#F8FAFC] overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">CRM, Loyalty Poin & Promo Diskon</h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Kelola data pelanggan member, saldo poin loyalitas, serta voucher promo diskon kasir & QR
          </p>
        </div>
        <button
          onClick={loadData}
          className="p-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl border border-gray-200 shadow-2xs self-start sm:self-auto transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Grid Utama */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* KOLOM KIRI: MEMBERS LIST & MANAGE */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Card Member List */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-gray-900 text-sm">Data Member CRM ({members.length})</h4>
              </div>
              <button
                onClick={() => setShowMemberModal(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Member Baru
              </button>
            </div>

            <div className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto">
              {members.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs">
                  Belum ada pelanggan terdaftar sebagai member
                </div>
              ) : (
                members.map((m) => (
                  <div key={m.id} className="p-4 flex items-center justify-between hover:bg-gray-50/70 transition-colors">
                    <div>
                      <h5 className="font-black text-gray-900 text-xs">{m.name}</h5>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">{m.phone} {m.email && `• ${m.email}`}</p>
                      <span
                        className={`inline-block text-[9px] font-black px-2.5 py-0.5 rounded-full mt-1.5 border ${
                          m.tier === 'Platinum'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : m.tier === 'Gold'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : m.tier === 'Silver'
                            ? 'bg-slate-100 text-slate-700 border-slate-300'
                            : 'bg-orange-50 text-orange-700 border-orange-200'
                        }`}
                      >
                        {m.tier} Member
                      </span>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <span className="text-sm font-black text-blue-600 block">{m.points} Poin</span>
                        <span className="text-[10px] text-gray-400 block">
                          Total Belanja: Rp {m.total_spent?.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteMember(m)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        title="Hapus Member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card Rules Setup */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6">
            <div className="flex items-center space-x-2 border-b border-gray-100 pb-3.5 mb-5">
              <Settings className="w-4 h-4 text-purple-600" />
              <h4 className="font-bold text-gray-900 text-sm">Pengaturan Konfigurasi Poin & Tier</h4>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Konversi Poin (Rp Kelipatan Belanja):</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-gray-400 font-bold">Rp</span>
                    <input
                      type="number"
                      required
                      value={loyaltyConfig.points_multiplier_idr}
                      onChange={(e) => setLoyaltyConfig({ ...loyaltyConfig, points_multiplier_idr: Number(e.target.value) })}
                      className="w-full p-2.5 pl-10 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                      placeholder="10000"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 leading-normal">Karyawan mendapat 1 Poin untuk setiap kelipatan jumlah belanja di atas.</p>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tier Silver (Min. Belanja):</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-gray-400 font-bold">Rp</span>
                    <input
                      type="number"
                      required
                      value={loyaltyConfig.tier_silver_min}
                      onChange={(e) => setLoyaltyConfig({ ...loyaltyConfig, tier_silver_min: Number(e.target.value) })}
                      className="w-full p-2.5 pl-10 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                      placeholder="1000000"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tier Gold (Min. Belanja):</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-gray-400 font-bold">Rp</span>
                    <input
                      type="number"
                      required
                      value={loyaltyConfig.tier_gold_min}
                      onChange={(e) => setLoyaltyConfig({ ...loyaltyConfig, tier_gold_min: Number(e.target.value) })}
                      className="w-full p-2.5 pl-10 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                      placeholder="5000000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tier Platinum (Min. Belanja):</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-gray-400 font-bold">Rp</span>
                    <input
                      type="number"
                      required
                      value={loyaltyConfig.tier_platinum_min}
                      onChange={(e) => setLoyaltyConfig({ ...loyaltyConfig, tier_platinum_min: Number(e.target.value) })}
                      className="w-full p-2.5 pl-10 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                      placeholder="10000000"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors cursor-pointer"
                >
                  {savingConfig ? 'Menyimpan...' : 'Simpan Aturan & Nilai Tier'}
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* KOLOM KANAN: PROMOTIONS */}
        <div className="space-y-6">
          
          {/* Card Promotions List */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4 text-amber-600" />
                <h4 className="font-bold text-gray-900 text-sm">Voucher & Promo Resto ({promotions.length})</h4>
              </div>
              <button
                onClick={() => setShowPromoModal(true)}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Terbitkan Voucher
              </button>
            </div>

            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {promotions.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs">
                  Belum ada voucher atau promo diskon aktif
                </div>
              ) : (
                promotions.map((p) => (
                  <div key={p.id} className={`p-4 flex items-center justify-between hover:bg-gray-50/70 transition-colors ${p.is_active === false ? 'opacity-60 bg-gray-50/40' : ''}`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-black text-[10px]">
                          {p.code}
                        </span>
                        {p.member_only && (
                          <span className="text-[9px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                            Member {p.min_member_tier !== 'all' ? `Min. ${p.min_member_tier}` : ''}
                          </span>
                        )}
                      </div>
                      <h5 className="font-black text-gray-900 text-xs">{p.name}</h5>
                      <p className="text-[10px] text-gray-500 leading-normal">
                        Min. Belanja: Rp {p.min_order_amount?.toLocaleString('id-ID')}
                        {p.start_hour && p.end_hour && ` • Jam: ${p.start_hour} - ${p.end_hour}`}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1.5">
                      <span className="text-xs font-black text-green-600 block">
                        {p.promo_type === 'percentage_discount' ? `${p.discount_value}% OFF` : `Rp ${p.discount_value.toLocaleString('id-ID')} OFF`}
                      </span>
                      
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => togglePromoActiveState(p)}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                            p.is_active !== false 
                              ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100' 
                              : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                          }`}
                        >
                          {p.is_active !== false ? 'Aktif' : 'Nonaktif'}
                        </button>
                        <button
                          onClick={() => openEditPromo(p)}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                          title="Edit Voucher"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeletePromo(p)}
                          className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                          title="Hapus Voucher"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* ==================== MODAL: TAMBAH MEMBER ==================== */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/50">
              <h5 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Tambah Member CRM Baru</span>
              </h5>
              <button onClick={() => setShowMemberModal(false)} className="text-slate-400 hover:text-slate-900 font-bold text-sm cursor-pointer">✕</button>
            </div>
            
            <form onSubmit={handleAddMember} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nama Lengkap Pelanggan (Wajib):</label>
                <input
                  type="text"
                  required
                  value={newMemName}
                  onChange={(e) => setNewMemName(e.target.value)}
                  placeholder="Contoh: Andi Wijaya"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Nomor Telepon WA (Wajib):</label>
                <input
                  type="text"
                  required
                  value={newMemPhone}
                  onChange={(e) => setNewMemPhone(e.target.value)}
                  placeholder="Contoh: 081288990011"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-mono font-bold text-gray-900 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Email Pelanggan (Opsional):</label>
                <input
                  type="email"
                  value={newMemEmail}
                  onChange={(e) => setNewMemEmail(e.target.value)}
                  placeholder="Contoh: andi@gmail.com"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-medium text-gray-900 focus:outline-none transition-colors"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  Daftarkan Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: TERBITKAN PROMO/VOUCHER ==================== */}
      {showPromoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
              <h5 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                <Tag className="w-5 h-5 text-amber-600" />
                <span>Terbitkan Voucher Promo Baru</span>
              </h5>
              <button onClick={() => setShowPromoModal(false)} className="text-slate-400 hover:text-slate-900 font-bold text-sm cursor-pointer">✕</button>
            </div>
            
            <form onSubmit={handleAddPromo} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Kode Voucher (Wajib):</label>
                  <input
                    type="text"
                    required
                    value={newPromoCode}
                    onChange={(e) => setNewPromoCode(e.target.value)}
                    placeholder="Contoh: HEMAT20"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-mono font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nama Promo (Wajib):</label>
                  <input
                    type="text"
                    required
                    value={newPromoName}
                    onChange={(e) => setNewPromoName(e.target.value)}
                    placeholder="Contoh: Diskon Gajian"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tipe Diskon:</label>
                  <select
                    value={newPromoType}
                    onChange={(e) => setNewPromoType(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-slate-800 focus:outline-none transition-colors cursor-pointer"
                  >
                    <option value="percentage_discount">Persentase (%)</option>
                    <option value="fixed_amount">Potongan Tetap (Nominal Rp)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nilai Diskon:</label>
                  <input
                    type="number"
                    required
                    value={newPromoVal}
                    onChange={(e) => setNewPromoVal(Number(e.target.value))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                    placeholder="Nilai diskon"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Min. Jumlah Belanja (Rp):</label>
                  <input
                    type="number"
                    value={newPromoMin}
                    onChange={(e) => setNewPromoMin(Number(e.target.value))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                    placeholder="Min. belanja untuk klaim voucher"
                  />
                </div>
              </div>

              {/* TIER & MEMBER VALIDATION CONFIGS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-purple-50/50 border border-purple-100 p-3.5 rounded-2xl">
                <div className="flex items-center space-x-2.5">
                  <input
                    type="checkbox"
                    id="newPromoMemberOnly"
                    checked={newPromoMemberOnly}
                    onChange={(e) => setNewPromoMemberOnly(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                  />
                  <label htmlFor="newPromoMemberOnly" className="font-bold text-gray-700 cursor-pointer">
                    Hanya untuk Member
                  </label>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Minimal Tier Member:</label>
                  <select
                    disabled={!newPromoMemberOnly}
                    value={newPromoMinTier}
                    onChange={(e) => setNewPromoMinTier(e.target.value)}
                    className="w-full p-2 bg-white border border-purple-200 hover:border-slate-300 focus:border-purple-500 rounded-xl font-bold text-slate-800 focus:outline-none transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <option value="all">Semua Tier (Tanpa Batas)</option>
                    <option value="Bronze">Bronze</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Mulai Jam (Opsional):</label>
                  <input
                    type="time"
                    value={newPromoStart}
                    onChange={(e) => setNewPromoStart(e.target.value)}
                    className="w-full p-2 bg-white border border-gray-200 hover:border-slate-300 focus:border-blue-500 rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Hingga Jam (Opsional):</label>
                  <input
                    type="time"
                    value={newPromoEnd}
                    onChange={(e) => setNewPromoEnd(e.target.value)}
                    className="w-full p-2 bg-white border border-gray-200 hover:border-slate-300 focus:border-blue-500 rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPromoModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  Terbitkan Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: EDIT PROMO/VOUCHER ==================== */}
      {showEditPromoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/50">
              <h5 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                <Edit2 className="w-5 h-5 text-blue-600" />
                <span>Edit Informasi Voucher Promo</span>
              </h5>
              <button onClick={() => setShowEditPromoModal(false)} className="text-slate-400 hover:text-slate-900 font-bold text-sm cursor-pointer">✕</button>
            </div>
            
            <form onSubmit={handleEditPromo} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Kode Voucher (Wajib):</label>
                  <input
                    type="text"
                    required
                    value={editPromoCode}
                    onChange={(e) => setEditPromoCode(e.target.value)}
                    placeholder="Contoh: HEMAT20"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-mono font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nama Promo (Wajib):</label>
                  <input
                    type="text"
                    required
                    value={editPromoName}
                    onChange={(e) => setEditPromoName(e.target.value)}
                    placeholder="Contoh: Diskon Gajian"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tipe Diskon:</label>
                  <select
                    value={editPromoType}
                    onChange={(e) => setEditPromoType(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-slate-800 focus:outline-none transition-colors cursor-pointer"
                  >
                    <option value="percentage_discount">Persentase (%)</option>
                    <option value="fixed_amount">Potongan Tetap (Nominal Rp)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nilai Diskon:</label>
                  <input
                    type="number"
                    required
                    value={editPromoVal}
                    onChange={(e) => setEditPromoVal(Number(e.target.value))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Min. Jumlah Belanja (Rp):</label>
                  <input
                    type="number"
                    value={editPromoMin}
                    onChange={(e) => setEditPromoMin(Number(e.target.value))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* TIER & MEMBER VALIDATION CONFIGS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-purple-50/50 border border-purple-100 p-3.5 rounded-2xl">
                <div className="flex items-center space-x-2.5">
                  <input
                    type="checkbox"
                    id="editPromoMemberOnly"
                    checked={editPromoMemberOnly}
                    onChange={(e) => setEditPromoMemberOnly(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                  />
                  <label htmlFor="editPromoMemberOnly" className="font-bold text-gray-700 cursor-pointer">
                    Hanya untuk Member
                  </label>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Minimal Tier Member:</label>
                  <select
                    disabled={!editPromoMemberOnly}
                    value={editPromoMinTier}
                    onChange={(e) => setEditPromoMinTier(e.target.value)}
                    className="w-full p-2 bg-white border border-purple-200 hover:border-slate-300 focus:border-purple-500 rounded-xl font-bold text-slate-800 focus:outline-none transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <option value="all">Semua Tier (Tanpa Batas)</option>
                    <option value="Bronze">Bronze</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Mulai Jam (Opsional):</label>
                  <input
                    type="time"
                    value={editPromoStart}
                    onChange={(e) => setEditPromoStart(e.target.value)}
                    className="w-full p-2 bg-white border border-gray-200 hover:border-slate-300 focus:border-blue-500 rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Hingga Jam (Opsional):</label>
                  <input
                    type="time"
                    value={editPromoEnd}
                    onChange={(e) => setEditPromoEnd(e.target.value)}
                    className="w-full p-2 bg-white border border-gray-200 hover:border-slate-300 focus:border-blue-500 rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <input
                  type="checkbox"
                  id="editPromoActive"
                  checked={editPromoActive}
                  onChange={(e) => setEditPromoActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
                <label htmlFor="editPromoActive" className="font-bold text-gray-700 cursor-pointer">
                  Voucher Ini Aktif (Bisa digunakan di Kasir)
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditPromoModal(false)}
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
