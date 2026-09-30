import React from 'react';
import { WeddingConfig } from '../types';

interface LoveStorySectionProps {
  config: WeddingConfig;
}

// Komponen Love Animasi Crayon Doodle / Scribble Heart (Mendukung varian Pink dan Biru)
export const ScribbleHeart: React.FC<{
  color?: 'pink' | 'blue';
  className?: string;
}> = ({
  color = 'pink',
  className = 'w-10 h-10 sm:w-12 sm:h-12',
}) => {
  const isBlue = color === 'blue';

  const fillColor = isBlue ? '#eaf4fa' : '#fce4ec';
  const scribbleLineColor = isBlue ? '#9ac3de' : '#f6a5cf';
  const outlineColor1 = isBlue ? '#5797d0' : '#f48fb1';
  const outlineColor2 = isBlue ? '#427fb3' : '#f06292';
  const sparkColor = isBlue ? '#5797d0' : '#ef72b4';
  const sparkColorLight = isBlue ? '#9ac3de' : '#f48fb1';

  const animClass = isBlue ? 'anim-scribble-heart-left' : 'anim-scribble-heart-right';

  return (
    <div className="inline-flex items-center justify-center select-none shrink-0 relative">
      <style>{`
        @keyframes scribbleHeartBeatRight {
          0%, 100% {
            transform: scale(1) rotate(12deg);
          }
          14% {
            transform: scale(1.2) rotate(8deg);
          }
          28% {
            transform: scale(1) rotate(12deg);
          }
          42% {
            transform: scale(1.14) rotate(15deg);
          }
          70% {
            transform: scale(1) rotate(12deg);
          }
        }

        @keyframes scribbleHeartBeatLeft {
          0%, 100% {
            transform: scale(1) rotate(-12deg);
          }
          14% {
            transform: scale(1.2) rotate(-8deg);
          }
          28% {
            transform: scale(1) rotate(-12deg);
          }
          42% {
            transform: scale(1.14) rotate(-15deg);
          }
          70% {
            transform: scale(1) rotate(-12deg);
          }
        }

        @keyframes scribbleShimmer {
          0%, 100% {
            opacity: 0.85;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes floatLoveSpark {
          0% {
            transform: translateY(0) scale(0.6);
            opacity: 0;
          }
          30% {
            opacity: 0.9;
          }
          70% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-16px) scale(1.1);
            opacity: 0;
          }
        }

        .anim-scribble-heart-right {
          animation: scribbleHeartBeatRight 2s cubic-bezier(0.25, 0.1, 0.25, 1) infinite;
          transform-origin: center center;
        }

        .anim-scribble-heart-left {
          animation: scribbleHeartBeatLeft 2s cubic-bezier(0.25, 0.1, 0.25, 1) 0.3s infinite;
          transform-origin: center center;
        }

        .anim-scribble-lines {
          animation: scribbleShimmer 2.5s ease-in-out infinite;
        }

        .anim-spark-1 {
          animation: floatLoveSpark 2.8s ease-in-out infinite;
          transform-origin: center;
        }

        .anim-spark-2 {
          animation: floatLoveSpark 3.2s ease-in-out 1.2s infinite;
          transform-origin: center;
        }
      `}</style>

      <svg
        viewBox="0 0 100 100"
        className={`${className} ${animClass} drop-shadow-xs`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={`Animasi Love Crayon Scribble ${color}`}
      >
        {/* Lapisan dasar krayon transparan */}
        <path
          d="
            M 50,84 
            C 26,68 10,50 10,32 
            C 10,17 22,9 35,9 
            C 43,9 48,14 50,19 
            C 52,14 57,9 65,9 
            C 78,9 90,17 90,32 
            C 90,50 74,68 50,84 Z
          "
          fill={fillColor}
          opacity="0.65"
        />

        {/* Garis-garis arsir krayon di dalam hati */}
        <g className="anim-scribble-lines" stroke={scribbleLineColor} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.85">
          <path d="M 28 20 C 35 25, 45 35, 52 46" />
          <path d="M 22 30 C 32 38, 48 52, 58 64" />
          <path d="M 20 42 C 28 50, 42 64, 50 78" />
          <path d="M 68 18 C 60 26, 48 38, 40 50" />
          <path d="M 78 28 C 66 38, 52 56, 46 68" />
          <path d="M 80 40 C 70 50, 60 62, 52 74" />
          <path d="M 32 26 Q 42 38 48 55 T 46 72" strokeWidth="2.2" opacity="0.75" />
          <path d="M 62 24 Q 54 36 50 52 T 52 70" strokeWidth="2.2" opacity="0.75" />
          <path d="M 38 16 Q 44 28 58 40 T 70 54" strokeWidth="2" opacity="0.7" />
          <path d="M 25 36 Q 38 48 52 60 T 48 76" strokeWidth="2" opacity="0.7" />
        </g>

        {/* Kontur luar krayon 1 */}
        <path
          d="
            M 50,83 
            C 27,67 11,49 11,32 
            C 11,18 22,10 35,10 
            C 42,10 47,15 50,20 
            C 53,15 58,10 65,10 
            C 78,10 89,18 89,32 
            C 89,49 73,67 50,83 Z
          "
          stroke={outlineColor1}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Kontur luar krayon 2 */}
        <path
          d="
            M 50,81 
            C 29,65 14,48 14,33 
            C 14,20 23,12 34,12 
            C 41,12 46,16 49,22 
            C 52,16 57,12 64,12 
            C 75,12 86,20 86,33 
            C 86,48 71,65 50,81 Z
          "
          stroke={outlineColor2}
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.8"
        />

        {/* Kilau putih sketsa krayon di lengkungan */}
        <path
          d="M 22 24 C 20 28, 20 36, 24 44"
          stroke="#ffffff"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.75"
        />
      </svg>

      {/* Partikel hati kecil melayang */}
      <div className={`absolute -top-2 ${isBlue ? '-left-1' : '-right-1'} anim-spark-1 pointer-events-none`}>
        <span className="text-xs font-bold" style={{ color: sparkColor }}>♡</span>
      </div>
      <div className={`absolute -top-3 ${isBlue ? 'right-1' : 'left-1'} anim-spark-2 pointer-events-none`}>
        <span className="text-[10px] font-bold" style={{ color: sparkColorLight }}>♡</span>
      </div>
    </div>
  );
};

