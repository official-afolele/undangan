import React from 'react';
import { WeddingConfig } from '../types';

interface LoveStorySectionProps {
  config: WeddingConfig;
}

export const LoveStorySection: React.FC<LoveStorySectionProps> = ({ config }) => {
  return (
    <section id="cerita" className="w-full px-4 py-8 text-center">
      <div className="max-w-sm sm:max-w-md mx-auto">
        <h2 className="font-caveat text-4xl sm:text-5xl font-bold text-[#5d99d1] mb-8">
          Love Story
        </h2>

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
