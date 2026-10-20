import React, { useState, useRef } from 'react';
import { WeddingConfig, GalleryPhoto } from '../types';
import { normalizeImageUrl } from '../utils/imageUrl';
import { Sparkles, X, ChevronLeft, ChevronRight, Eye, MoveHorizontal } from 'lucide-react';
import { DEFAULT_COVER_PHOTO_BASE64 } from './coverPhotoBase64';

interface OurGallerySectionProps {
  config: WeddingConfig;
}

export const OurGallerySection: React.FC<OurGallerySectionProps> = ({ config }) => {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Monitor posisi scroll horizontal untuk update titik (dots) aktif
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    if (scrollWidth <= clientWidth) return;
    const maxScroll = scrollWidth - clientWidth;
    const fraction = Math.max(0, Math.min(1, scrollLeft / maxScroll));
    const index = Math.round(fraction * (photos.length - 1));
    setCurrentIndex(index);
  };

  const scrollToPhoto = (index: number) => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const items = container.querySelectorAll<HTMLElement>('.gallery-carousel-item');
    if (items[index]) {
      items[index].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
      setCurrentIndex(index);
    }
  };

  const handleScrollPrev = () => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: -260, behavior: 'smooth' });
  };

  const handleScrollNext = () => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: 260, behavior: 'smooth' });
  };

  const handleLightboxPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedPhotoIndex === null) return;
    setSelectedPhotoIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleLightboxNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedPhotoIndex === null) return;
    setSelectedPhotoIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : 0));
  };

  const handleCloseModal = () => {
    setSelectedPhotoIndex(null);
  };

  return (
    <section id="galeri" className="w-full py-8 text-center scroll-mt-6 select-none">
      <div className="w-full max-w-sm sm:max-w-md mx-auto px-4">
        {/* Title Header */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-[#ef72b4] animate-pulse" />
          <h2 className="font-caveat text-4xl sm:text-5xl font-bold text-[#5d99d1]">
            Our Gallery
          </h2>
          <Sparkles className="w-5 h-5 text-[#ef72b4] animate-pulse" />
        </div>

        <p className="font-patrick text-base sm:text-lg text-[#527595] mb-3">
          Momen Indah & Kenangan Prewedding Kami
        </p>

        {/* Swipe Hint Indicator */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 rounded-full bg-[#eaf4fa] border border-[#5797d0]/25 text-[#5797d0] text-xs font-medium shadow-2xs animate-pulse">
          <MoveHorizontal className="w-3.5 h-3.5 text-[#ef72b4]" />
          <span>Geser ke samping untuk melihat foto lainnya ({photos.length} Foto)</span>
        </div>
      </div>

      {/* Horizontal Carousel Container - 1 Baris Bisa Digeser ke Samping */}
      <div className="relative w-full overflow-hidden group">
        {/* Left Arrow Button */}
        {photos.length > 1 && (
          <button
            type="button"
            onClick={handleScrollPrev}
            className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-[#5797d0] shadow-md hover:shadow-lg border border-[#5797d0]/20 flex items-center justify-center transition-all cursor-pointer active:scale-90"
            aria-label="Geser ke kiri"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Right Arrow Button */}
        {photos.length > 1 && (
          <button
            type="button"
            onClick={handleScrollNext}
            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-[#5797d0] shadow-md hover:shadow-lg border border-[#5797d0]/20 flex items-center justify-center transition-all cursor-pointer active:scale-90"
            aria-label="Geser ke kanan"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* The 1-Row Horizontal Scroll Track */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="w-full flex gap-3.5 sm:gap-4 overflow-x-auto pb-3 pt-1 px-6 sm:px-8 snap-x snap-mandatory scroll-smooth touch-pan-x scrollbar-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {photos.map((photo, index) => {
            const photoUrl = normalizeImageUrl(photo.url);
            return (
              <div
                key={photo.id || index}
                onClick={() => setSelectedPhotoIndex(index)}
                className="gallery-carousel-item shrink-0 w-[220px] sm:w-[250px] snap-center bg-white p-2.5 rounded-2xl shadow-md hover:shadow-xl border border-[#5797d0]/20 transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1"
              >
                {/* Image Container with Portrait 3:4 aspect ratio */}
                <div className="w-full aspect-[3/4] rounded-xl overflow-hidden bg-[#eaf4fa] relative group/img">
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
                    className="w-full h-full object-cover object-center group-hover/img:scale-108 transition-transform duration-500 ease-out"
                  />

                  {/* Photo index badge */}
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-xs text-white rounded-md text-[10px] font-bold">
                    #{index + 1}
                  </span>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="w-9 h-9 rounded-full bg-white/90 text-[#5797d0] flex items-center justify-center shadow-md transform scale-75 group-hover/img:scale-100 transition-transform">
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

      {/* Navigation Dots & Counter */}
      {photos.length > 1 && (
        <div className="flex flex-col items-center justify-center gap-1.5 mt-3">
          <div className="flex items-center justify-center gap-1.5">
            {photos.map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={() => scrollToPhoto(dotIdx)}
                aria-label={`Lihat foto ${dotIdx + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  currentIndex === dotIdx
                    ? 'w-6 h-2 bg-[#5797d0]'
                    : 'w-2 h-2 bg-[#5797d0]/30 hover:bg-[#5797d0]/60'
                }`}
              />
            ))}
          </div>
          <span className="text-[11px] font-medium text-[#718096]">
            {currentIndex + 1} dari {photos.length} Foto
          </span>
        </div>
      )}

      {/* Lightbox Modal (Tampilan Layar Penuh saat Diklik) */}
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
              onClick={handleLightboxPrev}
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
              onClick={handleLightboxNext}
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
