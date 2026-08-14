import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { realtime } from '../lib/websocket';
import {
  ChefHat,
  Coffee,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Flame,
  Utensils,
  Check,
  Volume2,
  Printer,
} from 'lucide-react';

export const KDSView: React.FC = () => {
  const { activeBranchId, user } = useAuth();
  const [station, setStation] = useState<'all' | 'food' | 'beverage'>(
    user?.role_id === 'kitchen_food' ? 'food' : user?.role_id === 'kitchen_beverage' ? 'beverage' : 'all'
  );
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const data = await api.get('/kds/queue', { branch_id: activeBranchId, station });
      setOrders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
    // Connect WebSocket
    realtime.connect();
    const unsubscribe = realtime.on('*', () => {
      loadQueue();
    });

    const interval = setInterval(loadQueue, 10000); // Polling fallback

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [activeBranchId, station]);

  const handleUpdateItemStatus = async (orderId: string, itemId: string, newStatus: string) => {
    try {
      await api.post('/kds/item-status', {
        order_id: orderId,
        item_id: itemId,
        status: newStatus,
      });
      loadQueue();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkOrderReady = async (orderId: string) => {
    try {
      await api.post('/kds/order-ready', {
        order_id: orderId,
        station,
      });
      loadQueue();
    } catch (e) {
      console.error(e);
    }
  };

  // Calculate elapsed minutes
  const getElapsedMinutes = (dateStr: string) => {
    const elapsed = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    return Math.max(0, elapsed);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0F172A] text-slate-100 overflow-hidden">
      {/* KDS Header */}
      <div className="bg-[#1E293B] border-b border-slate-800 p-3 sm:px-6 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white leading-tight">Kitchen Display System (KDS)</h2>
              <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Realtime Kitchen & Bar Queue</p>
            </div>
          </div>

          <button
            onClick={loadQueue}
            className="sm:hidden p-2 rounded-xl bg-[#0F172A] hover:bg-slate-700 text-gray-300 border border-slate-700 transition-colors"
            title="Refresh Antrian"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Station Filter Tabs */}
        <div className="flex items-center justify-between sm:justify-end space-x-2 overflow-x-auto">
          <div className="flex bg-[#0F172A] p-1 rounded-xl text-xs font-bold border border-slate-800 overflow-x-auto">
            <button
              onClick={() => setStation('all')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                station === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-400 hover:text-white'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setStation('food')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                station === 'food' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Dapur Makanan</span>
            </button>
            <button
              onClick={() => setStation('beverage')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                station === 'beverage' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>Bar Minuman</span>
            </button>
          </div>

          <button
            onClick={loadQueue}
            className="hidden sm:flex p-2.5 rounded-xl bg-[#0F172A] hover:bg-slate-700 text-gray-300 border border-slate-700 transition-colors"
            title="Refresh Antrian"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
        {orders.length === 0 ? (
          <div className="col-span-full h-96 flex flex-col items-center justify-center text-gray-400 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <p className="text-base font-bold text-white">Semua Pesanan Dapur Telah Selesai!</p>
            <p className="text-xs text-gray-400">Pesanan baru dari kasir atau QR mandiri akan muncul otomatis di sini.</p>
          </div>
        ) : (
          orders.map((order) => {
            const elapsed = getElapsedMinutes(order.created_at);
            const isUrgent = elapsed >= 15;
            const isWarning = elapsed >= 8 && elapsed < 15;

            return (
              <div
                key={order.id}
                className={`bg-[#1E293B] rounded-2xl border flex flex-col justify-between overflow-hidden shadow-md transition-all ${
                  isUrgent
                    ? 'border-red-500 shadow-red-950/40'
                    : isWarning
                    ? 'border-amber-500/70'
                    : 'border-slate-700'
                }`}
              >
                {/* Order Card Header */}
                <div
                  className={`p-4 border-b flex items-center justify-between ${
                    isUrgent ? 'bg-red-950/60 border-red-900/80' : 'bg-slate-800/80 border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-blue-400">{order.order_number}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-gray-300">
                        {order.order_type === 'dine_in' ? 'Dine In' : 'Take Away'}
                      </span>
                    </div>
                    <h4 className="text-base font-black text-white mt-1">
                      {order.table_number.startsWith('Meja') ? order.table_number : `Meja ${order.table_number}`}
                    </h4>
                    <p className="text-[11px] text-gray-400 truncate max-w-[150px]">{order.customer_name}</p>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <div
                      className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                        isUrgent
                          ? 'bg-red-600 text-white'
                          : isWarning
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-700 text-gray-200'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{elapsed}m</span>
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">
                      {order.order_source === 'qr_customer' ? '📲 Self-Order QR' : '💻 POS Kasir'}
                    </span>
                  </div>
                </div>

                {/* Items List */}
                <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                  {order.notes && (
                    <div className="p-2.5 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-300 flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="font-semibold italic">Note: "{order.notes}"</p>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    {order.items.map((item: any) => {
                      const isReady = item.kitchen_status === 'ready' || item.kitchen_status === 'served';
                      const isPrep = item.kitchen_status === 'in_prep';

                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-xl border flex items-start justify-between space-x-2 transition-all ${
                            isReady
                              ? 'bg-emerald-950/30 border-emerald-800/60 opacity-60'
                              : isPrep
                              ? 'bg-blue-950/40 border-blue-700/60'
                              : 'bg-slate-900/80 border-slate-700/80'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                {item.quantity}x
                              </span>
                              <span className={`text-xs font-bold ${isReady ? 'line-through text-gray-400' : 'text-white'}`}>
                                {item.product_name}
                              </span>
                            </div>

                            {item.variant_name && (
                              <p className="text-[11px] text-blue-300 font-semibold ml-8">{item.variant_name}</p>
                            )}

                            {item.modifiers && item.modifiers.length > 0 && (
                              <p className="text-[10px] text-gray-400 ml-8">
                                + {item.modifiers.map((m: any) => m.name).join(', ')}
                              </p>
                            )}

                            {item.notes && (
                              <p className="text-[10px] text-red-300 italic ml-8">"{item.notes}"</p>
                            )}
                          </div>

                          {/* Item status action buttons */}
                          <div className="flex items-center space-x-1 shrink-0">
                            {!isReady && (
                              <button
                                onClick={() =>
                                  handleUpdateItemStatus(order.id, item.id, isPrep ? 'ready' : 'in_prep')
                                }
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                                  isPrep
                                    ? 'bg-green-600 hover:bg-green-500 text-white'
                                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                                }`}
                              >
                                {isPrep ? 'Selesai' : 'Mulai Masak'}
                              </button>
                            )}
                            {isReady && (
                              <span className="text-[10px] font-bold text-green-400 bg-green-950 px-2 py-0.5 rounded border border-green-800 flex items-center space-x-1">
                                <Check className="w-3 h-3" />
                                <span>Siap</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Card Footer: Ready All Button */}
                <div className="p-3.5 bg-[#0F172A] border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 font-semibold">
                    {order.items.filter((i: any) => i.kitchen_status === 'ready' || i.kitchen_status === 'served').length} /{' '}
                    {order.items.length} Item Siap
                  </span>

                  <button
                    onClick={() => handleMarkOrderReady(order.id)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Selesaikan Tiket</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
