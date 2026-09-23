import React from 'react';
import { Heart } from 'lucide-react';
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
  onEditPhoto,
}) => {
  return (
    <section 
      id="cover-section"
      className="relative min-h-[100dvh] w-full flex flex-col items-center justify-center px-4 py-8 overflow-hidden text-center select-none"
    >
      {/* Decorative Floating Hearts */}
      <div 
        aria-hidden="true" 
        className="absolute top-[18%] left-[6%] sm:left-[10%] text-2xl sm:text-3xl text-[#ef73b6] animate-soft-float pointer-events-none opacity-80"
      >
        ♡
      </div>
      <div 
        aria-hidden="true" 
        className="absolute top-[38%] right-[6%] sm:right-[10%] text-3xl sm:text-4xl text-[#8ec5ed] animate-soft-float pointer-events-none opacity-75"
        style={{ animationDelay: '1.5s' }}
      >
        ♡
      </div>
      <div 
        aria-hidden="true" 
        className="absolute bottom-[16%] right-[10%] sm:right-[14%] text-2xl sm:text-3xl text-[#ef73b6] animate-soft-float pointer-events-none opacity-80"
        style={{ animationDelay: '2.5s' }}
      >
        ♡
      </div>
      <div 
        aria-hidden="true" 
        className="absolute bottom-[20%] left-[8%] sm:left-[12%] text-xl sm:text-2xl text-[#8ec5ed] animate-soft-float pointer-events-none opacity-75"
        style={{ animationDelay: '0.8s' }}
      >
        ♡
      </div>

      <div className="w-full max-w-sm sm:max-w-md mx-auto flex flex-col items-center z-10">
        {/* Bow Art */}
        <div className="text-3xl sm:text-4xl text-[#82bce8] mb-1 tracking-widest leading-none font-bold">
          ⌁⌁♡⌁⌁
        </div>

        {/* Small Intro Header */}
        <h2 className="font-amatic text-2xl sm:text-3xl text-[#5797d0] tracking-wider uppercase font-bold">
          THESE COUPLE ARE
        </h2>

        {/* Getting Married Display Title */}
        <h1 className="font-caveat text-4xl sm:text-5xl md:text-6xl text-[#5797d0] font-bold mt-0.5 mb-1 leading-tight">
          Getting Married
        </h1>

        {/* Wedding Date */}
        <p className="font-patrick text-lg sm:text-xl text-[#5797d0] tracking-wide mb-3">
          26 Desember 2026
        </p>

        {/* Couple Polaroid Photos */}
        <div className="flex items-end justify-center gap-3 sm:gap-4 my-2 w-full">
          {/* Groom */}
          <div className="flex flex-col items-center w-[100px] sm:w-[115px]">
            <div 
              onClick={() => onEditPhoto?.('groom')}
              className={`relative transform -rotate-3 hover:rotate-0 transition-transform duration-300 p-1.5 bg-white border-[5px] sm:border-[6px] border-[#ead9b1] rounded-sm shadow-md ${
                onEditPhoto ? 'cursor-pointer group' : ''
              }`}
            >
              <img
                src={normalizeImageUrl(config.groom.photo)}
                alt={config.groom.name}
                loading="eager"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.includes('unsplash.com')) {
                    target.src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80';
                  }
                }}
                className="w-[84px] h-[110px] sm:w-[98px] sm:h-[126px] object-cover rounded-xs"
              />
              {/* Animated Love Icon Badge */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditPhoto?.('groom');
                }}
                className={`absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-linear-to-tr from-[#5797d0] to-[#7fb3e0] text-white flex items-center justify-center shadow-md border-2 border-white transition-all ${
                  onEditPhoto ? 'cursor-pointer hover:scale-115 active:scale-95' : 'pointer-events-none'
                }`}
                title={onEditPhoto ? "Ganti Foto Pria" : "Pengantin Pria"}
              >
                <Heart className="w-3 h-3 fill-white text-white animate-heartbeat drop-shadow-xs" />
              </button>
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              <span className="font-caveat text-2xl sm:text-3xl font-semibold text-[#ed72b5] leading-none">
                {config.groom.name}
              </span>
            </div>
          </div>

          {/* Bride */}
          <div className="flex flex-col items-center w-[100px] sm:w-[115px]">
            <div 
              onClick={() => onEditPhoto?.('bride')}
              className={`relative transform rotate-3 hover:rotate-0 transition-transform duration-300 p-1.5 bg-white border-[5px] sm:border-[6px] border-[#ead9b1] rounded-sm shadow-md ${
                onEditPhoto ? 'cursor-pointer group' : ''
              }`}
            >
              <img
                src={normalizeImageUrl(config.bride.photo)}
                alt={config.bride.name}
                loading="eager"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.includes('unsplash.com')) {
                    target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
                  }
                }}
                className="w-[84px] h-[110px] sm:w-[98px] sm:h-[126px] object-cover rounded-xs"
              />
              {/* Animated Love Icon Badge */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditPhoto?.('bride');
                }}
                className={`absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-linear-to-tr from-[#ef72b4] to-[#f898cb] text-white flex items-center justify-center shadow-md border-2 border-white transition-all ${
                  onEditPhoto ? 'cursor-pointer hover:scale-115 active:scale-95' : 'pointer-events-none'
                }`}
                title={onEditPhoto ? "Ganti Foto Wanita" : "Pengantin Wanita"}
              >
                <Heart className="w-3 h-3 fill-white text-white animate-heartbeat drop-shadow-xs" />
              </button>
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              <span className="font-caveat text-2xl sm:text-3xl font-semibold text-[#ed72b5] leading-none">
                {config.bride.name}
              </span>
            </div>
          </div>
        </div>

        {/* Guest Area */}
        <div className="w-full mt-4 mb-2 flex flex-col items-center">
          <span className="font-patrick text-base sm:text-lg text-[#5797d0]">
            Kepada Yth. Bapak/Ibu/Saudara/i:
          </span>
          <div className="mt-1 px-4 py-1.5 rounded-xl bg-white/75 border border-[#8ec5ed]/30 shadow-xs max-w-[92%]">
            <h3 className="font-patrick text-xl sm:text-2xl font-bold text-[#2d3748] break-words">
              {guestName || 'Tamu Undangan'}
            </h3>
          </div>
          <span className="font-patrick text-xs text-[#527595]/80 mt-1 italic">
            *Mohon maaf bila ada kesalahan penulisan nama/gelar
          </span>
        </div>

        {/* Open Button */}
        <button
          id="open-invitation-btn"
          type="button"
          onClick={onOpenInvitation}
          className="mt-3 px-8 py-3 rounded-full bg-[#91c7eb] hover:bg-[#7cb9e4] active:scale-95 text-white font-amatic text-2xl sm:text-3xl font-bold tracking-wider shadow-[0_5px_0_#6eacd6] active:shadow-[0_1px_0_#6eacd6] active:translate-y-1 transition-all duration-150 cursor-pointer min-h-[48px] flex items-center justify-center gap-2 group"
        >
          <span>Buka Undangan</span>
          <span className="group-hover:translate-x-1 transition-transform">💌</span>
        </button>

        {/* Bottom Doodle */}
        <div className="text-2xl sm:text-3xl text-[#5797d0] mt-3 tracking-widest font-bold">
          ⌁♡⌁
        </div>
      </div>
    </section>
  );
};
