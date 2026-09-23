import React, { useState } from 'react';
import { WeddingConfig } from '../types';
import { CreditCard, Gift, Copy, Check } from 'lucide-react';

interface WeddingGiftSectionProps {
  config: WeddingConfig;
}

export const WeddingGiftSection: React.FC<WeddingGiftSectionProps> = ({ config }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    });
  };

  // Compile bank accounts list with fallback to single config.bank
  const accounts = (config.bankAccounts && config.bankAccounts.length > 0)
    ? config.bankAccounts
    : [config.bank];

  return (
    <section id="kado" className="w-full px-4 py-8 text-center">
      <div className="max-w-sm sm:max-w-md mx-auto">
        <h2 className="font-caveat text-4xl sm:text-5xl font-bold text-[#5d99d1] mb-4">
          Wedding Gift
        </h2>

        <p className="font-patrick text-base sm:text-lg text-[#527595] leading-relaxed mb-6 px-2">
          Doa restu Anda merupakan karunia yang sangat berarti bagi kami. Dan jika memberi adalah ungkapan tanda kasih Anda, Anda dapat mengirimkan kado melalui:
        </p>

        {/* BANK ACCOUNT CARDS */}
        <div className="space-y-4 mb-4">
          {accounts.map((account, index) => {
            const isJaka = account.accountHolder.toLowerCase().includes('jaka');
            const accentColor = isJaka ? '#5797d0' : '#ef72b4';
            const badgeBg = isJaka ? '#eaf3fa' : '#fbf0f6';
            const iconBg = isJaka ? '#91c7eb]/20' : '#ef72b4]/15';
            const copyKey = `bank-${index}`;

            return (
              <div
                key={index}
                className="relative bg-white rounded-2xl p-5 sm:p-6 shadow-md border border-[#5797d0]/15 text-left overflow-hidden transition-all hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span 
                      className="text-xs uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-md font-patrick inline-block mb-1.5"
                      style={{ color: accentColor, backgroundColor: badgeBg }}
                    >
                      Amplop Digital #{index + 1}
                    </span>
                    <h3 className="font-sans font-bold text-base sm:text-lg text-[#2d3748]">
                      {account.bankName}
                    </h3>
                    <p 
                      className="font-mono text-xl sm:text-2xl font-bold tracking-wider my-1 select-all"
                      style={{ color: accentColor }}
                    >
                      {account.accountNumber}
                    </p>
                    <p className="font-sans text-sm text-[#527595]">
                      a.n. <strong className="text-[#2d3748]">{account.accountHolder}</strong>
                    </p>
                  </div>
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: badgeBg, color: accentColor }}
                  >
                    <CreditCard className="w-5 h-5" />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#edf2f7] flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleCopy(account.accountNumber, copyKey)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#2d3748] hover:bg-[#1a202c] active:scale-95 text-white font-patrick text-sm font-semibold transition-all cursor-pointer shadow-xs"
                    aria-label={`Salin Nomor Rekening ${account.accountHolder}`}
                  >
                    {copiedKey === copyKey ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin No. Rekening</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* PHYSICAL GIFT CARD */}
        <div className="relative bg-white rounded-2xl p-5 sm:p-6 shadow-md border border-[#5797d0]/15 text-left overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-[#5797d0] bg-[#eaf3fa] px-2.5 py-0.5 rounded-md font-patrick inline-block mb-1.5">
                Kirim Kado Fisik
              </span>
              <h3 className="font-amatic text-2xl sm:text-3xl font-bold text-[#5797d0]">
                ALAMAT PENGIRIMAN
              </h3>
              <p className="font-sans text-sm sm:text-base font-semibold text-[#2d3748] mt-1">
                Penerima: {config.giftAddress.recipient}
              </p>
              <p className="font-sans text-xs sm:text-sm text-[#527595] mt-1 leading-relaxed">
                {config.giftAddress.fullAddress}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#ef72b4]/15 flex items-center justify-center text-[#ef72b4] shrink-0">
              <Gift className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#edf2f7] flex justify-end">
            <button
              type="button"
              onClick={() => handleCopy(`${config.giftAddress.recipient}\n${config.giftAddress.fullAddress}`, 'address')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#2d3748] hover:bg-[#1a202c] active:scale-95 text-white font-patrick text-sm font-semibold transition-all cursor-pointer shadow-xs"
              aria-label="Salin Alamat Kirim Kado"
            >
              {copiedKey === 'address' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  <span>Alamat Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Alamat</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
