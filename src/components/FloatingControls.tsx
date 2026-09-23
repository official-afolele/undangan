import React, { useState, useEffect } from 'react';
import { audioController } from '../utils/audioPlayer';
import { Music, VolumeX, Users, Calendar, BookOpen, Gift, MessageSquare } from 'lucide-react';

export const FloatingControls: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(audioController.isPlaying);

  useEffect(() => {
    const unsub = audioController.subscribe(() => {
      setIsPlaying(audioController.isPlaying);
    });
    return unsub;
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* Floating Audio Play/Pause Button */}
      <button
        id="floating-audio-toggle"
        type="button"
        onClick={() => audioController.toggle()}
        className={`fixed z-40 right-4 bottom-20 sm:bottom-6 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 cursor-pointer active:scale-95 ${
          isPlaying
            ? 'bg-[#ef72b4] text-white ring-4 ring-[#ef72b4]/30 animate-pulse'
            : 'bg-white/90 text-[#5797d0] border border-[#5797d0]/30 hover:bg-white'
        }`}
        title={isPlaying ? 'Jeda Musik' : 'Putar Musik'}
        aria-label={isPlaying ? 'Jeda Musik Latar' : 'Putar Musik Latar'}
      >
        {isPlaying ? (
          <Music className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
        ) : (
          <VolumeX className="w-5 h-5" />
        )}
      </button>

      {/* Floating Bottom Quick Navigation Pill for Mobile */}
      <nav 
        aria-label="Navigasi Cepat"
        className="fixed z-30 bottom-3 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-[#5797d0]/20 flex items-center gap-1 sm:gap-2 max-w-[94vw] select-none"
      >
        <button
          type="button"
          onClick={() => scrollTo('mempelai')}
          className="flex flex-col items-center px-2 py-1 rounded-lg text-[#527595] hover:text-[#5797d0] hover:bg-[#5797d0]/10 active:scale-95 transition-all text-[11px] font-patrick cursor-pointer"
        >
          <Users className="w-4 h-4 text-[#5797d0]" />
          <span>Mempelai</span>
        </button>

        <button
          type="button"
          onClick={() => scrollTo('acara')}
          className="flex flex-col items-center px-2 py-1 rounded-lg text-[#527595] hover:text-[#5797d0] hover:bg-[#5797d0]/10 active:scale-95 transition-all text-[11px] font-patrick cursor-pointer"
        >
          <Calendar className="w-4 h-4 text-[#5797d0]" />
          <span>Acara</span>
        </button>

        <button
          type="button"
          onClick={() => scrollTo('cerita')}
          className="flex flex-col items-center px-2 py-1 rounded-lg text-[#527595] hover:text-[#5797d0] hover:bg-[#5797d0]/10 active:scale-95 transition-all text-[11px] font-patrick cursor-pointer"
        >
          <BookOpen className="w-4 h-4 text-[#5797d0]" />
          <span>Cerita</span>
        </button>

        <button
          type="button"
          onClick={() => scrollTo('kado')}
          className="flex flex-col items-center px-2 py-1 rounded-lg text-[#527595] hover:text-[#5797d0] hover:bg-[#5797d0]/10 active:scale-95 transition-all text-[11px] font-patrick cursor-pointer"
        >
          <Gift className="w-4 h-4 text-[#5797d0]" />
          <span>Kado</span>
        </button>

        <button
          type="button"
          onClick={() => scrollTo('ucapan')}
          className="flex flex-col items-center px-2 py-1 rounded-lg text-[#527595] hover:text-[#5797d0] hover:bg-[#5797d0]/10 active:scale-95 transition-all text-[11px] font-patrick cursor-pointer"
        >
          <MessageSquare className="w-4 h-4 text-[#ef72b4]" />
          <span className="text-[#ef72b4] font-semibold">Ucapan</span>
        </button>
      </nav>
    </>
  );
};
