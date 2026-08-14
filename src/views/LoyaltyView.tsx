import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Award, Gift, Tag, Users, RefreshCw } from 'lucide-react';

export const LoyaltyView: React.FC = () => {
  const [members, setMembers] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mems, proms] = await Promise.all([
        api.get('/loyalty/members'),
        api.get('/loyalty/promotions'),
      ]);
      setMembers(mems);
      setPromotions(proms);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="flex-1 bg-[#F8FAFC] overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Members List */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-blue-600" />
              <h4 className="font-bold text-gray-900 text-sm">Data Member CRM ({members.length})</h4>
            </div>
          </div>

          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
            {members.map((m) => (
              <div key={m.id} className="p-4 flex items-center justify-between hover:bg-gray-50/70 transition-colors">
                <div>
                  <h5 className="font-black text-gray-900 text-xs">{m.name}</h5>
                  <p className="text-[11px] text-gray-500 font-mono mt-0.5">{m.phone}</p>
                  <span
                    className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full mt-1.5 ${
                      m.tier === 'Platinum'
                        ? 'bg-purple-50 text-purple-700'
                        : m.tier === 'Gold'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {m.tier} Member
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-blue-600 block">{m.points} Poin</span>
                  <span className="text-[10px] text-gray-400">
                    Total Belanja: Rp {m.total_spent?.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Promotions */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Tag className="w-4 h-4 text-amber-600" />
              <h4 className="font-bold text-gray-900 text-sm">Voucher & Promo Aktif ({promotions.length})</h4>
            </div>
          </div>

          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
            {promotions.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between hover:bg-gray-50/70 transition-colors">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-mono font-bold text-xs">
                      {p.code}
                    </span>
                    <h5 className="font-black text-gray-900 text-xs">{p.name}</h5>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Min. Belanja: Rp {p.min_order_amount?.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-green-600 block">
                    {p.promo_type === 'percentage_discount' ? `${p.discount_value}% OFF` : `Potongan Rp ${p.discount_value.toLocaleString('id-ID')}`}
                  </span>
                  <span className="text-[9px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full inline-block mt-1">
                    Aktif
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
