import React from 'react';
import { Mail } from 'lucide-react';
import { WeddingConfig } from '../types';
import { normalizeImageUrl } from '../utils/imageUrl';

interface CoverSectionProps {
  config: WeddingConfig;
  guestName: string;
  onOpenInvitation: () => void;
  onEditPhoto?: (role: 'groom' | 'bride') => void;
}

export const CoverSection: React.FC<CoverSectionProps> = ({
  config,
  guestName,
  onOpenInvitation,
}) => {
  const bridePhotoUrl = normalizeImageUrl(config.bride.photo);
  const groomPhotoUrl = normalizeImageUrl(config.groom.photo);
  const coupleCoverUrl = config.couplePhoto && config.couplePhoto !== '/couple-photo.jpg'
    ? normalizeImageUrl(config.couplePhoto)
    : null;

  return (
    <section 
      id="cover-section"
      className="relative min-h-[100dvh] w-full flex flex-col justify-between overflow-hidden text-center select-none bg-[#1548a4]"
    >
      {/* ================= BACKGROUND PORTRAITS ================= */}
      <div className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden bg-[#1548a4]">
        {coupleCoverUrl ? (
          /* Single Combined Photo (Foto Berdua) */
          <img
            src={coupleCoverUrl}
            alt="Dian & Jaka"
            loading="eager"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center"
          />
        ) : (
          /* Side-by-Side: Dian di Kiri, Jaka di Kanan */
          <>
            {/* Sisi Kiri: Dian (Mempelai Wanita) */}
            <div className="absolute -left-[14%] sm:-left-[6%] top-[16%] sm:top-[14%] bottom-0 w-[64%] sm:w-[58%] flex items-end justify-start overflow-hidden">
              <img
                src={bridePhotoUrl}
                alt={config.bride.fullName || config.bride.name}
                loading="eager"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.includes('unsplash.com')) {
                    target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80';
                  }
                }}
                className="w-full h-full max-h-[82vh] object-cover object-top"
              />
            </div>

            {/* Sisi Kanan: Jaka (Mempelai Pria) */}
            <div className="absolute -right-[14%] sm:-right-[6%] top-[16%] sm:top-[14%] bottom-0 w-[64%] sm:w-[58%] flex items-end justify-end overflow-hidden">
              <img
                src={groomPhotoUrl}
                alt={config.groom.fullName || config.groom.name}
                loading="eager"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.includes('unsplash.com')) {
                    target.src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80';
                  }
                }}
                className="w-full h-full max-h-[82vh] object-cover object-top"
              />
            </div>
          </>
        )}
      </div>

      {/* Top Subtle Blue Gradient (Senada 100% dengan biru latar pas foto #1548a4) */}
      <div 
        aria-hidden="true" 
        className="absolute inset-x-0 top-0 h-44 sm:h-52 bg-gradient-to-b from-[#113e8d]/80 via-[#1548a4]/50 to-transparent pointer-events-none z-10" 
      />

      {/* Center Subtle Blue Blend */}
      <div 
        aria-hidden="true" 
        className="absolute inset-0 bg-gradient-to-r from-transparent via-[#1548a4]/30 to-transparent pointer-events-none z-10" 
      />

      {/* Bottom Royal Blue Gradient Overlay */}
      <div 
        aria-hidden="true" 
        className="absolute inset-x-0 bottom-0 h-72 sm:h-80 bg-gradient-to-t from-[#0e3373] via-[#124294]/85 to-transparent pointer-events-none z-10" 
      />

      {/* ================= TOP HEADER: Dian & Jaka ================= */}
      <div className="relative z-20 pt-14 sm:pt-16 px-4 flex flex-col items-center">
        <h1 className="font-['Alex_Brush',cursive] text-5xl sm:text-6xl md:text-7xl text-white font-normal tracking-wide drop-shadow-[0_2px_12px_rgba(7,25,58,0.7)] leading-tight select-none">
          Dian &amp; Jaka
        </h1>

        <p className="font-sans text-xs sm:text-sm text-sky-100/95 font-medium tracking-wide mt-1 drop-shadow-[0_1px_4px_rgba(7,25,58,0.7)]">
          {config.akad?.dateStr || config.resepsi?.dateStr || 'Sabtu, 26 Desember 2026'}
        </p>
      </div>

      {/* Center Spacer */}
      <div className="relative z-20 flex-1" />

      {/* ================= BOTTOM INVITATION AREA ================= */}
      <div className="relative z-20 pb-12 sm:pb-16 px-4 sm:px-6 flex flex-col items-center max-w-sm sm:max-w-md mx-auto w-full">
        <span className="font-sans text-xs sm:text-sm text-sky-100/90 font-normal tracking-wide drop-shadow-sm">
          Kepada Yth. Bpk/Ibu/Sdr/i
        </span>

        <h2 className="font-['Playfair_Display',serif] text-2xl sm:text-3xl font-bold text-white mt-1.5 mb-1 tracking-wide drop-shadow-[0_2px_10px_rgba(7,25,58,0.7)] break-words text-center max-w-full">
          {guestName || 'Nama Tamu'}
        </h2>

        <p className="font-['Playfair_Display',serif] italic text-[11px] sm:text-xs text-sky-200/85 tracking-wide drop-shadow-sm text-center">
          *) Mohon maaf apabila ada kesalahan dalam penulisan nama/gelar
        </p>

        {/* Glowing White Border Button */}
        <button
          id="open-invitation-btn"
          type="button"
          onClick={onOpenInvitation}
          className="mt-4 px-6 sm:px-7 py-2.5 rounded-xl bg-[#1d52a8]/70 hover:bg-[#2561c2]/85 active:scale-95 border-2 border-white/90 text-white font-sans text-xs sm:text-sm font-medium tracking-wide backdrop-blur-md shadow-[0_0_18px_rgba(255,255,255,0.45)] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 group min-h-[42px]"
        >
          <Mail className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
          <span>Buka Undangan</span>
        </button>
      </div>
    </section>
  );
};
