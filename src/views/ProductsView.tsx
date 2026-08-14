import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Coffee, Plus, Sparkles, BookOpen, Layers, DollarSign, Check, RefreshCw } from 'lucide-react';

export const ProductsView: React.FC = () => {
  const { activeBranchId } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [recipe, setRecipe] = useState<any[]>([]);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        api.get('/products', { branch_id: activeBranchId }),
        api.get('/products/categories'),
      ]);
      setProducts(prods);
      setCategories(cats);
      if (prods.length > 0) {
        handleSelectProduct(prods[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = async (product: any) => {
    setSelectedProduct(product);
    setLoadingRecipe(true);
    try {
      const res = await api.get(`/products/recipe/${product.id}`);
      setRecipe(res.recipe || []);
    } catch (e) {
      console.error(e);
      setRecipe([]);
    } finally {
      setLoadingRecipe(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBranchId]);

  return (
    <div className="flex-1 bg-[#F8FAFC] overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Katalog Menu & Resep (Bill of Materials)</h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Manajemen formula resep bahan baku per menu untuk auto-deduct stok realtime dan kalkulasi HPP otomatis
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h4 className="font-bold text-gray-900 text-sm">Daftar Menu Aktif ({products.length})</h4>
          </div>

          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {products.map((p) => {
              const isSelected = selectedProduct?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectProduct(p)}
                  className={`p-4 flex items-center justify-between hover:bg-gray-50/80 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50/50 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="w-14 h-14 rounded-xl object-cover border border-gray-100 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h5 className="font-black text-gray-900 text-xs">{p.name}</h5>
                      <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{p.sku}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                          {p.category_name}
                        </span>
                        {p.variants && p.variants.length > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                            {p.variants.length} Varian
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-black text-gray-900 block">
                      Rp {p.base_price.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 block mt-0.5">
                      HPP: Rp {p.cost_price?.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] font-bold text-green-600">
                      Margin: {Math.round(((p.base_price - p.cost_price) / p.base_price) * 100)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recipe / BOM Detail Panel */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-5">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <h4 className="font-bold text-gray-900 text-sm">Resep Bahan Baku (BOM)</h4>
          </div>

          {selectedProduct ? (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-[10px] uppercase font-bold text-gray-400">Target Menu</span>
                <h5 className="font-black text-sm text-gray-900 mt-0.5">{selectedProduct.name}</h5>
                <p className="text-[10px] text-gray-500 mt-1">
                  Setiap 1 porsi menu ini terjual di kasir / QR, stok bahan baku berikut akan otomatis terpotong:
                </p>
              </div>

              {loadingRecipe ? (
                <div className="py-8 text-center text-xs text-gray-400">Memuat rincian resep...</div>
              ) : recipe.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">Menu ini belum memiliki resep BOM tersimpan.</div>
              ) : (
                <div className="space-y-2">
                  {recipe.map((r, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-[#F8FAFC] rounded-xl border border-gray-200 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-xs text-gray-900">{r.ingredient_name}</span>
                        <span className="block text-[10px] text-gray-400 font-mono">
                          HPP: Rp {(r.quantity_required * r.cost_per_unit).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-black text-xs font-mono">
                        {r.quantity_required} {r.unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="font-bold text-gray-500">Estimasi Total HPP:</span>
                <span className="font-black text-gray-900 text-sm">
                  Rp {selectedProduct.cost_price?.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-gray-400">Pilih salah satu menu untuk melihat resep BOM.</div>
          )}
        </div>
      </div>
    </div>
  );
};
