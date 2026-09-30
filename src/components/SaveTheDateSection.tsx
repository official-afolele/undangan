import React, { useState, useEffect } from 'react';
import { WeddingConfig } from '../types';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

interface SaveTheDateSectionProps {
  config: WeddingConfig;
}

export const SaveTheDateSection: React.FC<SaveTheDateSectionProps> = ({ config }) => {
  const targetDate = new Date(config.eventDate).getTime();

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  // Calendar for December 2026
  // Dec 1, 2026 is Tuesday (Day index 2)
  // Total days in Dec: 31
  const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const firstDayIndex = 2; // Tuesday
  const totalDays = 31;

  // Calendar cells
  const calendarCells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  for (let day = 1; day <= totalDays; day++) {
    calendarCells.push(day);
  }

  // Google Calendar URL generator
  const createGoogleCalendarUrl = () => {
    const title = encodeURIComponent(`The Wedding of ${config.groom.name} & ${config.bride.name}`);
    const details = encodeURIComponent(
      `Akad Nikah & Resepsi Pernikahan ${config.groom.fullName} & ${config.bride.fullName}.\nLokasi: ${config.akad.address}`
    );
    const location = encodeURIComponent(config.akad.address);
    // 20261226T010000Z to 20261227T120000Z (UTC)
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=20261226T010000Z/20261227T120000Z&details=${details}&location=${location}`;
  };

  return (
    <section id="acara" className="w-full px-4 py-8 text-center">
      {/* CSS Animasi Detak Jantung Love Tanggal */}
      <style>{`
        @keyframes dateHeartPulsePink {
          0%, 100% {
            transform: scale(1);
          }
          14% {
            transform: scale(1.2);
          }
          28% {
            transform: scale(1);
          }
          42% {
            transform: scale(1.1);
          }
          70% {
            transform: scale(1);
          }
        }

        @keyframes dateHeartPulseBlue {
          0%, 100% {
            transform: scale(1);
          }
          14% {
            transform: scale(1.2);
          }
          28% {
            transform: scale(1);
          }
          42% {
            transform: scale(1.1);
          }
          70% {
            transform: scale(1);
          }
        }

        .anim-date-heart-pink {
          animation: dateHeartPulsePink 1.8s cubic-bezier(0.25, 0.1, 0.25, 1) infinite;
          transform-origin: center center;
        }

        .anim-date-heart-blue {
          animation: dateHeartPulseBlue 1.8s cubic-bezier(0.25, 0.1, 0.25, 1) 0.35s infinite;
          transform-origin: center center;
        }
      `}</style>

      <div className="max-w-sm sm:max-w-md mx-auto">
        <h2 className="font-caveat text-4xl sm:text-5xl font-bold text-[#5d99d1] mb-6">
          Save The Date
        </h2>

        {/* Calendar Card */}
        <div className="w-full bg-white rounded-2xl p-4 sm:p-6 shadow-md border border-[#5797d0]/15 mb-6">
          <div className="font-amatic text-2xl sm:text-3xl font-bold text-[#5797d0] tracking-wider mb-3">
            DECEMBER 2026
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center mb-2">
            {daysOfWeek.map((day) => (
              <span key={day} className="font-patrick text-xs sm:text-sm font-bold text-[#5797d0] py-1">
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center text-sm sm:text-base font-patrick">
            {calendarCells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="h-8 sm:h-9" />;
              }

              const isAkad = day === 26;
              const isResepsi = day === 27;

              if (isAkad || isResepsi) {
                return (
                  <div key={day} className="h-8 sm:h-9 flex items-center justify-center">
                    <div
                      className={`relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 ${
                        isAkad ? 'anim-date-heart-pink' : 'anim-date-heart-blue'
                      }`}
                      title={isAkad ? 'Hari Akad Nikah (26 Des 2026)' : 'Hari Resepsi (27 Des 2026)'}
                    >
                      {/* Heart SVG Shape */}
                      <svg
                        viewBox="0 0 32 32"
                        className="w-full h-full drop-shadow-xs filter"
                        fill={isAkad ? '#ef72b4' : '#5797d0'}
                      >
                        <path d="M 16,29 C 15.3,28.3 2,17.5 2,9.8 C 2,4.5 6.2,1.5 11,1.5 C 13.8,1.5 15.2,2.8 16,3.7 C 16.8,2.8 18.2,1.5 21,1.5 C 25.8,1.5 30,4.5 30,9.8 C 30,17.5 16.7,28.3 16,29 Z" />
                      </svg>
                      {/* Angka Tanggal di dalam Hati */}
                      <span className="absolute inset-0 flex items-center justify-center text-white font-bold font-patrick text-xs sm:text-sm -mt-0.5 select-none pointer-events-none drop-shadow-xs">
                        {day}
                      </span>
                    </div>
                  </div>
                );
              }

              return (
                <div key={day} className="h-8 sm:h-9 flex items-center justify-center text-[#527595]">
                  <span>{day}</span>
                </div>
              );
            })}
          </div>

          <div className="font-caveat text-2xl sm:text-3xl font-bold text-[#ef72b4] mt-4 flex items-center justify-center gap-1.5">
            <span>D-day!! ♥</span>
            <span className="text-xs font-patrick text-[#527595] font-normal">
              (26 Akad & 27 Resepsi)
            </span>
          </div>

          <a
            href={createGoogleCalendarUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 mt-4 px-4 py-2 rounded-full bg-[#f4e2ed] hover:bg-[#ebd3e3] text-[#ef72b4] font-patrick text-sm sm:text-base font-semibold transition-all shadow-2xs active:scale-95 cursor-pointer"
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Simpan ke Google Calendar</span>
          </a>
        </div>

        {/* Countdown Box */}
        <div className="w-full bg-white rounded-2xl p-4 sm:p-5 border-2 border-dashed border-[#ef8fc3] shadow-xs">
          <div className="flex items-center justify-center gap-1.5 text-[#ef72b4] font-caveat text-2xl sm:text-3xl font-bold mb-3">
            <Clock className="w-5 h-5 text-[#ef72b4]" />
            <span>Countdown Menuju Akad</span>
          </div>

          <div className="grid grid-cols-4 gap-1 sm:gap-2">
            <div className="flex flex-col items-center bg-[#faf7f5] rounded-xl p-2 sm:p-2.5">
              <span className="font-caveat text-3xl sm:text-4xl font-bold text-[#5797d0] leading-none">
                {String(timeLeft.days).padStart(2, '0')}
              </span>
              <span className="font-patrick text-xs sm:text-sm text-[#ef72b4] mt-1 font-semibold">
                Hari
              </span>
            </div>

            <div className="flex flex-col items-center bg-[#faf7f5] rounded-xl p-2 sm:p-2.5">
              <span className="font-caveat text-3xl sm:text-4xl font-bold text-[#5797d0] leading-none">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className="font-patrick text-xs sm:text-sm text-[#ef72b4] mt-1 font-semibold">
                Jam
              </span>
            </div>

            <div className="flex flex-col items-center bg-[#faf7f5] rounded-xl p-2 sm:p-2.5">
              <span className="font-caveat text-3xl sm:text-4xl font-bold text-[#5797d0] leading-none">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="font-patrick text-xs sm:text-sm text-[#ef72b4] mt-1 font-semibold">
                Menit
              </span>
            </div>

            <div className="flex flex-col items-center bg-[#faf7f5] rounded-xl p-2 sm:p-2.5">
              <span className="font-caveat text-3xl sm:text-4xl font-bold text-[#5797d0] leading-none">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className="font-patrick text-xs sm:text-sm text-[#ef72b4] mt-1 font-semibold">
                Detik
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
