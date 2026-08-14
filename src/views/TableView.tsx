import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { QrCode, Download, Plus, CheckCircle2, Users, Flame, RefreshCw } from 'lucide-react';

export const TableView: React.FC = () => {
  const { activeBranchId } = useAuth();
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTableQR, setSelectedTableQR] = useState<any>(null);

  const loadTables = async () => {
    setLoading(true);
    try {
      const data = await api.get('/pos/tables', { branch_id: activeBranchId });
      setTables(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, [activeBranchId]);

  return (
    <div className="flex-1 bg-[#F8FAFC] overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Denah Meja & QR Code Mandiri</h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Kelola meja aktif dan unduh stiker QR Code meja untuk pemesanan mandiri oleh pelanggan
          </p>
        </div>
        <button
          onClick={loadTables}
          className="p-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl border border-gray-200 shadow-2xs self-start sm:self-auto transition-colors"
          title="Refresh Meja"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {tables.map((table) => {
          const isOccupied = table.status === 'occupied';
          return (
            <div
              key={table.id}
              onClick={() => setSelectedTableQR(table)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-40 shadow-xs hover:scale-[1.02] ${
                isOccupied
                  ? 'bg-amber-50/50 border-amber-300'
                  : 'bg-white border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-sm text-gray-900">Meja {table.table_number}</span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isOccupied ? 'bg-amber-500' : 'bg-green-500'
                  }`}
                />
              </div>

              <div className="text-center py-2">
                <div className="w-12 h-12 mx-auto rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700">
                  <QrCode className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-[10px] text-gray-400 font-semibold block mt-1">Zone: {table.zone}</span>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-100">
                <span className="text-gray-400 font-medium flex items-center gap-1">
                  <Users className="w-3 h-3" /> {table.capacity} Org
                </span>
                <span className={`font-bold ${isOccupied ? 'text-amber-600' : 'text-green-600'}`}>
                  {isOccupied ? 'Terisi' : 'Kosong'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* QR Modal Preview */}
      {selectedTableQR && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm overflow-hidden p-6 text-center space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-gray-900 text-base">QR Stiker Meja {selectedTableQR.table_number}</h3>
              <button
                onClick={() => setSelectedTableQR(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
              <img
                src={selectedTableQR.qr_code_url}
                alt="QR Code Meja"
                className="w-48 h-48 mx-auto bg-white p-2 rounded-xl border border-gray-200 shadow-2xs"
              />
              <p className="text-xs font-bold text-gray-800 mt-3">Scan untuk Pesan Mandiri</p>
              <p className="text-[10px] text-gray-400">Meja {selectedTableQR.table_number} • {selectedTableQR.zone}</p>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Cetak Stiker QR</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
