import React from 'react';
import { WeddingConfig } from '../types';
import { RingExchangeIllustration } from './RingExchangeIllustration';

interface Page2TitleQuoteProps {
  config: WeddingConfig;
}

export const Page2TitleQuote: React.FC<Page2TitleQuoteProps> = ({ config }) => {
  return (
    <section className="relative w-full px-4 pt-10 pb-4 text-center overflow-hidden">
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

        {/* Groom & Bride Names */}
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
        <div className="relative mt-6 mb-6 mx-auto w-full bg-[#facfe5] text-[#5797d0] p-5 sm:p-6 rounded-[24px] shadow-[0_5px_0_rgba(226,143,184,0.45)] border border-[#f8b8d7]">
          <p className="font-patrick text-sm sm:text-base leading-relaxed text-center italic">
            "{config.quote}"
          </p>
          <p className="font-caveat text-lg sm:text-xl font-bold text-[#5797d0] mt-3">
            ({config.quoteSource})
          </p>
        </div>

        {/* Ilustrasi cincin & tangan romantis berdetak */}
        <RingExchangeIllustration />
      </div>
    </section>
  );
};
