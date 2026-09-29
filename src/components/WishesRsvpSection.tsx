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
      if (saved) {
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

  // Ambil ucapan terbaru langsung dari Google Spreadsheet / Server
  const fetchWishes = async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);

    // 1. Ambil dari Google Apps Script Web App
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

    // 2. Cadangan ke server lokal
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
      console.warn('Gagal memuat ucapan dari server:', err);
    } finally {
      if (showSpinner) setIsRefreshing(false);
    }

    // 3. Cadangan localStorage
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

    // 2. Kirim otomatis ke Google Spreadsheet
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
    } catch (err) {
      console.warn('Gagal sinkronisasi wish ke server:', err);
    } finally {
      setIsSubmitting(false);
    }

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

        {/* FORM CARD (PERSIS SEPERTI GAMBAR PERTAMA) */}
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
              <label htmlFor="guest-attendance-select" className="block font-patrick text-sm font-semibold text-[#527595] mb-1">
                Konfirmasi Kehadiran:
              </label>
              <select
                id="guest-attendance-select"
                value={attendance}
                onChange={(e) => setAttendance(e.target.value as 'hadir' | 'ragu' | 'tidak')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2e3f3] focus:border-[#5797d0] focus:ring-2 focus:ring-[#5797d0]/20 outline-none font-patrick text-base text-[#2d3748] transition-all bg-white cursor-pointer"
              >
                <option value="hadir">✓ Ya, Saya Akan Hadir</option>
                <option value="ragu">? Masih Ragu / Belum Pasti</option>
                <option value="tidak">✗ Maaf, Belum Bisa Hadir</option>
              </select>
            </div>

            <div>
              <label htmlFor="guest-message-input" className="block font-patrick text-sm font-semibold text-[#527595] mb-1">
                Ucapan & Doa Restu:
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
                placeholder="Tuliskan doa restu dan harapan terbaik untuk kedua mempelai..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2e3f3] focus:border-[#5797d0] focus:ring-2 focus:ring-[#5797d0]/20 outline-none font-patrick text-base text-[#2d3748] transition-all bg-white resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[46px] rounded-xl bg-[#ec79b8] hover:bg-[#d866a4] active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed text-white font-amatic text-2xl font-bold tracking-wider shadow-[0_4px_0_#bd4a89] active:shadow-[0_1px_0_#bd4a89] active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>MENYIMPAN UCAPAN...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>KIRIM UCAPAN & DOA</span>
                </>
              )}
            </button>
          </form>

          {submittedToast && (
            <div className="mt-3.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-2.5 font-patrick text-sm shadow-xs animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
              <div>
                <strong className="block text-emerald-900 font-bold">Alhamdulillah, Ucapan Berhasil Dikirim!</strong>
                <span>Ucapan Anda telah tersimpan dan langsung tampil di kolom Ucapan Diterima di bawah ini.</span>
              </div>
            </div>
          )}
        </div>

        {/* WISHES LIST CONTAINER (SESUAI GAMBAR PERTAMA) */}
        <div className="text-left bg-white/60 p-4 sm:p-5 rounded-2xl border border-[#5797d0]/15 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5 border-b border-[#edf2f7] pb-3">
            <div className="flex items-center gap-2 font-patrick text-base sm:text-lg font-bold text-[#5797d0]">
              <Heart className="w-5 h-5 text-[#ef72b4] fill-[#ef72b4]" />
              <span>Ucapan Diterima</span>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 text-xs font-patrick flex-wrap">
              <button
                type="button"
                onClick={() => setFilter('semua')}
                className={`px-2.5 py-1 rounded-lg transition-colors font-semibold cursor-pointer ${
                  filter === 'semua' ? 'bg-[#5797d0] text-white shadow-xs' : 'bg-white text-[#527595] hover:bg-[#eaf1f7]'
                }`}
              >
                Semua ({wishes.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('hadir')}
                className={`px-2.5 py-1 rounded-lg transition-colors font-semibold cursor-pointer ${
                  filter === 'hadir' ? 'bg-green-600 text-white shadow-xs' : 'bg-white text-[#527595] hover:bg-[#eaf1f7]'
                }`}
              >
                Hadir ({totalHadir})
              </button>
              {totalRagu > 0 && (
                <button
                  type="button"
                  onClick={() => setFilter('ragu')}
                  className={`px-2.5 py-1 rounded-lg transition-colors font-semibold cursor-pointer ${
                    filter === 'ragu' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-[#527595] hover:bg-[#eaf1f7]'
                  }`}
                >
                  Ragu ({totalRagu})
                </button>
              )}
              {totalTidak > 0 && (
                <button
                  type="button"
                  onClick={() => setFilter('tidak')}
                  className={`px-2.5 py-1 rounded-lg transition-colors font-semibold cursor-pointer ${
                    filter === 'tidak' ? 'bg-red-600 text-white shadow-xs' : 'bg-white text-[#527595] hover:bg-[#eaf1f7]'
                  }`}
                >
                  Tidak ({totalTidak})
                </button>
              )}
              <button
                type="button"
                onClick={() => fetchWishes(true)}
                title="Perbarui daftar ucapan"
                className="p-1 rounded-lg bg-white text-[#527595] hover:bg-[#eaf1f7] transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#5797d0]' : ''}`} />
              </button>
            </div>
          </div>

          {/* Scrollable list */}
          <div 
            ref={wishListRef}
            id="wish-list-container"
            className="max-h-[360px] overflow-y-auto space-y-3 pr-1.5 scroll-smooth"
          >
            {filteredWishes.length === 0 ? (
              <div className="bg-white rounded-xl p-6 text-center text-[#527595] font-patrick border border-dashed border-[#d2e3f3]">
                Belum ada ucapan untuk kategori ini. Jadilah yang pertama mengirimkan ucapan dan doa restu!
              </div>
            ) : (
              filteredWishes.map((item) => {
                const isJustAdded = newlyAddedId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl p-3.5 sm:p-4 shadow-xs transition-all relative ${
                      isJustAdded
                        ? 'bg-[#f3f9fe] border-2 border-[#5797d0] ring-2 ring-[#5797d0]/20'
                        : 'bg-white border border-[#5797d0]/12 hover:border-[#5797d0]/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-patrick font-bold text-base sm:text-lg text-[#2d3748]">
                          {item.name}
                        </span>
                        {isJustAdded && (
                          <span className="flex items-center gap-1 text-[11px] font-patrick font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <Sparkles className="w-3 h-3 text-emerald-600" /> Baru Saja
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[11px] font-patrick px-2.5 py-0.5 rounded-full font-semibold shrink-0 ${
                          item.attendance === 'hadir'
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : item.attendance === 'ragu'
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : 'bg-red-100 text-red-700 border border-red-200'
                        }`}
                      >
                        {item.attendance === 'hadir' ? '✓ Hadir' : item.attendance === 'ragu' ? '? Ragu-ragu' : '✗ Tidak Hadir'}
                      </span>
                    </div>

                    <p className="font-patrick text-sm sm:text-base text-[#4a5568] leading-relaxed break-words whitespace-pre-line">
                      {item.message}
                    </p>

                    <div className="text-[11px] text-[#718096] font-patrick mt-2 flex items-center justify-between">
                      <span className="text-[#a0aec0]">Doa Restu Tamu</span>
                      <span>{item.timestamp}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
