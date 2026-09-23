import React, { useState } from 'react';
import { WeddingConfig } from '../types';

interface FooterSectionProps {
  config: WeddingConfig;
  onOpenAdmin?: () => void;
}

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
    <footer className="w-full px-4 pt-8 pb-24 sm:pb-14 text-center select-none">
      <div className="max-w-sm sm:max-w-md mx-auto">
        <p className="font-patrick text-lg sm:text-xl text-[#5797d0] tracking-wide">
          See You at Our Wedding Day
        </p>

        <div className="font-caveat text-4xl sm:text-5xl font-bold text-[#ef72b4] my-2">
          {config.groom.name} & {config.bride.name}
        </div>

        <p 
          onClick={handleSecretFooterClick}
          className="font-patrick text-base text-[#5797d0] mt-1 cursor-default"
        >
          With Love ♡
        </p>
      </div>
    </footer>
  );
};
