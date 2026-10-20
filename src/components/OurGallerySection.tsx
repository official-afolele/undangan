import React, { useState } from 'react';
import { WeddingConfig, GalleryPhoto } from '../types';
import { normalizeImageUrl } from '../utils/imageUrl';
import { Sparkles, X, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

import { DEFAULT_COVER_PHOTO_BASE64 } from './coverPhotoBase64';

interface OurGallerySectionProps {
  config: WeddingConfig;
}

export const OurGallerySection: React.FC<OurGallerySectionProps> = ({ config }) => {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  // Ambil daftar foto galeri dari config, atau fallback ke 2 foto prewedding pilihan
  const photos: GalleryPhoto[] = (config.gallery && config.gallery.length > 0)
    ? config.gallery
    : [
        {
          id: 'gal_1',
          url: config.bride?.photo || '/uploads/bride_photo.jpg',
          caption: config.bride?.fullName || config.bride?.name || 'Harinurdian, S.E'
        },
        {
          id: 'gal_2',
          url: '/couple-photo.jpg',
          caption: 'Menuju Hari Bahagia'
        }
      ];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedPhotoIndex === null) return;
    setSelectedPhotoIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedPhotoIndex === null) return;
    setSelectedPhotoIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : 0));
  };

  const handleCloseModal = () => {
    setSelectedPhotoIndex(null);
  };

  return (
    <section id="galeri" className="w-full px-4 py-8 text-center scroll-mt-6">
      <div className="max-w-sm sm:max-w-md mx-auto">
        {/* Title Header */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-[#ef72b4] animate-pulse" />
          <h2 className="font-caveat text-4xl sm:text-5xl font-bold text-[#5d99d1]">
            Our Gallery
          </h2>
          <Sparkles className="w-5 h-5 text-[#ef72b4] animate-pulse" />
        </div>

        <p className="font-patrick text-base sm:text-lg text-[#527595] mb-6">
          Momen Indah & Kenangan Prewedding Kami
        </p>

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {photos.map((photo, index) => {
            const photoUrl = normalizeImageUrl(photo.url);
            return (
              <div
                key={photo.id || index}
                onClick={() => setSelectedPhotoIndex(index)}
                className="group relative bg-white p-2 sm:p-2.5 rounded-2xl shadow-md hover:shadow-xl border border-[#5797d0]/15 transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1"
              >
                {/* Image Container with 4:5 or 3:4 aspect ratio */}
                <div className="w-full aspect-[4/5] rounded-xl overflow-hidden bg-[#eaf4fa] relative">
                  <img
                    src={photoUrl}
                    alt={photo.caption || `Prewedding ${index + 1}`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.includes('couple-photo.jpg')) {
                        target.src = '/couple-photo.jpg';
                      } else {
                        target.src = DEFAULT_COVER_PHOTO_BASE64;
                      }
                    }}
                    className="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-500 ease-out"
                  />

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="w-9 h-9 rounded-full bg-white/85 text-[#5797d0] flex items-center justify-center shadow-md transform scale-75 group-hover:scale-100 transition-transform">
                      <Eye className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Caption below photo */}
                {photo.caption && (
                  <p className="font-patrick text-xs sm:text-sm text-[#5797d0] font-medium mt-2 truncate px-1 text-center">
                    {photo.caption}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedPhotoIndex !== null && photos[selectedPhotoIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={handleCloseModal}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fade-in"
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={handleCloseModal}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95"
            aria-label="Tutup foto"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation Prev */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 sm:left-6 z-10 w-11 h-11 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-90"
              aria-label="Foto Sebelumnya"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
          )}

          {/* Image & Caption Container */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-lg w-full max-h-[85vh] flex flex-col items-center"
          >
            <img
              src={normalizeImageUrl(photos[selectedPhotoIndex].url)}
              alt={photos[selectedPhotoIndex].caption || 'Foto Galeri'}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[72vh] object-contain rounded-2xl shadow-2xl border border-white/20"
            />

            {/* Caption & Counter */}
            <div className="mt-3 text-center text-white">
              <p className="font-patrick text-base sm:text-lg font-bold">
                {photos[selectedPhotoIndex].caption || 'Our Prewedding Gallery'}
              </p>
              <span className="font-sans text-xs text-white/70">
                {selectedPhotoIndex + 1} / {photos.length}
              </span>
            </div>
          </div>

          {/* Navigation Next */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 sm:right-6 z-10 w-11 h-11 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-90"
              aria-label="Foto Selanjutnya"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          )}
        </div>
      )}
    </section>
  );
};
