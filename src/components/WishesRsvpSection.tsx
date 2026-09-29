import React, { useState, useEffect, useRef } from 'react';
import { WishEntry } from '../types';
import { initialWishes } from '../data/weddingData';
import { 
  Heart, 
  Send, 
  CheckCircle2, 
  MessageSquareHeart, 
  Loader2, 
  Sparkles, 
  AlertCircle, 
  RefreshCw 
} from 'lucide-react';

interface WishesRsvpSectionProps {
  initialGuestName?: string;
  googleScriptUrl?: string;
}

const STORAGE_KEY = 'wedding_wishes_jaka_dian';
// URL Google Apps Script Buku Tamu Jaka & Dian
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby6h1lOSpTyczUj5Bsyu3n0W3AnlZuME1Cn4V2WFfpNQeGj6v_3poNiZScPbButlpVf/exec';

export const WishesRsvpSection: React.FC<WishesRsvpSectionProps> = ({ 
  initialGuestName = '',
  googleScriptUrl
}) => {
  const activeScriptUrl = (googleScriptUrl && googleScriptUrl.startsWith('http')) 
    ? googleScriptUrl 
    : DEFAULT_SCRIPT_URL;

  const [wishes, setWishes] = useState<WishEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return initialWishes;
  });

  const [name, setName] = useState(() => {
    return initialGuestName && initialGuestName !== 'Tamu Undangan' ? initialGuestName : '';
  });
  const [attendance, setAttendance] = useState<'hadir' | 'ragu' | 'tidak'>('hadir');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedToast, setSubmittedToast] = useState(false);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'semua' | 'hadir' | 'ragu' | 'tidak'>('semua');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const wishListRef = useRef<HTMLDivElement>(null);
  const wishesSectionRef = useRef<HTMLDivElement>(null);

  // Ambil ucapan terbaru langsung dari Google Spreadsheet
  const fetchWishes = async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);

    if (activeScriptUrl) {
      try {
        const res = await fetch(`${activeScriptUrl}?action=get_wishes`);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.wishes) && data.wishes.length > 0) {
            setWishes(data.wishes);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(data.wishes));
            } catch {}
            if (showSpinner) setIsRefreshing(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Google Script fetch error:', err);
      }
    }

    try {
      const res = await fetch('/api/wishes');
      if (res.ok) {
        const serverWishes: WishEntry[] = await res.json();
        if (Array.isArray(serverWishes) && serverWishes.length > 0) {
          setWishes(serverWishes);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(serverWishes));
          } catch {}
          return;
        }
      }
    } catch (err) {
      console.warn('Gagal memuat ucapan dari server lokal:', err);
    } finally {
      if (showSpinner) setIsRefreshing(false);
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setWishes(parsed);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchWishes();

    const interval = setInterval(() => {
      fetchWishes(false);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (initialGuestName && initialGuestName !== 'Tamu Undangan' && !name) {
      setName(initialGuestName);
    }
  }, [initialGuestName, name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName) {
      setFormError('Silakan masukkan nama Anda.');
      return;
    }

    if (!trimmedMessage) {
      setFormError('Silakan tuliskan ucapan doa restu untuk kedua mempelai.');
      return;
    }

    setIsSubmitting(true);

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    const newWish: WishEntry = {
      id: 'wish-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: trimmedName,
      message: trimmedMessage,
      attendance,
      timestamp: `Baru saja • ${timeFormatted}`
    };

    // 1. Tampilkan langsung di layar seketika
    const updated = [newWish, ...wishes.filter((w) => w.id !== newWish.id)];
    setWishes(updated);
    setNewlyAddedId(newWish.id);
    setFilter('semua');

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    setMessage('');
    setSubmittedToast(true);

    setTimeout(() => {
      if (wishListRef.current) {
        wishListRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);

    // 2. Kirim langsung ke Google Spreadsheet via Apps Script
    if (activeScriptUrl) {
      try {
        fetch(activeScriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add_wish',
            ...newWish
          })
        }).catch(() => {});
      } catch (err) {
        console.warn('Gagal kirim ke Google Script:', err);
      }
    }

    // 3. Cadangan ke server lokal
    try {
      await fetch('/api/wishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWish),
      });
    } catch {}

    setIsSubmitting(false);

    setTimeout(() => {
      setSubmittedToast(false);
    }, 6000);
  };

  const filteredWishes = wishes.filter((w) => {
    if (filter === 'hadir') return w.attendance === 'hadir';
    if (filter === 'ragu') return w.attendance === 'ragu';
    if (filter === 'tidak') return w.attendance === 'tidak';
    return true;
  });

  const totalHadir = wishes.filter((w) => w.attendance === 'hadir').length;
  const totalRagu = wishes.filter((w) => w.attendance === 'ragu').length;
  const totalTidak = wishes.filter((w) => w.attendance === 'tidak').length;

  return (
    <section id="ucapan" ref={wishesSectionRef} className="w-full px-4 py-8 text-center scroll-mt-6">
      <div className="max-w-sm sm:max-w-md mx-auto">
        <h2 className="font-caveat text-4xl sm:text-5xl font-bold text-[#5d99d1] mb-2">
          Love Your Wishes!
        </h2>
        <p className="font-patrick text-base text-[#527595] mb-6">
          Berikan doa restu dan konfirmasi kehadiran Anda untuk mempelai.
        </p>

        {/* FORM CARD */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-md border border-[#5797d0]/20 text-left mb-6 relative">
          <div className="flex items-center gap-2 mb-4 text-[#5797d0] font-patrick font-bold text-lg sm:text-xl border-b border-[#edf2f7] pb-3">
            <MessageSquareHeart className="w-5 h-5 text-[#ef72b4]" />
            <span>Kirim Ucapan & Konfirmasi Kehadiran</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2 font-patrick text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label htmlFor="guest-name-input" className="block font-patrick text-sm font-semibold text-[#527595] mb-1">
                Nama Anda:
              </label>
              <input
                id="guest-name-input"
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder="Tuliskan nama lengkap Anda"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2e3f3] focus:border-[#5797d0] focus:ring-2 focus:ring-[#5797d0]/20 outline-none font-patrick text-base text-[#2d3748] transition-all bg-white"
              />
            </div>

            <div>
              <label className="block font-patrick text-sm font-semibold text-[#527595] mb-1.5">
                Konfirmasi Kehadiran:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAttendance('hadir')}
                  className={`py-2 px-2 rounded-xl text-xs sm:text-sm font-patrick font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                    attendance === 'hadir'
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                      : 'bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <span>✓ Hadir</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAttendance('ragu')}
                  className={`py-2 px-2 rounded-xl text-xs sm:text-sm font-patrick font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                    attendance === 'ragu'
                      ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                      : 'bg-amber-50/70 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <span>? Ragu</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAttendance('tidak')}
                  className={`py-2 px-2 rounded-xl text-xs sm:text-sm font-patrick font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                    attendance === 'tidak'
                      ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                      : 'bg-rose-50/70 text-rose-800 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <span>✗ Maaf</span>
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="guest-message-input" className="block font-patrick text-sm font-semibold text-[#527595] mb-1">
                Doa & Ucapan:
              </label>
              <textarea
                id="guest-message-input"
                required
                rows={3}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder="Tuliskan ucapan dan doa restu terbaik untuk kedua mempelai..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2e3f3] focus:border-[#5797d0] focus:ring-2 focus:ring-[#5797d0]/20 outline-none font-patrick text-base text-[#2d3748] transition-all bg-white resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-linear-to-r from-[#5797d0] to-[#ec79b8] hover:opacity-95 text-white font-patrick font-bold text-lg shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Mengirimkan Ucapan...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Kirim Ucapan & Konfirmasi</span>
                </>
              )}
            </button>
          </form>

          {submittedToast && (
            <div className="mt-3 p-3 rounded-xl bg-green-50 border border-green-200 text-green-800 flex items-center gap-2 text-xs sm:text-sm font-patrick animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <span>Terima kasih! Ucapan dan konfirmasi kehadiran Anda berhasil tersimpan.</span>
            </div>
          )}
        </div>

        {/* METRICS & FILTER BAR */}
        <div className="bg-white/80 backdrop-blur-xs rounded-2xl p-3 sm:p-4 mb-4 border border-[#e2e8f0] shadow-2xs">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="font-patrick font-bold text-sm sm:text-base text-[#2d3748] flex items-center gap-1.5">
              <span>💌 Doa Restu & Ucapan</span>
              <span className="text-xs bg-[#5797d0]/15 text-[#5797d0] px-2 py-0.5 rounded-full font-sans">
                {wishes.length}
              </span>
            </span>

            <button
              type="button"
              onClick={() => fetchWishes(true)}
              disabled={isRefreshing}
              className="px-2.5 py-1 rounded-lg text-xs font-patrick font-semibold text-[#527595] hover:bg-gray-100 flex items-center gap-1 cursor-pointer transition-colors"
              title="Segarkan ucapan terbaru"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5 font-patrick text-xs sm:text-sm">
            <button
              type="button"
              onClick={() => setFilter('semua')}
              className={`p-1.5 rounded-xl border transition-all text-center cursor-pointer ${
                filter === 'semua'
                  ? 'bg-[#5797d0] text-white border-[#5797d0] shadow-xs'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="font-bold">{wishes.length}</div>
              <div className="text-[10px]">Semua</div>
            </button>

            <button
              type="button"
              onClick={() => setFilter('hadir')}
              className={`p-1.5 rounded-xl border transition-all text-center cursor-pointer ${
                filter === 'hadir'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <div className="font-bold">{totalHadir}</div>
              <div className="text-[10px]">Hadir</div>
            </button>

            <button
              type="button"
              onClick={() => setFilter('ragu')}
              className={`p-1.5 rounded-xl border transition-all text-center cursor-pointer ${
                filter === 'ragu'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <div className="font-bold">{totalRagu}</div>
              <div className="text-[10px]">Ragu</div>
            </button>

            <button
              type="button"
              onClick={() => setFilter('tidak')}
              className={`p-1.5 rounded-xl border transition-all text-center cursor-pointer ${
                filter === 'tidak'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <div className="font-bold">{totalTidak}</div>
              <div className="text-[10px]">Maaf</div>
            </button>
          </div>
        </div>

        {/* WISHES LIST CONTAINER */}
        <div
          ref={wishListRef}
          className="space-y-3 max-h-[420px] overflow-y-auto pr-1 text-left scrollbar-thin scrollbar-thumb-[#5797d0]/20"
        >
          {filteredWishes.length === 0 ? (
            <div className="bg-white/80 rounded-2xl p-6 text-center text-gray-500 font-patrick border border-[#e2e8f0]">
              Belum ada ucapan pada kategori ini. Jadilah yang pertama memberikan doa restu!
            </div>
          ) : (
            filteredWishes.map((w) => {
              const isNewlyAdded = w.id === newlyAddedId;

              return (
                <div
                  key={w.id}
                  className={`bg-white rounded-2xl p-4 shadow-2xs border transition-all ${
                    isNewlyAdded
                      ? 'border-emerald-400 bg-emerald-50/30 ring-2 ring-emerald-200'
                      : 'border-[#e2e8f0] hover:border-[#5797d0]/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-patrick font-bold text-base text-[#2d3748]">
                        {w.name}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full font-sans ${
                          w.attendance === 'hadir'
                            ? 'bg-emerald-100 text-emerald-800'
                            : w.attendance === 'ragu'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {w.attendance === 'hadir'
                          ? '✓ Hadir'
                          : w.attendance === 'ragu'
                          ? '? Ragu-ragu'
                          : '✗ Tidak Hadir'}
                      </span>
                    </div>

                    <span className="text-[10px] text-gray-400 shrink-0 font-sans">
                      {w.timestamp}
                    </span>
                  </div>

                  <p className="font-patrick text-sm sm:text-base text-[#4a5568] whitespace-pre-line leading-relaxed">
                    {w.message}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};
