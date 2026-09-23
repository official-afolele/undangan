import React, { useState, useEffect } from 'react';
import { WeddingConfig } from '../types';
import { audioController } from '../utils/audioPlayer';
import { Play, Pause, RotateCcw, SkipBack, SkipForward, Music } from 'lucide-react';

interface Page2TitleQuoteProps {
  config: WeddingConfig;
}

export const Page2TitleQuote: React.FC<Page2TitleQuoteProps> = ({ config }) => {
  const [isPlaying, setIsPlaying] = useState(audioController.isPlaying);
  const [progress, setProgress] = useState(audioController.progress);
  const [isRepeat, setIsRepeat] = useState(false);

  useEffect(() => {
    const unsubscribe = audioController.subscribe(() => {
      setIsPlaying(audioController.isPlaying);
      setProgress(audioController.progress);
    });
    return unsubscribe;
  }, []);

  const handleTogglePlay = () => {
    audioController.toggle();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newProgress = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    audioController.seek(newProgress);
  };

  return (
    <section className="relative w-full px-4 pt-10 pb-6 text-center overflow-hidden">
      {/* Floating Love Animation background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none" aria-hidden="true">
        <span className="absolute left-[10%] top-[14%] text-[#f6a8cf] text-2xl font-caveat animate-love-drift opacity-75">♡</span>
        <span className="absolute right-[12%] top-[20%] text-[#f6a8cf] text-3xl font-caveat animate-love-drift opacity-80" style={{ animationDelay: '1.2s' }}>♡</span>
        <span className="absolute left-[16%] top-[45%] text-[#f6a8cf] text-xl font-caveat animate-love-drift opacity-70" style={{ animationDelay: '2.1s' }}>♡</span>
        <span className="absolute right-[14%] top-[50%] text-[#f6a8cf] text-2xl font-caveat animate-love-drift opacity-75" style={{ animationDelay: '3s' }}>♡</span>
        <span className="absolute left-[26%] top-[70%] text-[#f6a8cf] text-lg font-caveat animate-love-drift opacity-65" style={{ animationDelay: '1.8s' }}>♡</span>
        <span className="absolute right-[24%] top-[65%] text-[#f6a8cf] text-xl font-caveat animate-love-drift opacity-70" style={{ animationDelay: '3.5s' }}>♡</span>
      </div>

      <div className="relative z-10 max-w-sm sm:max-w-md mx-auto">
        <p className="font-patrick text-lg sm:text-xl text-[#5797d0] mb-1 tracking-wide">
          The Wedding of
        </p>

        {/* Groom & Bride Names - Fully responsive without horizontal overflow */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 my-2 w-full">
          <span className="font-caveat text-4xl sm:text-5xl md:text-6xl font-bold text-[#5797d0] transform -rotate-2 drop-shadow-xs">
            {config.groom.name}
          </span>
          <span className="font-caveat text-3xl sm:text-4xl text-[#ef72b4] font-semibold">
            &
          </span>
          <span className="font-caveat text-4xl sm:text-5xl md:text-6xl font-bold text-[#5797d0] transform rotate-2 drop-shadow-xs">
            {config.bride.name}
          </span>
        </div>

        {/* Quran Quote Box */}
        <div className="relative mt-6 mb-8 mx-auto w-full bg-[#facfe5] text-[#5797d0] p-5 sm:p-6 rounded-[24px] shadow-[0_5px_0_rgba(226,143,184,0.45)] border border-[#f8b8d7]">
          <p className="font-patrick text-sm sm:text-base leading-relaxed text-center italic">
            "{config.quote}"
          </p>
          <p className="font-caveat text-lg sm:text-xl font-bold text-[#5797d0] mt-3">
            ({config.quoteSource})
          </p>
        </div>

        {/* Music Player */}
        <div className="w-full bg-white/80 backdrop-blur-xs rounded-2xl p-4 sm:p-5 shadow-sm border border-[#5797d0]/20 my-4">
          <div className="flex items-center justify-center gap-2 mb-2 text-[#5797d0]">
            <Music className={`w-4 h-4 ${isPlaying ? 'animate-bounce text-[#ef72b4]' : ''}`} />
            <span className="font-caveat text-xl sm:text-2xl font-bold">
              {config.musicTitle}
            </span>
          </div>

          {/* Progress Bar */}
          <div 
            onClick={handleSeek}
            className="w-full max-w-[240px] mx-auto h-2 bg-[#d7e6f4] rounded-full my-3 cursor-pointer relative overflow-hidden"
            title="Klik untuk memutar posisi lagu"
          >
            <div 
              className="h-full bg-[#5797d0] rounded-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 mt-2">
            <button
              type="button"
              onClick={() => audioController.seek(0)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#5797d0] hover:bg-[#5797d0]/10 active:scale-95 transition-all cursor-pointer"
              title="Mulai Ulang"
              aria-label="Mulai Ulang Lagu"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              id="main-play-btn"
              type="button"
              onClick={handleTogglePlay}
              className="w-12 h-12 rounded-full bg-[#5797d0] hover:bg-[#4887bf] text-white flex items-center justify-center shadow-[0_3px_0_#3f78a8] active:shadow-[0_1px_0_#3f78a8] active:translate-y-0.5 transition-all cursor-pointer"
              aria-label={isPlaying ? 'Jeda Musik' : 'Putar Musik'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current translate-x-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => audioController.seek(100)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#5797d0] hover:bg-[#5797d0]/10 active:scale-95 transition-all cursor-pointer"
              title="Lewati"
              aria-label="Lewati Lagu"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsRepeat(!isRepeat)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isRepeat ? 'text-[#ef72b4] bg-[#facfe5]' : 'text-[#5797d0] hover:bg-[#5797d0]/10'
              }`}
              title="Ulangi"
              aria-label="Ulangi Lagu"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <p className="font-patrick text-sm text-[#5797d0] mt-2">
            {isPlaying ? '♪ Sedang memutar lagu pernikahan kami ♪' : 'Klik untuk memutar lagu kami! ♡'}
          </p>
        </div>

        {/* Hand Illustration connecting hands into heart */}
        <div className="w-full h-24 sm:h-28 my-3 overflow-hidden flex items-center justify-center">
          <svg
            viewBox="0 0 500 160"
            preserveAspectRatio="none"
            className="w-full max-w-[420px] h-full"
          >
            <path
              className="fill-none stroke-[#9ac3de] stroke-[3.2] stroke-linecap-round stroke-linejoin-round"
              d="
                M0 145
                C35 140 55 117 83 108
                C103 101 121 108 137 120
                C151 131 164 136 177 132
                C194 127 206 111 219 96
              "
            />
            <path
              className="fill-none stroke-[#9ac3de] stroke-[3.2] stroke-linecap-round stroke-linejoin-round"
              d="M3 150 C40 147 65 126 88 118"
            />
            <path
              className="fill-none stroke-[#9ac3de] stroke-[3.2] stroke-linecap-round stroke-linejoin-round"
              d="
                M500 145
                C465 140 445 117 417 108
                C397 101 379 108 363 120
                C349 131 336 136 323 132
                C306 127 294 111 281 96
              "
            />
            <path
              className="fill-none stroke-[#9ac3de] stroke-[3.2] stroke-linecap-round stroke-linejoin-round"
              d="M497 150 C460 147 435 126 412 118"
            />
            {/* Center Heart */}
            <path
              className="fill-none stroke-[#ef72b4] stroke-[3.5] stroke-linecap-round stroke-linejoin-round"
              d="
                M219 96
                C207 78 207 64 218 56
                C228 49 239 57 250 69
                C261 57 272 49 282 56
                C293 64 293 78 281 96
                C268 114 250 128 250 128
                C250 128 232 114 219 96
              "
            />
          </svg>
        </div>
      </div>
    </section>
  );
};
