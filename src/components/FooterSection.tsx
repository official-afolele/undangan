import React, { useState } from 'react';
import { WeddingConfig } from '../types';

interface FooterSectionProps {
  config: WeddingConfig;
  onOpenAdmin?: () => void;
}

// Komponen Hati Animasi Hilang Muncul (Twinkling / Fading Heart)
const TwinkleHeart: React.FC<{
  className?: string;
  color?: string;
  outlineColor?: string;
  size?: number;
  delay?: string;
  duration?: string;
  rotate?: number;
}> = ({
  className = '',
  color = '#f6a8cf',
  outlineColor = '#ef72b4',
  size = 22,
  delay = '0s',
  duration = '3.2s',
  rotate = 0,
}) => {
  return (
    <div
      className={`absolute pointer-events-none select-none anim-heart-twinkle ${className}`}
      style={{
        animationDelay: delay,
        animationDuration: duration,
        transform: `rotate(${rotate}deg)`,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-xs"
      >
        {/* Fill lembut transparan */}
        <path
          d="M 16,28.5 C 15.2,27.8 2.5,17.2 2.5,9.8 C 2.5,4.6 6.6,1.5 11.2,1.5 C 13.9,1.5 15.3,2.8 16,3.6 C 16.7,2.8 18.1,1.5 20.8,1.5 C 25.4,1.5 29.5,4.6 29.5,9.8 C 29.5,17.2 16.8,27.8 16,28.5 Z"
          fill={color}
          opacity="0.85"
        />
        {/* Outline garis coretan manis */}
        <path
          d="M 16,28.5 C 15.2,27.8 2.5,17.2 2.5,9.8 C 2.5,4.6 6.6,1.5 11.2,1.5 C 13.9,1.5 15.3,2.8 16,3.6 C 16.7,2.8 18.1,1.5 20.8,1.5 C 25.4,1.5 29.5,4.6 29.5,9.8 C 29.5,17.2 16.8,27.8 16,28.5 Z"
          stroke={outlineColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Aksen kilau putih */}
        <path
          d="M 6.5 8 C 6.5 6 8.5 4 10.5 4"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.8"
        />
      </svg>
    </div>
  );
};

export const FooterSection: React.FC<FooterSectionProps> = ({ config, onOpenAdmin }) => {
  const [clickCount, setClickCount] = useState(0);

  // Secret 5-clicks shortcut for couple to access admin without typing URL
  const handleSecretFooterClick = () => {
    if (!onOpenAdmin) return;
    const nextCount = clickCount + 1;
    setClickCount(nextCount);
    if (nextCount >= 5) {
      setClickCount(0);
      onOpenAdmin();
    }
  };

  return (
    <footer className="w-full px-4 pt-8 pb-24 sm:pb-14 text-center select-none overflow-hidden relative">
      {/* Style Animasi Hilang Muncul (Fade In - Scale Up - Fade Out) */}
      <style>{`
        @keyframes heartFadeTwinkle {
          0% {
            opacity: 0;
            transform: scale(0.4) translateY(6px);
          }
          25% {
            opacity: 0.95;
            transform: scale(1.15) translateY(-2px);
          }
          45% {
            opacity: 1;
            transform: scale(1) translateY(-4px);
          }
          75% {
            opacity: 0.9;
            transform: scale(1.05) translateY(-6px);
          }
          100% {
            opacity: 0;
            transform: scale(0.5) translateY(-10px);
          }
        }

        .anim-heart-twinkle {
          animation: heartFadeTwinkle 3.4s ease-in-out infinite;
        }
      `}</style>

      <div className="relative max-w-sm sm:max-w-md mx-auto py-3">
        {/* ================= LOVE HILANG MUNCUL SISI KIRI (Sesuai Titik Merah) ================= */}
        {/* Titik 1: Kiri atas dekat See You at Our Wedding Day */}
        <TwinkleHeart
          className="left-[2%] top-[0%]"
          size={26}
          color="#facfe5"
          outlineColor="#ef72b4"
          rotate={-16}
          delay="0s"
          duration="3.2s"
        />

        {/* Titik 2: Kiri agak bawah (samping nama Jaka) */}
        <TwinkleHeart
          className="left-[6%] top-[34%]"
          size={20}
          color="#dbeafc"
          outlineColor="#5797d0"
          rotate={14}
          delay="1.1s"
          duration="3.6s"
        />

        {/* Titik 3: Kiri bawah (antara nama dan With Love) */}
        <TwinkleHeart
          className="left-[1%] top-[62%]"
          size={24}
          color="#fce4ec"
          outlineColor="#ef72b4"
          rotate={-22}
          delay="2.2s"
          duration="3.4s"
        />

        {/* Titik 4: Kiri paling bawah */}
        <TwinkleHeart
          className="left-[12%] top-[86%]"
          size={18}
          color="#dbeafc"
          outlineColor="#5797d0"
          rotate={10}
          delay="0.6s"
          duration="3.8s"
        />

        {/* ================= LOVE HILANG MUNCUL SISI KANAN (Sesuai Titik Merah) ================= */}
        {/* Titik 5: Kanan atas dekat See You at Our Wedding Day */}
        <TwinkleHeart
          className="right-[3%] top-[2%]"
          size={24}
          color="#dbeafc"
          outlineColor="#5797d0"
          rotate={18}
          delay="0.8s"
          duration="3.5s"
        />

        {/* Titik 6: Kanan agak bawah (samping nama Dian) */}
        <TwinkleHeart
          className="right-[5%] top-[36%]"
          size={22}
          color="#facfe5"
          outlineColor="#ef72b4"
          rotate={-14}
          delay="1.9s"
          duration="3.3s"
        />

        {/* Titik 7: Kanan bawah (antara nama dan With Love) */}
        <TwinkleHeart
          className="right-[2%] top-[64%]"
          size={25}
          color="#dbeafc"
          outlineColor="#5797d0"
          rotate={20}
          delay="0.3s"
          duration="3.7s"
        />

        {/* Titik 8: Kanan paling bawah */}
        <TwinkleHeart
          className="right-[10%] top-[88%]"
          size={20}
          color="#fce4ec"
          outlineColor="#ef72b4"
          rotate={-8}
          delay="1.5s"
          duration="3.4s"
        />

        {/* ================= TEKS KONTEN ================= */}
        <p className="font-patrick text-lg sm:text-xl text-[#5797d0] tracking-wide relative z-10">
          See You at Our Wedding Day
        </p>

        <div className="font-caveat text-4xl sm:text-5xl font-bold text-[#ef72b4] my-2 relative z-10 drop-shadow-xs">
          {config.groom.name} & {config.bride.name}
        </div>

        <p 
          onClick={handleSecretFooterClick}
          className="font-patrick text-base text-[#5797d0] mt-1 cursor-default relative z-10 transition-transform active:scale-95"
        >
          With Love ♡
        </p>
      </div>
    </footer>
  );
};
