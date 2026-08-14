import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { ShoppingCart, Plus, CheckCircle2, Clock, Truck, RefreshCw, FileText } from 'lucide-react';

export const PurchaseView: React.FC = () => {
  const { activeBranchId } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pos, sups] = await Promise.all([
        api.get('/purchase/orders', { branch_id: activeBranchId }),
        api.get('/purchase/suppliers'),
      ]);
      setPurchaseOrders(pos);
      setSuppliers(sups);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBranchId]);

  const handleReceivePO = async (poId: string) => {
    try {
      await api.post('/purchase/receive', { po_id: poId });
      alert('Penerimaan PO berhasil! Stok bahan baku otomatis bertambah dan hutang usaha tercatat.');
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="flex-1 bg-[#F8FAFC] overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Manajemen Pembelian & Purchase Order (PO)</h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Kelola pesanan pembelian bahan baku ke supplier, approval manajer, dan penerimaan barang (Goods Receipt)
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

      {/* PO Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <h4 className="font-bold text-gray-900 text-sm">Daftar Purchase Orders ({purchaseOrders.length})</h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-[10px] tracking-wider border-b border-gray-100">
              <tr>
                <th className="py-3 px-4">No. PO</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Item Pesanan</th>
                <th className="py-3 px-4">Total Biaya</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {purchaseOrders.map((po) => (
                <tr key={po.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-blue-600">{po.po_number}</td>
                  <td className="py-3 px-4 text-gray-500">{new Date(po.order_date).toLocaleDateString('id-ID')}</td>
                  <td className="py-3 px-4 font-bold text-gray-900">{po.supplier_name}</td>
                  <td className="py-3 px-4">
                    {po.items?.map((it: any, idx: number) => (
                      <span key={idx} className="block text-[11px] text-gray-600">
                        {it.item_name} ({it.quantity} {it.unit})
                      </span>
                    ))}
                  </td>
                  <td className="py-3 px-4 font-black text-gray-900">Rp {po.total_cost?.toLocaleString('id-ID')}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        po.status === 'received'
                          ? 'bg-green-50 text-green-700'
                          : po.status === 'ordered'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {po.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {po.status !== 'received' && (
                      <button
                        onClick={() => handleReceivePO(po.id)}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-colors"
                      >
                        Terima Barang
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