export const LoveStorySection: React.FC<LoveStorySectionProps> = ({ config }) => {
  return (
    <section id="cerita" className="w-full px-4 py-8 text-center scroll-mt-6">
      <div className="max-w-sm sm:max-w-md mx-auto">
        {/* Title Love Story diapit Love Biru (Kiri) dan Love Pink (Kanan) */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-8">
          {/* Love Biru di sebelah kiri */}
          <ScribbleHeart color="blue" />

          <h2 className="font-caveat text-4xl sm:text-5xl font-bold text-[#5d99d1]">
            Love Story
          </h2>

          {/* Love Pink di sebelah kanan */}
          <ScribbleHeart color="pink" />
        </div>

        {/* Timeline Container */}
        <div className="relative border-l-2 border-dashed border-[#ef76b8] ml-4 sm:ml-6 pl-6 sm:pl-8 text-left space-y-8 my-4">
          {config.stories.map((item, idx) => (
            <div key={idx} className="relative group">
              {/* Heart Badge Indicator */}
              <div className="absolute -left-[35px] sm:-left-[43px] top-0.5 w-6 h-6 rounded-full bg-[#ef76b8] text-white flex items-center justify-center text-xs shadow-xs select-none">
                ♥
              </div>

              {/* Story Content */}
              <div>
                <h3 className="font-amatic text-2xl sm:text-3xl font-bold text-[#5797d0] tracking-wide mb-1">
                  {item.title}
                </h3>
                <p className="font-patrick text-base sm:text-lg text-[#527595] leading-relaxed">
                  {item.story}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
