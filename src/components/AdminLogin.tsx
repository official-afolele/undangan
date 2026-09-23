import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ArrowLeft, ShieldAlert, KeyRound } from 'lucide-react';
import { validateAdminPassword, cleanPasswordString, DEFAULT_ADMIN_PASSWORD } from '../utils/auth';

interface AdminLoginProps {
  currentPassword: string;
  onLoginSuccess: (rememberMe: boolean) => void;
  onBackToGuest: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  currentPassword,
  onLoginSuccess,
  onBackToGuest,
}) => {
  const [inputPassword, setInputPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = cleanPasswordString(inputPassword);
    if (!cleaned) {
      setErrorMsg('Silakan masukkan kata sandi pengelola.');
      return;
    }

    if (validateAdminPassword(cleaned, currentPassword)) {
      setErrorMsg(null);
      onLoginSuccess(rememberMe);
    } else {
      setErrorMsg('Kata sandi salah! Periksa huruf besar/kecil atau gunakan sandi bawaan (jakadian2026).');
    }
  };

  const handleFillDefault = () => {
    setInputPassword(DEFAULT_ADMIN_PASSWORD);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen w-full bg-[#e9e6df] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#d8e0e8] overflow-hidden p-6 sm:p-8 animate-fade-in text-[#34495e]">
        {/* Top Icon and Brand */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#5797d0]/15 flex items-center justify-center text-[#5797d0] mb-3 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <span className="font-caveat text-3xl font-bold text-[#ef72b4]">
            Jaka & Dian
          </span>
          <h1 className="text-xl font-bold text-[#2c3e50] mt-1">
            Akses Panel Admin
          </h1>
          <p className="text-xs text-[#718096] mt-1 max-w-xs">
            Halaman ini dilindungi kata sandi agar hanya pengelola/mempelai yang dapat mengedit data undangan.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-shake">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={handleFillDefault}
              className="self-start sm:self-auto px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-800 text-[11px] font-bold cursor-pointer transition-colors"
            >
              Coba Sandi Bawaan
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="admin-password-input"
              className="block text-xs font-bold text-[#4a5568] uppercase tracking-wider mb-1.5"
            >
              Kata Sandi Admin
            </label>
            <div className="relative">
              <input
                id="admin-password-input"
                type={showPassword ? 'text' : 'password'}
                value={inputPassword}
                onChange={(e) => {
                  setInputPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="current-password"
                inputMode="text"
                placeholder="Masukkan kata sandi..."
                autoFocus
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-[#cbd5e0] focus:border-[#5797d0] focus:ring-2 focus:ring-[#5797d0]/20 text-sm outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0aec0] hover:text-[#4a5568] transition-colors p-1"
                title={showPassword ? 'Sembunyikan sandi' : 'Lihat sandi'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between text-xs text-[#718096]">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded text-[#5797d0] focus:ring-[#5797d0]"
              />
              <span>Ingat saya di perangkat ini</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-[#5797d0] hover:bg-[#4784ba] text-white font-bold text-sm shadow-md hover:shadow-lg active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>Masuk ke Panel Admin</span>
          </button>
        </form>

        {/* Back Button */}
        <div className="mt-6 text-center border-t border-[#edf2f7] pt-4">
          <button
            type="button"
            onClick={onBackToGuest}
            className="text-xs font-semibold text-[#527595] hover:text-[#2c3e50] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Halaman Undangan Tamu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
