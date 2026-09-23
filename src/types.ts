export interface CoupleInfo {
  name: string;
  fullName: string;
  role: 'Groom' | 'Bride';
  photo: string;
  parents: string;
  father?: string;
  mother?: string;
  instagram?: string;
}

export interface GuestItem {
  id: string;
  name: string;
  category: 'Umum' | 'Keluarga' | 'Teman' | 'VIP' | 'Kantor';
  note?: string;
  phone?: string;
}

export interface EventInfo {
  title: string;
  dateStr: string;
  isoDate: string;
  timeStr: string;
  venueName: string;
  address: string;
  mapsUrl: string;
}

export interface StoryMilestone {
  period?: string;
  title: string;
  story: string;
}

export interface BankAccount {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface GiftAddress {
  recipient: string;
  fullAddress: string;
}

export interface WishEntry {
  id: string;
  name: string;
  message: string;
  attendance: 'hadir' | 'ragu' | 'tidak';
  timestamp: string;
}

export interface WeddingConfig {
  groom: CoupleInfo;
  bride: CoupleInfo;
  couplePhoto?: string;
  eventDate: string;
  quote: string;
  quoteSource: string;
  akad: EventInfo;
  resepsi: EventInfo;
  stories: StoryMilestone[];
  bank: BankAccount;
  bankAccounts?: BankAccount[];
  giftAddress: GiftAddress;
  musicTitle: string;
  musicArtist: string;
  audioUrl: string;
}
