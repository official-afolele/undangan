import React from 'react';
import { WeddingConfig } from '../types';
import { MapPin, Clock, Calendar } from 'lucide-react';

interface EventDetailsSectionProps {
  config: WeddingConfig;
}

export const EventDetailsSection: React.FC<EventDetailsSectionProps> = ({ config }) => {
  return (
    <section className="w-full px-4 py-6 text-center">
      <div className="max-w-sm sm:max-w-md mx-auto space-y-6">
        {/* AKAD NIKAH CARD */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-[#5797d0]/15 text-center relative overflow-hidden">
          <div className="inline-block px-4 py-1 rounded-full bg-[#fae8f2] text-[#ef72b4] font-patrick text-xs sm:text-sm font-semibold mb-2">
            Sakral & Khidmat
          </div>

          <h3 className="font-amatic text-4xl sm:text-5xl font-bold text-[#ef72b4] tracking-wide">
            {config.akad.title}
          </h3>

          <div className="flex items-center justify-center gap-2 mt-3 font-patrick text-lg sm:text-xl text-[#5797d0]">
            <Calendar className="w-5 h-5 text-[#5797d0]" />
            <span>{config.akad.dateStr}</span>
          </div>

          <div className="flex items-center justify-center gap-2 mt-1 font-patrick text-base sm:text-lg text-[#527595]">
            <Clock className="w-4 h-4 text-[#527595]" />
            <span>{config.akad.timeStr}</span>
          </div>

          <div className="mt-4 pt-3 border-t border-dashed border-[#5797d0]/20">
            <h4 className="font-patrick text-lg sm:text-xl font-bold text-[#5797d0] flex items-center justify-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#ef72b4]" />
              <span>{config.akad.venueName}</span>
            </h4>
            <p className="font-patrick text-sm sm:text-base text-[#527595] mt-1 leading-relaxed px-2">
              {config.akad.address}
            </p>
          </div>
        </div>

        {/* RESEPSI CARD */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-[#5797d0]/15 text-center relative overflow-hidden">
          <div className="inline-block px-4 py-1 rounded-full bg-[#e8f2fa] text-[#5797d0] font-patrick text-xs sm:text-sm font-semibold mb-2">
            Syukuran & Perayaan
          </div>

          <h3 className="font-amatic text-4xl sm:text-5xl font-bold text-[#ef72b4] tracking-wide">
            {config.resepsi.title}
          </h3>

          <div className="flex items-center justify-center gap-2 mt-3 font-patrick text-lg sm:text-xl text-[#5797d0]">
            <Calendar className="w-5 h-5 text-[#5797d0]" />
            <span>{config.resepsi.dateStr}</span>
          </div>

          <div className="flex items-center justify-center gap-2 mt-1 font-patrick text-base sm:text-lg text-[#527595]">
            <Clock className="w-4 h-4 text-[#527595]" />
            <span>{config.resepsi.timeStr}</span>
          </div>

          <div className="mt-4 pt-3 border-t border-dashed border-[#5797d0]/20">
            <h4 className="font-patrick text-lg sm:text-xl font-bold text-[#5797d0] flex items-center justify-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#ef72b4]" />
              <span>{config.resepsi.venueName}</span>
            </h4>
            <p className="font-patrick text-sm sm:text-base text-[#527595] mt-1 leading-relaxed px-2">
              {config.resepsi.address}
            </p>
          </div>

          <div className="mt-5">
            <a
              id="open-google-maps-btn"
              href={config.resepsi.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-2.5 rounded-full bg-[#91c7eb] hover:bg-[#7db7dc] text-white font-patrick text-base sm:text-lg font-bold tracking-wide shadow-[0_4px_0_#6eacd6] active:shadow-[0_1px_0_#6eacd6] active:translate-y-0.5 transition-all cursor-pointer"
            >
              <MapPin className="w-4 h-4 fill-white text-[#91c7eb]" />
              <span>Buka Google Maps</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
