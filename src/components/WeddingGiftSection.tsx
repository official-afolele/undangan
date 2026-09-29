import React, { useState } from 'react';
import { WeddingConfig } from '../types';
import { CreditCard, Gift, Copy, Check } from 'lucide-react';

interface WeddingGiftSectionProps {
  config: WeddingConfig;
}

// Logo BSI mandiri (self-contained) agar langsung bekerja tanpa file tambahan
const BsiLogoSVG: React.FC<{ className?: string }> = ({ className = 'w-[80px] h-auto object-contain' }) => (
  <svg 
    viewBox="0 0 520 130" 
    className={className} 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Logo Bank Syariah Indonesia (BSI)"
  >
    {/* Golden 4-pointed Star */}
    <path 
      d="M174 12 C178 26 187 35 201 39 C187 43 178 52 174 66 C170 52 161 43 147 39 C161 35 170 26 174 12 Z" 
      fill="#F5A623" 
    />
    {/* Letter B */}
    <path 
      d="M18 30 H65 C82 30 94 39 94 54 C94 64 87 71 78 75 C89 79 97 88 97 102 C97 119 83 128 65 128 H18 V30 Z M41 49 V66 H62 C69 66 73 62 73 57.5 C73 53 69 49 62 49 H41 Z M41 84 V109 H63 C71 109 75 104 75 96.5 C75 89 71 84 63 84 H41 Z" 
      fill="#00A39D" 
    />
    {/* Letter S */}
    <path 
      d="M125 110 C134 114 145 117 156 117 C173 117 182 110 182 99 C182 78 126 84 126 49 C126 30 143 18 167 18 C180 18 190 21 199 25 L192 46 C185 42 176 39 167 39 C156 39 149 44 149 52 C149 73 205 66 205 101 C205 120 186 131 159 131 C145 131 132 127 122 121 L125 110 Z" 
      fill="#00A39D" 
    />
    {/* Letter I */}
    <path 
      d="M228 30 C238 30 245 37 245 47 V128 H219 V30 H228 Z" 
      fill="#00A39D" 
    />
    {/* Text: BANK SYARIAH INDONESIA */}
    <text x="270" y="60" fill="#00A39D" fontFamily="Arial, Helvetica, sans-serif" fontSize="30" fontWeight="bold" letterSpacing="2">
      BANK SYARIAH
    </text>
    <text x="270" y="98" fill="#F5A623" fontFamily="Arial, Helvetica, sans-serif" fontSize="26" fontWeight="bold" letterSpacing="4">
      INDONESIA
    </text>
  </svg>
);

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
    <section id="kado" className="w-full px-4 py-8 text-center scroll-mt-6">
      <div className="max-w-sm sm:max-w-md mx-auto">
        <h2 className="font-caveat text-4xl sm:text-5xl font-bold text-[#5d99d1] mb-2">
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
            const copyKey = `bank-${index}`;
            const isBsi = account.bankName.toLowerCase().includes('bsi') || account.bankName.toLowerCase().includes('syariah');

            return (
              <div
                key={index}
                className="relative bg-white rounded-2xl p-5 sm:p-6 shadow-md border border-[#5797d0]/15 text-left overflow-hidden transition-all hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
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

                  {/* Logo Bank BSI murni tulisan & logo dengan lebar pas 80px */}
                  <div 
                    className="shrink-0 flex items-center justify-end"
                    title={account.bankName}
                  >
                    {isBsi ? (
                      <BsiLogoSVG className="w-[80px] h-auto object-contain" />
                    ) : (
                      <CreditCard className="w-5 h-5" style={{ color: accentColor }} />
                    )}
                  </div>
                </div>

                {/* Tombol Salin Lebih Ramping & Sudut Kelengkungan Pas */}
                <div className="mt-3 pt-2.5 border-t border-[#edf2f7] flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleCopy(account.accountNumber, copyKey)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2d3748] hover:bg-[#1a202c] active:scale-95 text-white font-patrick text-xs sm:text-sm font-medium transition-all cursor-pointer shadow-xs"
                    aria-label={`Salin Nomor Rekening ${account.accountHolder}`}
                  >
                    {copiedKey === copyKey ? (
                      <>
                        <Check className="w-3 h-3 text-green-400" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
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

          <div className="mt-3 pt-2.5 border-t border-[#edf2f7] flex justify-end">
            <button
              type="button"
              onClick={() => handleCopy(`${config.giftAddress.recipient}\n${config.giftAddress.fullAddress}`, 'address')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2d3748] hover:bg-[#1a202c] active:scale-95 text-white font-patrick text-xs sm:text-sm font-medium transition-all cursor-pointer shadow-xs"
              aria-label="Salin Alamat Kirim Kado"
            >
              {copiedKey === 'address' ? (
                <>
                  <Check className="w-3 h-3 text-green-400" />
                  <span>Alamat Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
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
