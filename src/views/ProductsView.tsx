import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { 
  Coffee, 
  Plus, 
  Sparkles, 
  BookOpen, 
  Layers, 
  DollarSign, 
  Check, 
  RefreshCw, 
  Edit2, 
  Trash2, 
  X,
  FileText,
  Percent
} from 'lucide-react';

export const ProductsView: React.FC = () => {
  const { activeBranchId } = useAuth();
  const { showToast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [recipe, setRecipe] = useState<any[]>([]);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showEditProductModal, setShowEditProductModal] = useState(false);

  // Product Form State (Create)
  const [prodName, setProdName] = useState('');
  const [prodCode, setProdCode] = useState('');
  const [prodCategoryId, setProdCategoryId] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodPrice, setProdPrice] = useState('0');
  const [prodIsRecipeBased, setProdIsRecipeBased] = useState(true);
  const [prodTrackStock, setProdTrackStock] = useState(true);
  const [prodRecipeLines, setProdRecipeLines] = useState<any[]>([
    { ingredient_id: '', quantity: 1 }
  ]);

  // Product Form State (Edit)
  const [editProdId, setEditProdId] = useState('');
  const [editProdName, setEditProdName] = useState('');
  const [editProdCode, setEditProdCode] = useState('');
  const [editProdCategoryId, setEditProdCategoryId] = useState('');
  const [editProdDescription, setEditProdDescription] = useState('');
  const [editProdImageUrl, setEditProdImageUrl] = useState('');
  const [editProdPrice, setEditProdPrice] = useState('0');
  const [editProdIsRecipeBased, setEditProdIsRecipeBased] = useState(true);
  const [editProdTrackStock, setEditProdTrackStock] = useState(true);
  const [editProdRecipeLines, setEditProdRecipeLines] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, cats, ings] = await Promise.all([
        api.get('/products', { branch_id: activeBranchId }),
        api.get('/products/categories'),
        api.get('/stock/ingredients', { branch_id: activeBranchId }).catch(() => []),
      ]);
      setProducts(prods);
      setCategories(cats);
      setIngredients(ings);
      
      if (cats.length > 0) {
        setProdCategoryId(cats[0].id);
      }

      if (prods.length > 0) {
        // Auto select first if nothing selected
        if (!selectedProduct) {
          handleSelectProduct(prods[0]);
        } else {
          // Keep current selected product details updated
          const updated = prods.find((p) => p.id === selectedProduct.id);
          if (updated) {
            handleSelectProduct(updated);
          } else {
            handleSelectProduct(prods[0]);
          }
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat katalog menu', 'error');
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

  // Add/Remove Recipe Lines (Create Form)
  const handleAddRecipeLine = () => {
    setProdRecipeLines([...prodRecipeLines, { ingredient_id: '', quantity: 1 }]);
  };

  const handleRemoveRecipeLine = (idx: number) => {
    const updated = [...prodRecipeLines];
    updated.splice(idx, 1);
    setProdRecipeLines(updated);
  };

  const handleRecipeLineChange = (idx: number, field: string, val: any) => {
    const updated = [...prodRecipeLines];
    updated[idx] = { ...updated[idx], [field]: val };
    setProdRecipeLines(updated);
  };

  // Add/Remove Recipe Lines (Edit Form)
  const handleAddEditRecipeLine = () => {
    setEditProdRecipeLines([...editProdRecipeLines, { ingredient_id: '', quantity: 1 }]);
  };

  const handleRemoveEditRecipeLine = (idx: number) => {
    const updated = [...editProdRecipeLines];
    updated.splice(idx, 1);
    setEditProdRecipeLines(updated);
  };

  const handleEditRecipeLineChange = (idx: number, field: string, val: any) => {
    const updated = [...editProdRecipeLines];
    updated[idx] = { ...updated[idx], [field]: val };
    setEditProdRecipeLines(updated);
  };

  // Create Product Submit
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) {
      showToast('Nama menu wajib diisi', 'error');
      return;
    }
    const filteredRecipes = prodIsRecipeBased
      ? prodRecipeLines.filter(line => line.ingredient_id && Number(line.quantity) > 0)
      : [];

    try {
      await api.post('/products', {
        name: prodName.trim(),
        code: prodCode.trim() || undefined,
        category_id: prodCategoryId,
        description: prodDescription.trim(),
        image_url: prodImageUrl.trim() || undefined,
        base_price: Number(prodPrice),
        is_recipe_based: prodIsRecipeBased,
        track_stock: prodTrackStock,
        recipes: filteredRecipes,
      });
      showToast('Menu baru berhasil ditambahkan!', 'success');
      setShowProductModal(false);
      // Reset Form
      setProdName('');
      setProdCode('');
      setProdDescription('');
      setProdImageUrl('');
      setProdPrice('0');
      setProdIsRecipeBased(true);
      setProdTrackStock(true);
      setProdRecipeLines([{ ingredient_id: '', quantity: 1 }]);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Gagal menambahkan menu baru', 'error');
    }
  };

  // Open Edit Modal
  const openEditProduct = (p: any) => {
    setEditProdId(p.id);
    setEditProdName(p.name || '');
    setEditProdCode(p.code || '');
    setEditProdCategoryId(p.category_id || '');
    setEditProdDescription(p.description || '');
    setEditProdImageUrl(p.image_url || '');
    setEditProdPrice(String(p.base_price || 0));
    setEditProdIsRecipeBased(p.is_recipe_based !== undefined ? p.is_recipe_based : true);
    setEditProdTrackStock(p.track_stock !== undefined ? p.track_stock : true);

    // Format recipes from selected product
    const currentRecipes = (p.recipes || []).map((r: any) => ({
      ingredient_id: r.ingredient_id,
      quantity: r.quantity || r.quantity_required,
    }));
    setEditProdRecipeLines(currentRecipes.length > 0 ? currentRecipes : [{ ingredient_id: '', quantity: 1 }]);
    setShowEditProductModal(true);
  };

  // Edit Product Submit
  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProdName.trim()) {
      showToast('Nama menu wajib diisi', 'error');
      return;
    }
    const filteredRecipes = editProdIsRecipeBased
      ? editProdRecipeLines.filter(line => line.ingredient_id && Number(line.quantity) > 0)
      : [];

    try {
      await api.put(`/products/${editProdId}`, {
        name: editProdName.trim(),
        code: editProdCode.trim() || undefined,
        category_id: editProdCategoryId,
        description: editProdDescription.trim(),
        image_url: editProdImageUrl.trim() || undefined,
        base_price: Number(editProdPrice),
        is_recipe_based: editProdIsRecipeBased,
        track_stock: editProdTrackStock,
        recipes: filteredRecipes,
      });
      showToast('Informasi menu berhasil diperbarui!', 'success');
      setShowEditProductModal(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui menu', 'error');
    }
  };

  // Soft Delete Product
  const handleDeleteProduct = async (p: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent select trigger
    if (!window.confirm(`Apakah Anda yakin ingin menghapus menu "${p.name}"? Ini menggunakan soft delete.`)) return;
    try {
      await api.delete(`/products/${p.id}`);
      showToast(`Menu "${p.name}" berhasil dihapus.`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus menu', 'error');
    }
  };

  return (
    <div className="flex-grow bg-[#F8FAFC] overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Katalog Menu & Resep (Bill of Materials)</h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Manajemen formula resep bahan baku per menu untuk auto-deduct stok realtime dan kalkulasi HPP otomatis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProductModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Menu Baru
          </button>
          <button
            onClick={loadData}
            className="p-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl border border-gray-200 shadow-2xs transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products List (Left, 2 columns) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h4 className="font-bold text-gray-900 text-sm">Daftar Menu Aktif ({products.length})</h4>
            <span className="text-[10px] text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full font-black border border-blue-100">
              Katalog Restoran
            </span>
          </div>

          <div className="divide-y divide-gray-100 max-h-[580px] overflow-y-auto custom-scrollbar">
            {products.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs font-semibold">
                Belum ada menu produk terdaftar. Klik "Tambah Menu Baru".
              </div>
            ) : (
              products.map((p) => {
                const isSelected = selectedProduct?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProduct(p)}
                    className={`p-4 flex items-center justify-between hover:bg-gray-50/80 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/40 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="w-14 h-14 rounded-2xl object-cover border border-gray-100 shrink-0 shadow-2xs"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h5 className="font-black text-gray-900 text-xs">{p.name}</h5>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{p.sku || p.code}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 uppercase">
                            {p.category_name}
                          </span>
                          {p.is_recipe_based ? (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 uppercase">
                              Resep BOM
                            </span>
                          ) : (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 uppercase">
                              Stok Produk
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-xs font-black text-gray-900 block">
                          Rp {p.base_price.toLocaleString('id-ID')}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 block mt-0.5">
                          HPP: Rp {(p.cost_price || 0).toLocaleString('id-ID')}
                        </span>
                        <span className="text-[10px] font-bold text-green-600">
                          Margin: {p.base_price > 0 ? Math.round(((p.base_price - (p.cost_price || 0)) / p.base_price) * 100) : 0}%
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditProduct(p)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Menu"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteProduct(p, e)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Menu"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recipe / BOM Detail Panel (Right, 1 column) */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-5 h-fit">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <h4 className="font-bold text-gray-900 text-sm">Resep Bahan Baku (BOM)</h4>
          </div>

          {selectedProduct ? (
            <div className="space-y-4">
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-[10px] uppercase font-bold text-gray-400">Target Menu</span>
                <h5 className="font-black text-xs text-gray-900 mt-0.5">{selectedProduct.name}</h5>
                <p className="text-[10px] text-gray-500 mt-1 leading-normal font-medium">
                  Setiap 1 porsi menu ini terjual di kasir, stok bahan baku berikut akan otomatis terpotong:
                </p>
              </div>

              {loadingRecipe ? (
                <div className="py-8 text-center text-xs text-gray-400">Memuat rincian resep...</div>
              ) : recipe.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">Menu ini belum memiliki resep BOM tersimpan.</div>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                  {recipe.map((r, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-[#F8FAFC] rounded-xl border border-gray-200 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-xs text-slate-800">{r.ingredient_name}</span>
                        <span className="block text-[10px] text-gray-400 font-mono">
                          HPP: Rp {(r.quantity_required * r.cost_per_unit).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-black text-xs font-mono">
                        {r.quantity_required} {r.ingredient_unit || r.unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold">
                <span className="font-bold text-gray-500">Estimasi Total HPP:</span>
                <span className="font-black text-gray-900 text-sm">
                  Rp {(selectedProduct.cost_price || 0).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-gray-400">Pilih salah satu menu untuk melihat resep BOM.</div>
          )}
        </div>
      </div>

      {/* ==================== MODAL: TAMBAH MENU BARU ==================== */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/50">
              <h5 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                <Coffee className="w-5 h-5 text-blue-600" />
                <span>Tambah Menu Produk Baru</span>
              </h5>
              <button onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-slate-900 font-bold text-sm cursor-pointer">✕</button>
            </div>
            
            <form onSubmit={handleCreateProduct} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-semibold text-gray-700 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-1">Nama Menu (Wajib):</label>
                  <input
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="Contoh: Espresso Macchiato"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Kode / SKU (Opsional):</label>
                  <input
                    type="text"
                    value={prodCode}
                    onChange={(e) => setProdCode(e.target.value)}
                    placeholder="Auto-generated..."
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-mono text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-1">Kategori Menu:</label>
                  <select
                    required
                    value={prodCategoryId}
                    onChange={(e) => setProdCategoryId(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Harga Jual (Rupiah):</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-1">URL Gambar (Foto Menu):</label>
                  <input
                    type="text"
                    value={prodImageUrl}
                    onChange={(e) => setProdImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Deskripsi Singkat:</label>
                  <input
                    type="text"
                    value={prodDescription}
                    onChange={(e) => setProdDescription(e.target.value)}
                    placeholder="Deskripsi cita rasa / penyajian"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6 border-y border-slate-100 py-3.5 font-bold text-slate-700">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={prodIsRecipeBased}
                    onChange={(e) => setProdIsRecipeBased(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Pakai Resep Bahan Baku (BOM)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={prodTrackStock}
                    onChange={(e) => setProdTrackStock(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Pantau Stok & Ketersediaan</span>
                </label>
              </div>

              {/* BOM Recipe Editor */}
              {prodIsRecipeBased && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="block font-black text-slate-800 text-[11px] uppercase tracking-wider">Formula Resep Bahan Baku (BOM)</span>
                    <button
                      type="button"
                      onClick={handleAddRecipeLine}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Bahan
                    </button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {prodRecipeLines.map((line, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 border border-slate-200 p-2 rounded-xl">
                        
                        <div className="col-span-7">
                          <select
                            required
                            value={line.ingredient_id}
                            onChange={(e) => handleRecipeLineChange(idx, 'ingredient_id', e.target.value)}
                            className="w-full p-2 bg-white border border-gray-200 rounded-lg font-bold focus:outline-none"
                          >
                            <option value="">-- Pilih Bahan Baku --</option>
                            {ingredients.map((ing) => (
                              <option key={ing.id} value={ing.id}>{ing.name} ({ing.base_unit})</option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-4 flex items-center gap-1.5">
                          <input
                            type="number"
                            required
                            min="0.01"
                            step="any"
                            value={line.quantity}
                            onChange={(e) => handleRecipeLineChange(idx, 'quantity', Number(e.target.value))}
                            placeholder="Qty"
                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-center font-bold focus:outline-none"
                          />
                          <span className="text-[10px] text-gray-400 uppercase font-mono">
                            {ingredients.find(i => i.id === line.ingredient_id)?.base_unit || 'unit'}
                          </span>
                        </div>

                        <div className="col-span-1 text-center">
                          {prodRecipeLines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRecipeLine(idx)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 bg-white">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  Simpan Menu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: EDIT MENU ==================== */}
      {showEditProductModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/50">
              <h5 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                <Edit2 className="w-5 h-5 text-blue-600" />
                <span>Edit Informasi Menu</span>
              </h5>
              <button onClick={() => setShowEditProductModal(false)} className="text-slate-400 hover:text-slate-900 font-bold text-sm cursor-pointer">✕</button>
            </div>
            
            <form onSubmit={handleEditProduct} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-semibold text-gray-700 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-1">Nama Menu (Wajib):</label>
                  <input
                    type="text"
                    required
                    value={editProdName}
                    onChange={(e) => setEditProdName(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Kode / SKU:</label>
                  <input
                    type="text"
                    disabled
                    value={editProdCode}
                    className="w-full p-2.5 bg-slate-50 border border-gray-200 rounded-xl font-mono text-gray-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-1">Kategori Menu:</label>
                  <select
                    required
                    value={editProdCategoryId}
                    onChange={(e) => setEditProdCategoryId(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Harga Jual (Rupiah):</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editProdPrice}
                    onChange={(e) => setEditProdPrice(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-1">URL Gambar:</label>
                  <input
                    type="text"
                    value={editProdImageUrl}
                    onChange={(e) => setEditProdImageUrl(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl text-gray-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Deskripsi Singkat:</label>
                  <input
                    type="text"
                    value={editProdDescription}
                    onChange={(e) => setEditProdDescription(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl text-gray-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 border-y border-slate-100 py-3.5 font-bold text-slate-700">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editProdIsRecipeBased}
                    onChange={(e) => setEditProdIsRecipeBased(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Pakai Resep Bahan Baku (BOM)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editProdTrackStock}
                    onChange={(e) => setEditProdTrackStock(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Pantau Stok & Ketersediaan</span>
                </label>
              </div>

              {editProdIsRecipeBased && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="block font-black text-slate-800 text-[11px] uppercase tracking-wider">Formula Resep Bahan Baku (BOM)</span>
                    <button
                      type="button"
                      onClick={handleAddEditRecipeLine}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Bahan
                    </button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {editProdRecipeLines.map((line, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 border border-slate-200 p-2 rounded-xl">
                        
                        <div className="col-span-7">
                          <select
                            required
                            value={line.ingredient_id}
                            onChange={(e) => handleEditRecipeLineChange(idx, 'ingredient_id', e.target.value)}
                            className="w-full p-2 bg-white border border-gray-200 rounded-lg font-bold focus:outline-none"
                          >
                            <option value="">-- Pilih Bahan Baku --</option>
                            {ingredients.map((ing) => (
                              <option key={ing.id} value={ing.id}>{ing.name} ({ing.base_unit})</option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-4 flex items-center gap-1.5">
                          <input
                            type="number"
                            required
                            min="0.01"
                            step="any"
                            value={line.quantity}
                            onChange={(e) => handleEditRecipeLineChange(idx, 'quantity', Number(e.target.value))}
                            placeholder="Qty"
                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-center font-bold focus:outline-none"
                          />
                          <span className="text-[10px] text-gray-400 uppercase font-mono">
                            {ingredients.find(i => i.id === line.ingredient_id)?.base_unit || 'unit'}
                          </span>
                        </div>

                        <div className="col-span-1 text-center">
                          {editProdRecipeLines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveEditRecipeLine(idx)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 bg-white">
                <button
                  type="button"
                  onClick={() => setShowEditProductModal(false)}
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
