import React from 'react';
import { WeddingConfig } from '../types';

interface BrideGroomSectionProps {
  config: WeddingConfig;
}

export const BrideGroomSection: React.FC<BrideGroomSectionProps> = ({ config }) => {
  return (
    <section id="mempelai" className="w-full px-4 py-8 text-center scroll-mt-6">
      <div className="max-w-sm sm:max-w-md mx-auto">
        <h2 className="font-caveat text-4xl sm:text-5xl font-bold text-[#5d99d1] mb-6">
          Bride & Groom
        </h2>

        {/* Groom Profile */}
        <div className="flex flex-col items-center my-4">
          <h3 className="font-caveat text-3xl sm:text-4xl font-bold text-[#ef72b4] mb-1">
            {config.groom.fullName}
          </h3>
          <p className="font-patrick text-base sm:text-lg text-[#527595] max-w-[300px] leading-snug">
            {config.groom.parents}
          </p>
        </div>

        {/* Ampersand Divider */}
        <div className="font-caveat text-5xl sm:text-6xl text-[#5797d0] my-2 font-bold select-none">
          &
        </div>

        {/* Bride Profile */}
        <div className="flex flex-col items-center my-4">
          <h3 className="font-caveat text-3xl sm:text-4xl font-bold text-[#ef72b4] mb-1">
            {config.bride.fullName}
          </h3>
          <p className="font-patrick text-base sm:text-lg text-[#527595] max-w-[300px] leading-snug">
            {config.bride.parents}
          </p>
        </div>
      </div>
    </section>
  );
};
