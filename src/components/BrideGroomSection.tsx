import React from 'react';
import { Heart } from 'lucide-react';
import { WeddingConfig } from '../types';
import { normalizeImageUrl } from '../utils/imageUrl';

interface BrideGroomSectionProps {
  config: WeddingConfig;
  onEditPhoto?: (role: 'groom' | 'bride') => void;
}

export const BrideGroomSection: React.FC<BrideGroomSectionProps> = ({ config, onEditPhoto }) => {
  const groomPhotoUrl = normalizeImageUrl(config.groom.photo);
  const bridePhotoUrl = normalizeImageUrl(config.bride.photo);

  return (
    <section id="mempelai" className="w-full px-4 py-8 text-center">
      <div className="max-w-sm sm:max-w-md mx-auto">
        <h2 className="font-caveat text-4xl sm:text-5xl font-bold text-[#5d99d1] mb-6">
          Bride & Groom
        </h2>

        {/* Groom Profile */}
        <div className="flex flex-col items-center my-4">
          <div 
            onClick={() => onEditPhoto?.('groom')}
            className={`relative p-2 bg-white border-[7px] sm:border-[8px] border-[#ead9b1] rounded-sm shadow-lg transform -rotate-2 hover:rotate-0 transition-transform duration-300 ${
              onEditPhoto ? 'cursor-pointer group' : ''
            }`}
          >
            <img
              src={groomPhotoUrl}
              alt={config.groom.fullName}
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.includes('unsplash.com')) {
                  target.src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80';
                }
              }}
              className="w-[125px] h-[155px] sm:w-[145px] sm:h-[180px] object-cover rounded-xs"
            />
            {/* Animated Love Icon Badge */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditPhoto?.('groom');
              }}
              className={`absolute -top-3 -right-3 w-7 h-7 rounded-full bg-linear-to-tr from-[#5797d0] to-[#7fb3e0] text-white flex items-center justify-center shadow-md border-2 border-white transition-all ${
                onEditPhoto ? 'cursor-pointer hover:scale-115 active:scale-95' : 'pointer-events-none'
              }`}
              title={onEditPhoto ? "Ganti Foto Pengantin Pria" : "Pengantin Pria"}
            >
              <Heart className="w-3.5 h-3.5 fill-white text-white animate-heartbeat drop-shadow-xs" />
            </button>
          </div>
          <h3 className="font-caveat text-3xl sm:text-4xl font-bold text-[#ef72b4] mt-3 mb-1">
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
          <div 
            onClick={() => onEditPhoto?.('bride')}
            className={`relative p-2 bg-white border-[7px] sm:border-[8px] border-[#ead9b1] rounded-sm shadow-lg transform rotate-2 hover:rotate-0 transition-transform duration-300 ${
              onEditPhoto ? 'cursor-pointer group' : ''
            }`}
          >
            <img
              src={bridePhotoUrl}
              alt={config.bride.fullName}
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.includes('unsplash.com')) {
                  target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
                }
              }}
              className="w-[125px] h-[155px] sm:w-[145px] sm:h-[180px] object-cover rounded-xs"
            />
            {/* Animated Love Icon Badge */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditPhoto?.('bride');
              }}
              className={`absolute -top-3 -right-3 w-7 h-7 rounded-full bg-linear-to-tr from-[#ef72b4] to-[#f898cb] text-white flex items-center justify-center shadow-md border-2 border-white transition-all ${
                onEditPhoto ? 'cursor-pointer hover:scale-115 active:scale-95' : 'pointer-events-none'
              }`}
              title={onEditPhoto ? "Ganti Foto Pengantin Wanita" : "Pengantin Wanita"}
            >
              <Heart className="w-3.5 h-3.5 fill-white text-white animate-heartbeat drop-shadow-xs" />
            </button>
          </div>
          <h3 className="font-caveat text-3xl sm:text-4xl font-bold text-[#ef72b4] mt-3 mb-1">
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
