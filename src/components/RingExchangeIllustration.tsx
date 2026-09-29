import React from 'react';

interface RingExchangeIllustrationProps {
  className?: string;
}

export const RingExchangeIllustration: React.FC<RingExchangeIllustrationProps> = ({
  className = 'w-full max-w-[420px] h-32 sm:h-36',
}) => {
  return (
    <div className="w-full flex flex-col items-center justify-center my-3 select-none">
      <svg
        viewBox="0 0 540 200"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Ilustrasi tangan memasang cincin dengan animasi hati berdetak"
      >
        <defs>
          <linearGradient id="ringGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE082" />
            <stop offset="50%" stopColor="#FFA000" />
            <stop offset="100%" stopColor="#FFD54F" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <style>{`
            @keyframes loveHeartbeat {
              0%, 100% { transform: scale(1) translateY(0); }
              14% { transform: scale(1.3) translateY(-4px); }
              28% { transform: scale(1) translateY(0); }
              42% { transform: scale(1.2) translateY(-2px); }
              70% { transform: scale(1) translateY(0); }
            }
            @keyframes floatLoveLeft {
              0%, 100% { transform: translateY(0) rotate(-6deg); }
              50% { transform: translateY(-8px) rotate(4deg); }
            }
            @keyframes floatLoveRight {
              0%, 100% { transform: translateY(0) rotate(6deg); }
              50% { transform: translateY(-9px) rotate(-6deg); }
            }
            @keyframes driftUpLove {
              0% { transform: translateY(4px) scale(0.6); opacity: 0; }
              30% { opacity: 0.9; }
              80% { opacity: 0.7; }
              100% { transform: translateY(-22px) scale(1.1); opacity: 0; }
            }
            @keyframes diamondSparkle {
              0%, 100% { transform: scale(0.85) rotate(0deg); opacity: 0.7; }
              50% { transform: scale(1.25) rotate(20deg); opacity: 1; }
            }
            .anim-heart-beat {
              animation: loveHeartbeat 1.6s cubic-bezier(0.25, 0.1, 0.25, 1) infinite;
              transform-origin: 248px 46px;
            }
            .anim-heart-float-left {
              animation: floatLoveLeft 2.4s ease-in-out infinite;
              transform-origin: 178px 80px;
            }
            .anim-heart-float-right {
              animation: floatLoveRight 2.8s ease-in-out infinite;
              transform-origin: 322px 68px;
            }
            .anim-drift-1 {
              animation: driftUpLove 3s ease-in-out infinite;
              transform-origin: 236px 30px;
            }
            .anim-drift-2 {
              animation: driftUpLove 3.2s ease-in-out 1.5s infinite;
              transform-origin: 260px 26px;
            }
            .anim-sparkle-center {
              animation: diamondSparkle 1.8s ease-in-out infinite;
              transform-origin: 248px 68px;
            }
            .anim-sparkle-side {
              animation: diamondSparkle 2.2s ease-in-out 0.6s infinite;
              transform-origin: 266px 58px;
            }
          `}</style>
        </defs>

        <path d="M15 155 C70 148 115 125 150 115" stroke="#b8d5ea" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 6" />
        <path d="M525 155 C470 148 425 125 390 115" stroke="#b8d5ea" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 6" />

        {/* Tangan Pria (Kiri) */}
        <path d="M40 160 C75 152 105 142 135 130 C155 122 175 110 190 98" stroke="#5797d0" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M55 180 C95 174 130 162 165 148 C185 140 200 130 215 118" stroke="#5797d0" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M175 112 C185 100 200 88 215 82 C228 78 238 82 242 92 C244 98 242 105 235 112 C228 118 218 122 208 125" stroke="#5797d0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M190 98 C202 86 218 72 235 68 C248 65 258 72 258 84 C257 94 250 102 240 108 C232 113 222 116 215 118" stroke="#5797d0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M185 125 C198 128 210 128 220 124 C228 121 232 115 230 110" stroke="#5797d0" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M178 138 C190 141 202 140 212 135" stroke="#5797d0" strokeWidth="2.5" strokeLinecap="round" />

        {/* Tangan Wanita (Kanan) */}
        <path d="M500 160 C465 152 435 142 405 130 C385 122 365 112 350 102" stroke="#5797d0" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M485 180 C445 174 410 162 375 148 C355 140 338 130 322 118" stroke="#5797d0" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M345 106 C325 100 300 95 272 94 C255 93 240 95 230 98" stroke="#ef72b4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M232 98 C222 100 215 104 212 107 C210 110 213 113 218 113 C226 113 240 108 252 105" stroke="#ef72b4" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M352 98 C332 90 305 82 278 80 C264 79 252 82 248 88 C246 92 250 95 260 96 C275 97 298 102 315 106" stroke="#5797d0" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M360 92 C342 82 320 72 296 68 C282 66 272 70 270 76 C269 80 274 83 285 85" stroke="#5797d0" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M340 116 C322 112 302 110 285 110 C276 110 270 113 272 117 C275 120 286 122 305 122" stroke="#5797d0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M375 132 C362 126 348 124 336 126" stroke="#5797d0" strokeWidth="2.5" strokeLinecap="round" />

        {/* Cincin Emas */}
        <g className="filter drop-shadow-xs">
          <ellipse cx="246" cy="98" rx="12" ry="19" transform="rotate(-15 246 98)" stroke="url(#ringGlow)" strokeWidth="4.5" />
          <ellipse cx="246" cy="98" rx="10" ry="17" transform="rotate(-15 246 98)" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.8" />
        </g>
        <polygon points="242,75 248,70 254,75 248,82" fill="#FFFFFF" stroke="#FFA000" strokeWidth="1.5" filter="url(#glow)" />

        {/* Kilau Bintang Emas */}
        <g className="anim-sparkle-center">
          <path d="M248 55 C249 63 253 67 261 68 C253 69 249 73 248 81 C247 73 243 69 235 68 C243 67 247 63 248 55 Z" fill="#F5A623" />
          <circle cx="248" cy="68" r="2.5" fill="#FFFFFF" />
        </g>
        <path d="M228 58 C228.5 62 230.5 64 234.5 64.5 C230.5 65 228.5 67 228 71 C227.5 67 225.5 65 221.5 64.5 C225.5 64 227.5 62 228 58 Z" fill="#FFA000" />
        <g className="anim-sparkle-side">
          <path d="M266 52 C266.5 56 268.5 58 272.5 58.5 C268.5 59 266.5 61 266 65 C265.5 61 263.5 59 259.5 58.5 C263.5 58 265.5 56 266 52 Z" fill="#FFA000" />
        </g>

        {/* Hati Berdetak & Melayang */}
        <g className="anim-heart-beat">
          <path d="M248 38 C242 27 230 28 228 36 C226 43 233 50 248 58 C263 50 270 43 268 36 C266 28 254 27 248 38 Z" fill="#f6a8cf" stroke="#ef72b4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M233 34 C234 32 237 31 239 32" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
        </g>
        <g className="anim-drift-1">
          <path d="M238 22 C234 16 228 17 227 22 C226 26 230 30 238 34 C246 30 250 26 249 22 C248 17 242 16 238 22 Z" fill="#facfe5" stroke="#ef72b4" strokeWidth="1.2" />
        </g>
        <g className="anim-drift-2">
          <path d="M258 18 C255 13 250 14 249 18 C248 21 251 25 258 28 C265 25 268 21 267 18 C266 14 261 13 258 18 Z" fill="#f8b8d7" stroke="#ef72b4" strokeWidth="1.2" />
        </g>
        <g className="anim-heart-float-left">
          <path d="M178 74 C174 67 167 68 165 73 C163 77 168 82 178 87 C188 82 193 77 191 73 C189 68 182 67 178 74 Z" fill="#facfe5" stroke="#ef72b4" strokeWidth="1.8" />
        </g>
        <g className="anim-heart-float-right">
          <path d="M322 62 C318 55 311 56 309 61 C307 65 312 70 322 75 C332 70 337 65 335 61 C333 56 326 55 322 62 Z" fill="#facfe5" stroke="#ef72b4" strokeWidth="1.8" />
        </g>
      </svg>
    </div>
  );
};
