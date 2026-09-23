import { WeddingConfig, WishEntry, GuestItem } from '../types';

export const weddingData: WeddingConfig = {
  groom: {
    name: 'Jaka',
    fullName: 'Jaka, S.Kom',
    role: 'Groom',
    photo: '/uploads/groom_photo.jpg',
    parents: 'Putra Keempat dari Bapak Asmarni dan Ibu Lamidah',
    father: 'Bapak Asmarni',
    mother: 'Ibu Lamidah',
    instagram: '@jaka.asmarni'
  },
  bride: {
    name: 'Dian',
    fullName: 'Harinurdian, S.E',
    role: 'Bride',
    photo: '/uploads/bride_photo.jpg',
    parents: 'Putri Pertama dari Bapak Hatta, S.Pd.Sd dan Ibu Sumartik',
    father: 'Bapak Hatta, S.Pd.Sd',
    mother: 'Ibu Sumartik',
    instagram: '@harinurdian'
  },
  couplePhoto: '/couple-photo.jpg',
  eventDate: '2026-12-26T08:00:00+07:00',
  quote: `Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang. Sungguh, pada yang demikian itu benar-benar terdapat tanda-tanda (kebesaran Allah) bagi kaum yang berpikir.`,
  quoteSource: 'Q.S Ar-Rum : 21',
  akad: {
    title: 'Akad Nikah',
    dateStr: 'Sabtu, 26 Desember 2026',
    isoDate: '2026-12-26',
    timeStr: 'Pukul 08.00 WIB - Selesai',
    venueName: 'Kediaman Mempelai Wanita',
    address: 'Jalan Pashanda Bhakti, RT 005 RW 002, Dusun Pangkalan Betung, Desa Pipit Teja, Kec. Teluk Keramat',
    mapsUrl: 'https://maps.app.goo.gl/PJBKEHqAw4uwG5Ms8'
  },
  resepsi: {
    title: 'Resepsi Pernikahan',
    dateStr: 'Minggu, 27 Desember 2026',
    isoDate: '2026-12-27',
    timeStr: 'Pukul 14.00 - 19.00 WIB',
    venueName: 'Kediaman Mempelai Wanita',
    address: 'Jalan Pashanda Bhakti, RT 005 RW 002, Dusun Pangkalan Betung, Desa Pipit Teja, Kec. Teluk Keramat',
    mapsUrl: 'https://maps.app.goo.gl/PJBKEHqAw4uwG5Ms8'
  },
  stories: [
    {
      title: 'Awal Pertemuan',
      story: 'Takdir mempertemukan kami di sebuah momen sederhana. Berawal dari percakapan hangat yang kemudian menumbuhkan rasa saling mengerti dan nyaman satu sama lain.'
    },
    {
      title: 'Menjalin Komitmen',
      story: 'Setelah melewati banyak cerita suka dan duka bersama, kami sepakat untuk melangkah ke jenjang yang lebih serius dengan restu dan doa kedua orang tua kami.'
    },
    {
      title: 'Menuju Hari Bahagia',
      story: 'Dengan memohon ridho Allah SWT, kami memutuskan untuk mengikat janji suci pernikahan, membangun keluarga sakinah, mawaddah, warahmah.'
    }
  ],
  bank: {
    bankName: 'BANK BSI SYARIAH',
    accountNumber: '7265469374',
    accountHolder: 'Harinurdian'
  },
  bankAccounts: [
    {
      bankName: 'BANK BSI SYARIAH',
      accountNumber: '7265469374',
      accountHolder: 'Harinurdian'
    },
    {
      bankName: 'BANK BSI SYARIAH',
      accountNumber: '7238491028',
      accountHolder: 'JAKA'
    }
  ],
  giftAddress: {
    recipient: 'Dian',
    fullAddress: 'Jl. Pashanda Bhakti RT 005 RW 002, Dusun Pangkalan Betung, Desa Pipitteja, Kec. Teluk Keramat, Kab. Sambas'
  },
  musicTitle: 'Cinta Terakhir (Cover)',
  musicArtist: 'Ari Lasso / Cover',
  audioUrl: 'https://wedding-invitations-chi.vercel.app/audio/cinta_terakhir_cover1.mp3'
};

export const initialWishes: WishEntry[] = [
  {
    id: '1',
    name: 'Budi Santoso & Keluarga',
    message: 'Barakallahu lakuma wa baraka alaikuma wa jamaa bainakuma fii khoir. Selamat menempuh hidup baru Jaka & Dian!',
    attendance: 'hadir',
    timestamp: '2 jam yang lalu'
  },
  {
    id: '2',
    name: 'Siti Rahmawati',
    message: 'Selamat berbahagia Dian & Jaka! Semoga menjadi keluarga yang sakinah, mawaddah, warahmah. Aamiin ya rabbal alamin.',
    attendance: 'hadir',
    timestamp: '5 jam yang lalu'
  },
  {
    id: '3',
    name: 'Rizky Firmansyah',
    message: 'Selamat buat Jaka dan Dian! Semoga lancar sampai hari H dan senantiasa diberkahi kebahagiaan.',
    attendance: 'hadir',
    timestamp: '1 hari yang lalu'
  }
];

export const initialGuests: GuestItem[] = [
  { id: '1', name: 'Bapak Andi & Keluarga', category: 'VIP', note: 'Kerabat dekat' },
  { id: '2', name: 'Rahmat Hidayat', category: 'Teman', note: 'Sahabat kampus' },
  { id: '3', name: 'Keluarga Besar Hatta', category: 'Keluarga', note: 'Keluarga mempelai wanita' },
  { id: '4', name: 'Rekan Kerja Dinas', category: 'Kantor', note: 'Teman kantor' },
];

