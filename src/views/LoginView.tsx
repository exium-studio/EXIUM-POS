import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Store, User, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, branches } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [branchId, setBranchId] = useState('branch-1');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username tidak boleh kosong');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await login(username, password, branchId);
    } catch (err: any) {
      setError(err.message || 'Gagal masuk. Silakan periksa kembali kredensial Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-radial from-[#1E293B] via-[#0F172A] to-[#020617] text-white p-4 relative overflow-hidden font-sans">
      {/* Background Ambient Decorative Lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Glass Card Container */}
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 sm:p-10 shadow-2xl flex flex-col items-center relative z-10 transition-all duration-300">
        
        {/* Brand/Logo Area */}
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-5 relative group overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-tr from-blue-700 to-indigo-500 transition-transform group-hover:scale-110" />
          <Store className="w-8 h-8 text-white relative z-10 animate-pulse" />
        </div>

        <h2 className="text-2xl font-black tracking-tight text-white mb-1">Nusantara POS</h2>
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-8 text-center">
          Enterprise Cashier & Management System
        </p>

        {error && (
          <div className="w-full mb-5 bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold px-4 py-3 rounded-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full space-y-5">
          {/* Outlet Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Pilih Cabang / Outlet</label>
            <div className="relative group">
              <Store className="absolute left-4 top-3.5 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold text-white focus:outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/10 cursor-pointer appearance-none transition-all"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-4.5 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Nama Pengguna</label>
            <div className="relative group">
              <User className="absolute left-4 top-3.5 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username Anda"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Kata Sandi</label>
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl pl-11 pr-12 py-3.5 text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-slate-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-2xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/25 hover:shadow-blue-500/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-150"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Masuk Sistem</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Info / Developer Mode */}
        <div className="mt-8 text-center text-[10px] font-semibold text-slate-500 tracking-wider">
          <p>DEV DEMO ACCOUNTS (Password: 123456):</p>
          <div className="flex flex-wrap justify-center gap-x-2 mt-1">
            <span>owner</span>•<span>manager_jkt</span>•<span>cashier_jkt</span>
          </div>
        </div>

      </div>
    </div>
  );
};
