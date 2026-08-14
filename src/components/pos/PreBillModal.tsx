import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Printer, Copy, Check, X, FileText, Download } from 'lucide-react';

interface PreBillModalProps {
  orderId: string;
  onClose: () => void;
  onPayNow?: () => void;
}

export const PreBillModal: React.FC<PreBillModalProps> = ({ orderId, onClose, onPayNow }) => {
  const [loading, setLoading] = useState(true);
  const [preBillData, setPreBillData] = useState<any>(null);
  const [rawText, setRawText] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchPreBill = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/pos/pre-bill/${orderId}`);
        setPreBillData(res.data);
        setRawText(res.raw_text);
      } catch (e) {
        console.error('Error loading pre-bill', e);
      } finally {
        setLoading(false);
      }
    };
    if (orderId) {
      fetchPreBill();
    }
  }, [orderId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-amber-500/10">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-[#1E293B] text-sm sm:text-base leading-tight">
                Cetak Tagihan Sementara (Pre-Bill)
              </h3>
              <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">
                Status: Belum Lunas (Open Bill)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Slip Preview Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-gray-100 space-y-3">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400 space-y-2">
              <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold">Menyiapkan format Pre-Bill...</p>
            </div>
          ) : preBillData ? (
            <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-300 shadow-xs font-mono text-xs text-gray-800 space-y-2.5 leading-relaxed">
              {/* Slip Header */}
              <div className="text-center pb-2 border-b border-dashed border-gray-300">
                <p className="font-black text-sm uppercase">{preBillData.branch_name}</p>
                <p className="text-[10px] text-gray-500">{preBillData.branch_address}</p>
                <p className="text-[10px] text-gray-500">Telp: {preBillData.branch_phone}</p>
                <div className="mt-2 inline-block px-2.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-black tracking-wider">
                  TAGIHAN SEMENTARA (PRE-BILL)
                </div>
              </div>

              {/* Order Meta */}
              <div className="text-[11px] space-y-0.5 border-b border-dashed border-gray-300 pb-2">
                <div className="flex justify-between">
                  <span>No. Order:</span>
                  <span className="font-bold">{preBillData.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span>Waktu:</span>
                  <span>{preBillData.date_time}</span>
                </div>
                <div className="flex justify-between">
                  <span>Meja / Tipe:</span>
                  <span className="font-bold text-blue-700">
                    {preBillData.table_number ? `Meja ${preBillData.table_number}` : preBillData.order_type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span className="font-semibold">{preBillData.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kasir / Staf:</span>
                  <span>{preBillData.cashier_name}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 border-b border-dashed border-gray-300 pb-2.5">
                {(preBillData.items || []).map((item: any, idx: number) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between font-semibold">
                      <span>
                        {item.name} {item.variant ? `(${item.variant})` : ''}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-600 pl-2">
                      <span>
                        {item.qty}x @Rp {item.price.toLocaleString('id-ID')}
                      </span>
                      <span className="font-bold text-gray-900">
                        Rp {item.subtotal.toLocaleString('id-ID')}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-[10px] text-gray-400 italic pl-2">Note: {item.notes}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Financial Totals */}
              <div className="space-y-1 text-[11px] pt-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>Rp {preBillData.subtotal.toLocaleString('id-ID')}</span>
                </div>
                {preBillData.discount > 0 && (
                  <div className="flex justify-between text-green-700 font-semibold">
                    <span>Diskon</span>
                    <span>- Rp {preBillData.discount.toLocaleString('id-ID')}</span>
                  </div>
                )}
                {preBillData.service_charge > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Service Charge</span>
                    <span>Rp {preBillData.service_charge.toLocaleString('id-ID')}</span>
                  </div>
                )}
                {preBillData.tax > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>PB1 / PPN (11%)</span>
                    <span>Rp {preBillData.tax.toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-[#1E293B] pt-2 border-t border-gray-400">
                  <span>TOTAL TAGIHAN</span>
                  <span>Rp {preBillData.total.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Footer Notice */}
              <div className="text-center pt-3 border-t border-dashed border-gray-300 text-[10px] text-gray-500 space-y-0.5">
                <p className="font-bold text-gray-700">TAGIHAN INI BELUM DILUNASI</p>
                <p>Silakan bawa struk ini ke meja kasir atau hubungi staf pelayan untuk pembayaran.</p>
                <p className="pt-1 italic">Terima Kasih</p>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400">Gagal memuat rincian tagihan</div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50 flex items-center gap-2">
          <button
            onClick={handleCopy}
            disabled={loading || !rawText}
            className="px-3.5 py-2.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5"
            title="Salin Teks Struk"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">{copied ? 'Tersalin' : 'Salin Teks'}</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={loading || !rawText}
            className="flex-1 py-2.5 bg-[#1E293B] hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Pre-Bill</span>
          </button>

          {onPayNow && (
            <button
              onClick={() => {
                onClose();
                onPayNow();
              }}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs flex items-center justify-center space-x-1.5 transition-colors"
            >
              <span>Bayar Sekarang</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
