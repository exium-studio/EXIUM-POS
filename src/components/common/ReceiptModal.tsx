import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Printer, Copy, Check, X, Coffee, ChefHat, Sparkles } from 'lucide-react';

interface ReceiptModalProps {
  transactionId: string | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ transactionId, onClose }) => {
  const [receiptData, setReceiptData] = useState<any>(null);
  const [rawText, setRawText] = useState<string>('');
  const [kitchenFoodText, setKitchenFoodText] = useState<string>('');
  const [kitchenBevText, setKitchenBevText] = useState<string>('');
  const [activeView, setActiveView] = useState<'customer' | 'kitchen_food' | 'kitchen_bev'>('customer');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!transactionId) return;
    setLoading(true);
    api
      .get(`/pos/receipt/${transactionId}`)
      .then((res) => {
        setReceiptData(res.data);
        setRawText(res.raw_text);
        setKitchenFoodText(res.kitchen_food_text);
        setKitchenBevText(res.kitchen_beverage_text);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [transactionId]);

  if (!transactionId) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const textToCopy = activeView === 'customer' ? rawText : activeView === 'kitchen_food' ? kitchenFoodText : kitchenBevText;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Printer className="w-4 h-4" />
            </div>
            <h3 className="font-black text-gray-900 text-base">Struk Thermal & Tiket Dapur</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-100 p-1 text-xs font-bold">
          <button
            onClick={() => setActiveView('customer')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              activeView === 'customer' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Struk Kasir
          </button>
          <button
            onClick={() => setActiveView('kitchen_food')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              activeView === 'kitchen_food' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Tiket Kitchen (Food)
          </button>
          <button
            onClick={() => setActiveView('kitchen_bev')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              activeView === 'kitchen_bev' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Tiket Bar (Minuman)
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#F8FAFC] flex justify-center">
          {loading ? (
            <div className="py-12 text-center text-gray-400 text-sm">Memuat format struk...</div>
          ) : (
            <div id="thermal-receipt" className={`w-full bg-white p-5 rounded-xl shadow-xs border border-gray-200 font-mono text-xs text-gray-800 whitespace-pre-wrap leading-relaxed select-text transition-all ${
              receiptData?.paper_width_mm === 58 ? 'max-w-[240px]' : 'max-w-[340px]'
            }`}>
              {activeView === 'customer' && receiptData?.receipt_logo_url && (
                <div className="flex justify-center mb-3">
                  <img src={receiptData.receipt_logo_url} alt="Logo" className="max-h-12 object-contain" />
                </div>
              )}
              {activeView === 'customer' && rawText}
              {activeView === 'kitchen_food' && (kitchenFoodText || 'Tidak ada pesanan makanan di tiket ini.')}
              {activeView === 'kitchen_bev' && (kitchenBevText || 'Tidak ada pesanan minuman di tiket ini.')}
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="p-4 border-t border-gray-200 bg-white flex items-center justify-between space-x-3">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-3 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Tersalin ESC/POS' : 'Salin Teks'}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Tutup
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
