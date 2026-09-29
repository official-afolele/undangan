import React, { useState, useEffect } from 'react';
import { WeddingConfig, GuestItem, WishEntry } from '../types';
import { 
  ArrowLeft, 
  Save, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Copy, 
  Share2, 
  Check, 
  Heart, 
  Calendar, 
  Music, 
  Gift, 
  Users, 
  Search,
  ExternalLink,
  MessageCircle,
  Clock,
  MapPin,
  Camera,
  Download,
  Upload,
  Lock,
  LogOut,
  KeyRound,
  Eye,
  EyeOff,
  Play,
  Pause,
  Volume2,
  FileAudio,
  Sparkles,
  CheckCircle2,
  Loader2,
  AlertCircle,
  MessageSquareHeart,
  RefreshCw,
  Crop,
  Sliders
} from 'lucide-react';
import { normalizeImageUrl } from '../utils/imageUrl';
import { validateAdminPassword } from '../utils/auth';
import { PhotoEditorModal, PhotoRole } from './PhotoEditorModal';

// Helper to compress image client-side via canvas (reducing 10MB phone camera images to ~200KB)
const compressImageFile = (file: File, maxDimension = 1200, quality = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format file gambar tidak didukung'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

interface AdminPanelProps {
  config: WeddingConfig;
  onSaveConfig: (newConfig: WeddingConfig) => void | Promise<boolean>;
  guests: GuestItem[];
  onSaveGuests: (newGuests: GuestItem[]) => void | Promise<boolean>;
  onClose: () => void;
  onResetDefault: () => void;
  onLogout?: () => void;
  onChangePassword?: (newPassword: string) => void;
  currentPassword?: string;
}

type AdminTab = 'pengantin' | 'acara' | 'musik_cerita' | 'kado' | 'tamu' | 'ucapan' | 'google_script';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  config,
  onSaveConfig,
  guests,
  onSaveGuests,
  onClose,
  onResetDefault,
  onLogout,
  onChangePassword,
  currentPassword
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('pengantin');
  const [formData, setFormData] = useState<WeddingConfig>(JSON.parse(JSON.stringify(config)));
  const [guestList, setGuestList] = useState<GuestItem[]>(JSON.parse(JSON.stringify(guests)));
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<{ title: string; detail: string; time: string } | null>(null);

  // Wishes state for Admin
  const [wishesList, setWishesList] = useState<WishEntry[]>([]);
  const [isLoadingWishes, setIsLoadingWishes] = useState(false);
  const [wishesFilter, setWishesFilter] = useState<'semua' | 'hadir' | 'ragu' | 'tidak'>('semua');
  const [wishesSearch, setWishesSearch] = useState('');

  const fetchAdminWishes = async () => {
    setIsLoadingWishes(true);

    const targetScriptUrl = (formData.googleScriptUrl && formData.googleScriptUrl.startsWith('http'))
      ? formData.googleScriptUrl
      : 'https://script.google.com/macros/s/AKfycby6h1lOSpTyczUj5Bsyu3n0W3AnlZuME1Cn4V2WFfpNQeGj6v_3poNiZScPbButlpVf/exec';

    // 1. Ambil langsung dari Google Spreadsheet
    if (targetScriptUrl) {
      try {
        const scriptRes = await fetch(`${targetScriptUrl}?action=get_wishes`);
        if (scriptRes.ok) {
          const data = await scriptRes.json();
          if (data && Array.isArray(data.wishes)) {
            setWishesList(data.wishes);
            try {
              localStorage.setItem('wedding_wishes_jaka_dian', JSON.stringify(data.wishes));
            } catch {}
            setIsLoadingWishes(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Gagal memuat ucapan dari Google Script:', err);
      }
    }

    // 2. Fallback dari penyimpanan lokal
    try {
      const saved = localStorage.getItem('wedding_wishes_jaka_dian');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setWishesList(parsed);
          setIsLoadingWishes(false);
          return;
        }
      }
    } catch {}

    setIsLoadingWishes(false);
  };
  useEffect(() => {
    fetchAdminWishes();
  }, []);

  const handleDeleteWish = async (id: string, name: string) => {
    if (!window.confirm(`Hapus ucapan dan konfirmasi dari "${name}"?`)) return;
    try {
      const res = await fetch(`/api/wishes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.wishes)) {
          setWishesList(data.wishes);
        } else {
          setWishesList((prev) => prev.filter((w) => w.id !== id));
        }
      } else {
        setWishesList((prev) => prev.filter((w) => w.id !== id));
      }
    } catch (err) {
      console.error('Gagal menghapus wish:', err);
      setWishesList((prev) => prev.filter((w) => w.id !== id));
    }
  };

  // State & Handler Edit Ucapan
  const [editingWish, setEditingWish] = useState<WishEntry | null>(null);

  const handleSaveEditWish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWish) return;

    const updated = wishesList.map((w) => (w.id === editingWish.id ? editingWish : w));
    setWishesList(updated);
    try {
      localStorage.setItem('wedding_wishes_jaka_dian', JSON.stringify(updated));
    } catch {}

    setEditingWish(null);
    alert(`Ucapan dari "${editingWish.name}" berhasil diperbarui!`);
  };

  // Photo upload & error states
  const [uploadingRole, setUploadingRole] = useState<'groom' | 'bride' | 'couple' | null>(null);
  const [uploadFeedback, setUploadFeedback] = useState<{ role: 'groom' | 'bride' | 'couple'; type: 'success' | 'error'; message: string } | null>(null);
  const [imageErrorRoles, setImageErrorRoles] = useState<{ groom?: boolean; bride?: boolean; couple?: boolean }>({});
  const [selectedPreviewGuestId, setSelectedPreviewGuestId] = useState<string>('');
  const [whatsAppMessageFormat, setWhatsAppMessageFormat] = useState<'standar' | 'link_atas'>('standar');

  // Sync state if config or guests prop updates from server
  useEffect(() => {
    if (config) {
      setFormData(JSON.parse(JSON.stringify(config)));
    }
  }, [config]);

  useEffect(() => {
    if (guests) {
      setGuestList(JSON.parse(JSON.stringify(guests)));
    }
  }, [guests]);

  // New guest input form
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestCategory, setNewGuestCategory] = useState<GuestItem['category']>('Umum');
  const [newGuestPhone, setNewGuestPhone] = useState('');
  const [newGuestNote, setNewGuestNote] = useState('');
  const [guestSearch, setGuestSearch] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  // Audio preview states for admin testing
  const [isPreviewAudioPlaying, setIsPreviewAudioPlaying] = useState(false);
  const [previewAudioInstance, setPreviewAudioInstance] = useState<HTMLAudioElement | null>(null);
  const [previewAudioStatus, setPreviewAudioStatus] = useState<string | null>(null);

  const handleTogglePreviewAudio = (customUrl?: string) => {
    const targetUrl = (customUrl || formData.audioUrl || '').trim();
    if (!targetUrl) {
      setPreviewAudioStatus('⚠️ Masukkan atau pilih URL audio terlebih dahulu.');
      return;
    }

    if (previewAudioInstance) {
      if (isPreviewAudioPlaying) {
        previewAudioInstance.pause();
        setIsPreviewAudioPlaying(false);
        setPreviewAudioStatus('Audio dijeda.');
      } else {
        previewAudioInstance.play()
          .then(() => {
            setIsPreviewAudioPlaying(true);
            setPreviewAudioStatus('▶ Sedang memutar pratinjau audio...');
          })
          .catch((err) => {
            console.error('Audio play error:', err);
            setPreviewAudioStatus('❌ Gagal memutar audio. Pastikan URL dapat diakses publik.');
            setIsPreviewAudioPlaying(false);
          });
      }
    } else {
      const audio = new Audio(targetUrl);
      audio.crossOrigin = 'anonymous';

      setPreviewAudioStatus('Memuat audio...');
      audio.addEventListener('playing', () => {
        setIsPreviewAudioPlaying(true);
        setPreviewAudioStatus('▶ Audio berhasil diputar!');
      });
      audio.addEventListener('ended', () => {
        setIsPreviewAudioPlaying(false);
        setPreviewAudioStatus('Pemutaran audio selesai.');
      });
      audio.addEventListener('error', (e) => {
        console.warn('Audio test error:', e);
        setPreviewAudioStatus('❌ Tidak dapat memuat file audio dari tautan ini.');
        setIsPreviewAudioPlaying(false);
      });

      audio.play()
        .then(() => {
          setPreviewAudioInstance(audio);
          setIsPreviewAudioPlaying(true);
        })
        .catch((err) => {
          console.error('Audio play blocked or failed:', err);
          setPreviewAudioStatus('❌ Browser memblokir pemutaran otomatis atau format tidak didukung.');
          setIsPreviewAudioPlaying(false);
        });
    }
  };

  const handleSelectAudioPreset = (url: string, title: string, artist: string) => {
    // Stop any playing preview
    if (previewAudioInstance) {
      previewAudioInstance.pause();
      setPreviewAudioInstance(null);
      setIsPreviewAudioPlaying(false);
    }
    setFormData({
      ...formData,
      audioUrl: url,
      musicTitle: title,
      musicArtist: artist
    });
    setPreviewAudioStatus(`Pilihan lagu: "${title}" telah diterapkan. Klik Simpan Data.`);
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('File audio maksimal 15MB. Untuk performa terbaik, gunakan link online/URL.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const resultUrl = event.target?.result as string;
      if (resultUrl) {
        if (previewAudioInstance) {
          previewAudioInstance.pause();
          setPreviewAudioInstance(null);
          setIsPreviewAudioPlaying(false);
        }
        const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setFormData({
          ...formData,
          audioUrl: resultUrl,
          musicTitle: fileNameWithoutExt
        });
        setPreviewAudioStatus(`File "${file.name}" berhasil diunggah! Klik Simpan Data.`);
      }
    };
    reader.readAsDataURL(file);
  };

  // Photo Editor Modal State
  const [photoEditorConfig, setPhotoEditorConfig] = useState<{
    isOpen: boolean;
    role: PhotoRole;
    currentUrl: string;
    personName?: string;
  }>({
    isOpen: false,
    role: 'bride',
    currentUrl: '',
    personName: '',
  });

  const handleOpenPhotoEditor = (role: PhotoRole, currentUrl: string, personName?: string) => {
    setPhotoEditorConfig({
      isOpen: true,
      role,
      currentUrl,
      personName,
    });
  };

  const handleSavePhotoFromEditor = async (role: PhotoRole, newUrl: string) => {
    let updated: WeddingConfig;
    if (role === 'couple') {
      updated = {
        ...formData,
        couplePhoto: newUrl,
      };
    } else {
      updated = {
        ...formData,
        [role]: {
          ...formData[role],
          photo: newUrl,
        },
      };
    }

    setFormData(updated);
    setImageErrorRoles((prev) => ({ ...prev, [role]: false }));
    await onSaveConfig(updated);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 3000);

    const roleName = role === 'couple' ? 'Berdua Pasangan' : role === 'bride' ? 'Mempelai Wanita' : 'Mempelai Pria';
    setSaveToast({
      title: `Foto ${roleName} Berhasil Diperbarui!`,
      detail: `Foto telah otomatis disimpan permanen ke server dan diperbarui di undangan.`,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
    });
  };

  const handlePhotoUpload = async (role: 'groom' | 'bride' | 'couple', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so picking the same file again triggers onChange
    e.target.value = '';

    if (file.size > 30 * 1024 * 1024) {
      alert('Ukuran file foto maksimal 30MB.');
      return;
    }

    setUploadingRole(role);
    setUploadFeedback(null);
    setImageErrorRoles((prev) => ({ ...prev, [role]: false }));

    try {
      let finalPhotoUrl = '';

      // 1. Direct Multipart upload to server - most reliable on Kiwi/mobile without OOM
      try {
        const uploadFormData = new FormData();
        uploadFormData.append('photo', file);

        const res = await fetch('/api/upload-file', {
          method: 'POST',
          body: uploadFormData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            finalPhotoUrl = data.url;
          }
        }
      } catch (uploadErr) {
        console.warn('Multipart upload fallback:', uploadErr);
      }

      // 2. Fallback if multipart failed: Client-side compression
      if (!finalPhotoUrl) {
        const compressedDataUrl = await compressImageFile(file, 1200, 0.85);
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl: compressedDataUrl }),
        });
        if (res.ok) {
          const data = await res.json();
          finalPhotoUrl = data.url || compressedDataUrl;
        } else {
          finalPhotoUrl = compressedDataUrl;
        }
      }

      // 3. Update form state AND automatically persist to server
      let updated: WeddingConfig;
      if (role === 'couple') {
        updated = {
          ...formData,
          couplePhoto: finalPhotoUrl,
        };
      } else {
        updated = {
          ...formData,
          [role]: {
            ...formData[role],
            photo: finalPhotoUrl,
          },
        };
      }

      setFormData(updated);
      await onSaveConfig(updated);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);

      const roleName = role === 'couple' ? 'Berdua Pasangan' : role === 'bride' ? 'Mempelai Wanita' : 'Mempelai Pria';
      setUploadFeedback({
        role,
        type: 'success',
        message: `Foto ${roleName} berhasil diunggah dan disimpan permanen ke server!`
      });

      setSaveToast({
        title: `Foto ${roleName} Berhasil Diperbarui!`,
        detail: `Foto telah otomatis tersimpan ke server dan siap tampil di undangan.`,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
      });
    } catch (err: any) {
      console.error('Error handling photo upload:', err);
      const roleName = role === 'couple' ? 'Berdua Pasangan' : role === 'bride' ? 'Mempelai Wanita' : 'Mempelai Pria';
      setUploadFeedback({
        role,
        type: 'error',
        message: `Gagal memproses foto ${roleName}: ${err?.message || 'Format gambar tidak didukung'}.`
      });
    } finally {
      setUploadingRole(null);
    }
  };

  // Admin Password Change Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPasswordInput, setOldPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [passwordModalError, setPasswordModalError] = useState<string | null>(null);
  const [passwordModalSuccess, setPasswordModalSuccess] = useState<string | null>(null);

  const handleOpenPasswordModal = () => {
    setOldPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setPasswordModalError(null);
    setPasswordModalSuccess(null);
    setIsPasswordModalOpen(true);
  };

  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordModalError(null);
    setPasswordModalSuccess(null);

    if (currentPassword && !validateAdminPassword(oldPasswordInput, currentPassword)) {
      setPasswordModalError('Kata sandi saat ini tidak sesuai!');
      return;
    }

    if (!newPasswordInput || newPasswordInput.trim().length < 4) {
      setPasswordModalError('Kata sandi baru minimal 4 karakter!');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordModalError('Konfirmasi kata sandi baru tidak cocok!');
      return;
    }

    if (onChangePassword) {
      onChangePassword(newPasswordInput.trim());
      setPasswordModalSuccess('Kata sandi admin berhasil diperbarui!');
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordModalSuccess(null);
      }, 1500);
    }
  };

  // Save changes to config
  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('⏳ Menyimpan perubahan ke server...');

    // Generate parents text automatically from father and mother if provided
    const updatedGroom = {
      ...formData.groom,
      photo: normalizeImageUrl(formData.groom.photo) || formData.groom.photo || config.groom.photo,
      parents: formData.groom.father && formData.groom.mother 
        ? `Putra dari ${formData.groom.father} dan ${formData.groom.mother}` 
        : formData.groom.parents
    };

    const updatedBride = {
      ...formData.bride,
      photo: normalizeImageUrl(formData.bride.photo) || formData.bride.photo || config.bride.photo,
      parents: formData.bride.father && formData.bride.mother 
        ? `Putri dari ${formData.bride.father} dan ${formData.bride.mother}` 
        : formData.bride.parents
    };

    const updatedConfig: WeddingConfig = {
      ...formData,
      groom: updatedGroom,
      bride: updatedBride
    };

    try {
      await Promise.all([
        onSaveConfig(updatedConfig),
        onSaveGuests(guestList)
      ]);
    } catch (err) {
      console.warn('Save error encountered:', err);
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';

    setIsSaving(false);
    setJustSaved(true);
    setLastSavedTime(timeStr);
    setUploadFeedback(null);

    setSaveToast({
      title: 'Data & Foto Berhasil Tersimpan! 🎉',
      detail: 'Semua perubahan foto mempelai wanita, foto pria, detail acara, musik, dan daftar tamu telah sukses disimpan dan disinkronkan ke semua browser & HP.',
      time: timeStr
    });

    setSaveStatus(`✅ Data undangan & foto berhasil disimpan pada pukul ${timeStr}`);

    setTimeout(() => {
      setJustSaved(false);
    }, 4000);

    setTimeout(() => {
      setSaveStatus(null);
    }, 5500);

    setTimeout(() => {
      setSaveToast(null);
    }, 6500);
  };

  // Add new guest
  const handleAddGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuestName.trim()) {
      alert('Nama tamu wajib diisi!');
      return;
    }

    const newGuest: GuestItem = {
      id: Date.now().toString(),
      name: newGuestName.trim(),
      category: newGuestCategory,
      phone: newGuestPhone.trim() || undefined,
      note: newGuestNote.trim() || undefined
    };

    const updated = [newGuest, ...guestList];
    setGuestList(updated);
    onSaveGuests(updated);
    setNewGuestName('');
    setNewGuestPhone('');
    setNewGuestNote('');
    setSaveStatus(`✅ Tamu "${newGuest.name}" berhasil ditambahkan.`);
    setTimeout(() => setSaveStatus(null), 3000);
  };

  // Delete guest
  const handleDeleteGuest = (id: string, name: string) => {
    if (window.confirm(`Hapus tamu "${name}"?`)) {
      const updated = guestList.filter((g) => g.id !== id);
      setGuestList(updated);
      onSaveGuests(updated);
    }
  };

  // Generate invitation link for a guest (always points to the root guest page /)
  const getGuestUrl = (name: string) => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    return `${origin}/?to=${encodeURIComponent(name)}`;
  };

  const getAdminUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/admin`;
  };

  const getMainGuestUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/`;
  };

  // Generate WhatsApp message template
  const getWhatsAppMessage = (guest: GuestItem) => {
    const groom = formData.groom.name || 'Jaka';
    const bride = formData.bride.name || 'Dian';
    const receptionDate = formData.resepsi.dateStr || 'Minggu, 27 Desember 2026';
    const url = getGuestUrl(guest.name);

    return `Kepada Yth.
Bapak/Ibu/Saudara/i
*${guest.name}*
─────────

*Assalamualaikum Warahmatullahi Wabarakatuh*

Tanpa mengurangi rasa hormat, perkenankan kami mengundang Bapak/Ibu/Saudara/i, teman sekaligus sahabat, untuk menghadiri acara pernikahan kami.

Resepsi : *${receptionDate}*

*Berikut tautan link undangan kami*, untuk info lengkap jadwal dan lokasi acara, silakan kunjungi:

${url}

Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan untuk hadir dan memberikan doa restu.

*Wassalamualaikum Warahmatullahi Wabarakatuh*

Terima Kasih

Hormat kami,
*${groom} & ${bride}*
─────────`;
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(id);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  const openWhatsApp = (guest: GuestItem) => {
    const text = getWhatsAppMessage(guest);
    let url = '';
    if (guest.phone) {
      let formattedPhone = guest.phone.replace(/\D/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '62' + formattedPhone.slice(1);
      }
      url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
    } else {
      url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    }
    window.open(url, '_blank');
  };

  // Export JSON backup
  const handleExportJson = () => {
    const data = { config: formData, guests: guestList };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `undangan-${formData.groom.name}-${formData.bride.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON backup
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.config) setFormData(parsed.config);
        if (parsed.guests) setGuestList(parsed.guests);
        alert('Data berhasil diimpor! Silakan klik "SIMPAN PERUBAHAN" untuk mengonfirmasi.');
      } catch {
        alert('Format file JSON tidak valid.');
      }
    };
    reader.readAsText(file);
  };

  const filteredGuests = guestList.filter(
    (g) =>
      g.name.toLowerCase().includes(guestSearch.toLowerCase()) ||
      g.category.toLowerCase().includes(guestSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#38556e] font-sans w-full pb-16 relative">
      {/* Floating Save Notification Toast (Always Visible Regardless of Scroll) */}
      {saveToast && (
        <div 
          role="status"
          aria-live="polite"
          className="fixed top-5 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-50 w-[92vw] max-w-md bg-white border-2 border-emerald-500 rounded-2xl shadow-2xl p-4 flex items-start gap-3.5 animate-bounce-subtle backdrop-blur-md"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-bold text-gray-900 text-sm sm:text-base">
                {saveToast.title}
              </h4>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {saveToast.time}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
              {saveToast.detail}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSaveToast(null)}
            className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-all cursor-pointer"
            title="Tutup pemberitahuan"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-[#5797d0] text-white py-4 px-4 sm:px-6 shadow-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 active:scale-95 text-white transition-all cursor-pointer"
              title="Kembali ke Pratinjau Undangan"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 leading-none">
                <span>💍 Admin Pengelola Undangan</span>
              </h1>
              <p className="text-xs sm:text-sm text-white/90 mt-1 flex items-center gap-2">
                <span>Akses khusus di</span>
                <span className="bg-black/20 px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold">/admin</span>
                {lastSavedTime && (
                  <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-600/90 text-white px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Tersimpan: {lastSavedTime}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenPasswordModal}
              className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-medium text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5"
              title="Ubah kata sandi login admin"
            >
              <KeyRound className="w-3.5 h-3.5 text-yellow-300" />
              <span>Ganti Sandi</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-medium text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5"
              title="Buka halaman tamu undangan"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Lihat Halaman Tamu (/)</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={`px-3.5 py-1.5 rounded-lg text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 ${
                justSaved 
                  ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300' 
                  : 'bg-[#ec79b8] hover:bg-[#d866a4]'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : justSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Tersimpan!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Data</span>
                </>
              )}
            </button>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="px-3 py-1.5 rounded-lg bg-red-500/80 hover:bg-red-600 text-white font-medium text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                title="Keluar dari sesi admin"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-5">
        {/* Save Status Banner */}
        {saveStatus && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-400 text-emerald-800 text-sm font-semibold flex items-center justify-between animate-fade-in shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{saveStatus}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setSaveStatus(null)} 
              className="text-emerald-700 hover:text-emerald-950 cursor-pointer font-bold px-2 py-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* URL Separation Card: Guest vs Admin */}
        <div className="bg-white rounded-2xl border border-[#d9e2ea] p-4 sm:p-5 mb-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-sm sm:text-base font-bold text-[#34495e] flex items-center gap-2">
              <span className="p-1 rounded-md bg-[#ebf3fa] text-[#5797d0]">🌐</span>
              <span>Pemisahan URL: Halaman Tamu Undangan vs Halaman Admin</span>
            </h2>
            <span className="text-[11px] bg-[#edf2f7] text-[#4a5568] px-2 py-0.5 rounded-full font-medium">
              Tampilan depan kini bersih tanpa tombol admin
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Guest URL */}
            <div className="bg-[#f8fbfd] border border-[#d4e4f2] rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold text-[#2b6cb0] flex items-center gap-1.5">
                    💌 URL Halaman Tamu (Tampilan Depan)
                  </span>
                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                    Untuk Tamu
                  </span>
                </div>
                <p className="text-xs text-[#527595] mb-2 leading-relaxed">
                  Tampilan depan murni hanya untuk tamu undangan, tanpa tombol admin dan tanpa panel editor.
                </p>
                <div className="bg-white px-2.5 py-1.5 rounded-lg border border-[#cbe0f0] font-mono text-xs text-[#2d3748] truncate select-all">
                  {getMainGuestUrl()}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-[#e2eaf1]">
                <button
                  type="button"
                  onClick={() => copyToClipboard(getMainGuestUrl(), 'main_guest_url')}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-[#5797d0] hover:bg-[#4682b8] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  {copiedIndex === 'main_guest_url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIndex === 'main_guest_url' ? 'Tersalin!' : 'Salin URL Tamu'}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-1.5 px-3 rounded-lg bg-white hover:bg-[#f0f4f8] text-[#5797d0] border border-[#5797d0]/30 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                  title="Buka tampilan depan"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka</span>
                </button>
              </div>
            </div>

            {/* Admin URL */}
            <div className="bg-[#fff9fb] border border-[#fbd4e7] rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold text-[#b83280] flex items-center gap-1.5">
                    🔐 URL Khusus Pengelola (Admin)
                  </span>
                  <span className="text-[10px] bg-[#fce7f3] text-[#be185d] px-2 py-0.5 rounded-full font-semibold">
                    Khusus Anda
                  </span>
                </div>
                <p className="text-xs text-[#705260] mb-2 leading-relaxed">
                  Buka URL ini kapan saja di browser untuk mengelola isi undangan, ganti foto, dan menambah tamu.
                </p>
                <div className="bg-white px-2.5 py-1.5 rounded-lg border border-[#f5bfda] font-mono text-xs text-[#2d3748] truncate select-all">
                  {getAdminUrl()}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-[#f7e0eb]">
                <button
                  type="button"
                  onClick={() => copyToClipboard(getAdminUrl(), 'admin_url')}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-[#ec79b8] hover:bg-[#d866a4] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  {copiedIndex === 'admin_url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIndex === 'admin_url' ? 'Tersalin!' : 'Salin URL Admin'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Notice Info */}
        <div className="bg-[#fff8df] border-l-4 border-[#efc45c] p-3.5 rounded-r-xl mb-5 text-sm text-[#745e28] leading-relaxed shadow-xs flex items-start gap-2.5">
          <Clock className="w-5 h-5 text-[#efc45c] shrink-0 mt-0.5" />
          <div>
            <strong>Informasi Jadwal Acara:</strong> Akad Nikah diset pada <b>{formData.akad.dateStr}</b> dan Resepsi pada <b>{formData.resepsi.dateStr}</b>. Data ini langsung terhubung ke kalender dan hitung mundur di halaman undangan.
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-5 border-b border-[#d9e0e5] scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('pengantin')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'pengantin'
                ? 'bg-[#5797d0] text-white shadow-xs'
                : 'bg-white text-[#527595] hover:bg-[#e9eef2]'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>👰 Pengantin & Foto</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('acara')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'acara'
                ? 'bg-[#5797d0] text-white shadow-xs'
                : 'bg-white text-[#527595] hover:bg-[#e9eef2]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>🕌 Akad & Resepsi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('musik_cerita')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'musik_cerita'
                ? 'bg-[#5797d0] text-white shadow-xs'
                : 'bg-white text-[#527595] hover:bg-[#e9eef2]'
            }`}
          >
            <Music className="w-4 h-4" />
            <span>🎵 Musik & Cerita</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kado')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'kado'
                ? 'bg-[#5797d0] text-white shadow-xs'
                : 'bg-white text-[#527595] hover:bg-[#e9eef2]'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>🎁 Hadiah & Rekening</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tamu')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'tamu'
                ? 'bg-[#ec79b8] text-white shadow-xs'
                : 'bg-white text-[#527595] hover:bg-[#e9eef2]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>👥 Daftar Tamu & WhatsApp ({guestList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('ucapan');
              fetchAdminWishes();
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'ucapan'
                ? 'bg-[#ec79b8] text-white shadow-xs'
                : 'bg-white text-[#527595] hover:bg-[#e9eef2]'
            }`}
          >
            <MessageSquareHeart className="w-4 h-4" />
            <span>💌 Ucapan & RSVP ({wishesList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('google_script')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'google_script'
                ? 'bg-[#0f7b40] text-white shadow-md'
                : 'bg-emerald-50 text-[#0f7b40] hover:bg-emerald-100 border border-emerald-300'
            }`}
          >
            <span>📗 Buku Tamu (Google Sheets)</span>
          </button>
        </div>

        {/* TAB 1: DATA PENGANTIN & FOTO */}
        {activeTab === 'pengantin' && (
          <div className="space-y-5">
            {/* Card Mempelai */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#e5ebf0]">
              <h2 className="text-lg sm:text-xl font-bold text-[#5797d0] mb-4 flex items-center gap-2">
                <span>👰 Data Mempelai Pria & Wanita</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Groom Info */}
                <div className="space-y-3 p-4 bg-[#f8fbfe] rounded-xl border border-[#d9e8f5]">
                  <h3 className="font-bold text-[#5797d0] text-base border-b border-[#d9e8f5] pb-2">
                    Mempelai Pria
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-[#527595] mb-1">
                      Nama Panggilan (Cover):
                    </label>
                    <input
                      type="text"
                      value={formData.groom.name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          groom: { ...formData.groom, name: e.target.value }
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white"
                      placeholder="Contoh: Jaka"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#527595] mb-1">
                      Nama Lengkap & Gelar:
                    </label>
                    <input
                      type="text"
                      value={formData.groom.fullName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          groom: { ...formData.groom, fullName: e.target.value }
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white"
                      placeholder="Contoh: Jaka, S.Kom"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#527595] mb-1">
                      Nama Ayah:
                    </label>
                    <input
                      type="text"
                      value={formData.groom.father || 'Bapak Asmarni'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          groom: { ...formData.groom, father: e.target.value }
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#527595] mb-1">
                      Nama Ibu:
                    </label>
                    <input
                      type="text"
                      value={formData.groom.mother || 'Ibu Lamidah'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          groom: { ...formData.groom, mother: e.target.value }
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#527595] mb-1">
                      Keterangan Orang Tua (Teks Lengkap):
                    </label>
                    <input
                      type="text"
                      value={formData.groom.parents}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          groom: { ...formData.groom, parents: e.target.value }
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white"
                      placeholder="Putra Keempat dari Bapak Asmarni dan Ibu Lamidah"
                    />
                  </div>
                </div>

                {/* Bride Info */}
                <div className="space-y-3 p-4 bg-[#fdf8fa] rounded-xl border border-[#f5d9e8]">
                  <h3 className="font-bold text-[#ef72b4] text-base border-b border-[#f5d9e8] pb-2">
                    Mempelai Wanita
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-[#527595] mb-1">
                      Nama Panggilan (Cover):
                    </label>
                    <input
                      type="text"
                      value={formData.bride.name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bride: { ...formData.bride, name: e.target.value }
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white"
                      placeholder="Contoh: Dian"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#527595] mb-1">
                      Nama Lengkap & Gelar:
                    </label>
                    <input
                      type="text"
                      value={formData.bride.fullName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bride: { ...formData.bride, fullName: e.target.value }
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white"
                      placeholder="Contoh: Harinurdian, S.E"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#527595] mb-1">
                      Nama Ayah:
                    </label>
                    <input
                      type="text"
                      value={formData.bride.father || 'Bapak Hatta, S.Pd.Sd'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bride: { ...formData.bride, father: e.target.value }
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#527595] mb-1">
                      Nama Ibu:
                    </label>
                    <input
                      type="text"
                      value={formData.bride.mother || 'Ibu Sumartik'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bride: { ...formData.bride, mother: e.target.value }
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#527595] mb-1">
                      Keterangan Orang Tua (Teks Lengkap):
                    </label>
                    <input
                      type="text"
                      value={formData.bride.parents}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bride: { ...formData.bride, parents: e.target.value }
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white"
                      placeholder="Putri Pertama dari Bapak Hatta, S.Pd.Sd dan Ibu Sumartik"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card Foto Mempelai */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#e5ebf0]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#5797d0] flex items-center gap-2">
                    <Camera className="w-5 h-5 text-[#5797d0]" />
                    <span>📷 Foto Mempelai (Pria & Wanita)</span>
                  </h2>
                  <p className="text-xs text-[#527595] mt-0.5">
                    Unggah langsung dari galeri HP / laptop, atau tempel tautan Google Drive / web image.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`self-start sm:self-auto px-4 py-2 rounded-xl text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2 transition-all ${
                    justSaved 
                      ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300' 
                      : 'bg-[#5797d0] hover:bg-[#4784ba]'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : justSaved ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      <span>Foto Berhasil Tersimpan!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Foto</span>
                    </>
                  )}
                </button>
              </div>

              {/* Upload Feedback Alert */}
              {uploadFeedback && (
                <div className={`mb-4 p-3 rounded-xl flex items-start gap-2.5 text-xs ${
                  uploadFeedback.type === 'success' 
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}>
                  {uploadFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{uploadFeedback.message}</p>
                    {uploadFeedback.type === 'success' && (
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="mt-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-2xs cursor-pointer transition-all inline-flex items-center gap-1"
                      >
                        <Save className="w-3 h-3" />
                        <span>Simpan Perubahan Sekarang</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Info Google Drive & Tips */}
              <div className="mb-4 p-3.5 rounded-xl bg-[#f0f7fc] border border-[#d3e5f4] text-xs text-[#2c5282] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <span className="font-bold">💡 Tips Foto:</span> Anda dapat langsung klik tombol <strong>"Unggah Foto dari HP"</strong> untuk mengambil foto dari galeri/kamera tanpa ribet. Tautan <strong>Google Drive</strong> juga otomatis didukung penuh.
                </div>
                <div className="flex flex-wrap gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        groom: {
                          ...prev.groom,
                          photo: 'https://lh3.googleusercontent.com/d/1yuOkyDz_WIEKZHT-YAY2wE-0kVdL0VHJ'
                        }
                      }))
                    }
                    className="px-2.5 py-1 rounded-md bg-white border border-[#b8d5ee] text-[#2c5282] hover:bg-[#e1effa] font-semibold text-[11px] cursor-pointer transition-all shadow-2xs"
                  >
                    Foto Jaka (Drive)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        bride: {
                          ...prev.bride,
                          photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
                        }
                      }))
                    }
                    className="px-2.5 py-1 rounded-md bg-white border border-[#f3cadc] text-[#b33771] hover:bg-[#fdebf3] font-semibold text-[11px] cursor-pointer transition-all shadow-2xs"
                  >
                    Foto Dian (Bawaan)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Groom Photo Field */}
                <div className="p-4 rounded-xl bg-[#f8fbfe] border border-[#d9e8f5] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[#2b5783] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#5797d0]"></span>
                        Foto Pengantin Pria ({formData.groom.name})
                      </span>
                      {uploadingRole === 'groom' && (
                        <span className="text-[11px] font-semibold text-[#5797d0] flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Mengunggah...
                        </span>
                      )}
                    </div>

                    {/* Prominent Action Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => handleOpenPhotoEditor('groom', formData.groom.photo, formData.groom.name)}
                        className="flex items-center justify-center gap-1.5 w-full py-2.5 px-3 rounded-xl bg-linear-to-r from-[#2c5282] to-[#5797d0] hover:opacity-95 text-white font-bold text-xs shadow-2xs cursor-pointer transition-all active:scale-[0.99]"
                      >
                        <Crop className="w-3.5 h-3.5 text-yellow-300" />
                        <span>Edit & Atur Foto Pria</span>
                      </button>

                      <label className="flex items-center justify-center gap-1.5 w-full py-2.5 px-3 rounded-xl bg-white border border-[#b8d5ee] hover:bg-[#eef6fc] text-[#2c5282] font-bold text-xs shadow-2xs cursor-pointer transition-all active:scale-[0.99]">
                        {uploadingRole === 'groom' ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5797d0]" />
                            <span>Mengunggah...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-3.5 h-3.5 text-[#5797d0]" />
                            <span>Unggah dari File/HP</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingRole === 'groom'}
                          onChange={(e) => handlePhotoUpload('groom', e)}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <label className="block text-[11px] font-bold text-[#527595] mb-1">
                      Atau Tempel Link Foto / Google Drive:
                    </label>
                    <input
                      type="text"
                      value={formData.groom.photo}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          groom: { ...formData.groom, photo: e.target.value }
                        });
                        setImageErrorRoles((prev) => ({ ...prev, groom: false }));
                      }}
                      placeholder="https://drive.google.com/file/d/... atau https://..."
                      className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-xs bg-white font-mono"
                    />
                  </div>

                  {/* Groom Preview Box */}
                  <div className="mt-3 pt-3 border-t border-[#e2eaf1]">
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-20 rounded-lg overflow-hidden border border-[#cbd5e0] shadow-xs bg-white shrink-0 relative flex items-center justify-center">
                        {formData.groom.photo ? (
                          <img
                            src={normalizeImageUrl(formData.groom.photo)}
                            alt="Preview Pria"
                            referrerPolicy="no-referrer"
                            onLoad={() => setImageErrorRoles((prev) => ({ ...prev, groom: false }))}
                            onError={() => setImageErrorRoles((prev) => ({ ...prev, groom: true }))}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] text-gray-400 text-center px-1">Tidak ada foto</span>
                        )}
                      </div>
                      <div className="flex-1 text-xs">
                        <span className="font-bold text-[#2d3748] block">Pratinjau Foto Pria</span>
                        {imageErrorRoles.groom ? (
                          <span className="text-[11px] text-rose-600 block mt-1 leading-snug">
                            ⚠️ Foto tidak dapat dimuat. Pastikan izin Google Drive disetel ke "Siapa saja yang memiliki link" atau gunakan tombol Unggah di atas.
                          </span>
                        ) : formData.groom.photo ? (
                          <span className="text-[11px] text-emerald-700 block mt-1">
                            ✓ Foto siap ditampilkan di undangan
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-500 block mt-1">
                            Silakan unggah foto pengantin pria
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bride Photo Field */}
                <div className="p-4 rounded-xl bg-[#fdf8fa] border border-[#f5d9e8] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[#b33771] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#ef72b4]"></span>
                        Foto Pengantin Wanita ({formData.bride.name})
                      </span>
                      {uploadingRole === 'bride' && (
                        <span className="text-[11px] font-semibold text-[#ef72b4] flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Mengunggah...
                        </span>
                      )}
                    </div>

                    {/* Prominent Action Buttons for Bride */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => handleOpenPhotoEditor('bride', formData.bride.photo, formData.bride.name)}
                        className="flex items-center justify-center gap-1.5 w-full py-2.5 px-3 rounded-xl bg-linear-to-r from-[#b33771] to-[#ef72b4] hover:opacity-95 text-white font-bold text-xs shadow-2xs cursor-pointer transition-all active:scale-[0.99]"
                      >
                        <Crop className="w-3.5 h-3.5 text-yellow-300" />
                        <span>Edit & Atur Foto Wanita</span>
                      </button>

                      <label className="flex items-center justify-center gap-1.5 w-full py-2.5 px-3 rounded-xl bg-white border border-[#f5cbe1] hover:bg-[#fdf4f9] text-[#b33771] font-bold text-xs shadow-2xs cursor-pointer transition-all active:scale-[0.99]">
                        {uploadingRole === 'bride' ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ef72b4]" />
                            <span>Mengunggah...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-3.5 h-3.5 text-[#ef72b4]" />
                            <span>Unggah dari File/HP</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingRole === 'bride'}
                          onChange={(e) => handlePhotoUpload('bride', e)}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <label className="block text-[11px] font-bold text-[#527595] mb-1">
                      Atau Tempel Link Foto / Google Drive:
                    </label>
                    <input
                      type="text"
                      value={formData.bride.photo}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          bride: { ...formData.bride, photo: e.target.value }
                        });
                        setImageErrorRoles((prev) => ({ ...prev, bride: false }));
                      }}
                      placeholder="https://drive.google.com/file/d/... atau https://..."
                      className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#ef72b4] outline-none text-xs bg-white font-mono"
                    />
                  </div>

                  {/* Bride Preview Box */}
                  <div className="mt-3 pt-3 border-t border-[#f5d9e8]">
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-20 rounded-lg overflow-hidden border border-[#cbd5e0] shadow-xs bg-white shrink-0 relative flex items-center justify-center">
                        {formData.bride.photo ? (
                          <img
                            src={normalizeImageUrl(formData.bride.photo)}
                            alt="Preview Wanita"
                            referrerPolicy="no-referrer"
                            onLoad={() => setImageErrorRoles((prev) => ({ ...prev, bride: false }))}
                            onError={() => setImageErrorRoles((prev) => ({ ...prev, bride: true }))}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] text-gray-400 text-center px-1">Tidak ada foto</span>
                        )}
                      </div>
                      <div className="flex-1 text-xs">
                        <span className="font-bold text-[#2d3748] block">Pratinjau Foto Wanita</span>
                        {imageErrorRoles.bride ? (
                          <span className="text-[11px] text-rose-600 block mt-1 leading-snug">
                            ⚠️ Foto tidak dapat dimuat. Pastikan izin Google Drive disetel ke "Siapa saja yang memiliki link" atau gunakan tombol Unggah di atas.
                          </span>
                        ) : formData.bride.photo ? (
                          <span className="text-[11px] text-emerald-700 block mt-1">
                            ✓ Foto siap ditampilkan di undangan
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-500 block mt-1">
                            Silakan unggah foto pengantin wanita
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Foto Berdua Pasangan / Preview WhatsApp */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#e5ebf0]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#5797d0] flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#ef72b4]" />
                    <span>💑 Foto Berdua Pasangan (Pratinjau Link WhatsApp & Medsos)</span>
                  </h2>
                  <p className="text-xs text-[#527595] mt-0.5">
                    Foto ini akan otomatis muncul sebagai gambar thumbnail mempelai pria & wanita di atas pesan WhatsApp saat Anda membagikan link undangan.
                  </p>
                </div>
                <span className="self-start sm:self-auto px-2.5 py-1 rounded-full bg-pink-50 text-pink-700 text-[11px] font-bold border border-pink-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-pink-600" />
                  <span>Preview WhatsApp Siap</span>
                </span>
              </div>

              <div className="p-4 rounded-xl bg-linear-to-br from-[#f8fbfe] via-white to-[#fdf8fa] border border-[#d9e8f5]">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-5">
                  {/* Image Preview Box */}
                  <div className="relative shrink-0 group">
                    <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-gray-100 relative">
                      <img
                        src={normalizeImageUrl(formData.couplePhoto || '/couple-photo.jpg')}
                        alt="Foto Berdua Pasangan"
                        referrerPolicy="no-referrer"
                        onLoad={() => setImageErrorRoles((prev) => ({ ...prev, couple: false }))}
                        onError={() => setImageErrorRoles((prev) => ({ ...prev, couple: true }))}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-white px-2 py-0.5 rounded-full shadow-xs border border-[#cbd5e0] text-[10px] font-bold text-[#5797d0]">
                      1:1 Square
                    </div>
                  </div>

                  {/* Form & Actions */}
                  <div className="flex-1 w-full space-y-3">
                    <div>
                      <span className="text-xs font-bold text-[#2d3748] block mb-1">
                        Ganti Foto Berdua Mempelai:
                      </span>
                      <p className="text-[11px] text-[#718096] mb-2.5">
                        Pilih foto romantis berdua yang menampilkan kedua mempelai pria dan wanita menikah.
                      </p>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenPhotoEditor('couple', formData.couplePhoto || '/couple-photo.jpg', 'Foto Berdua Pasangan')}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-linear-to-r from-[#2c5282] to-[#5797d0] hover:opacity-95 text-white font-bold text-xs shadow-xs cursor-pointer transition-all active:scale-95"
                        >
                          <Crop className="w-4 h-4 text-yellow-300" />
                          <span>Edit & Atur Foto Berdua</span>
                        </button>

                        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#b8d5ee] hover:bg-[#eef6fc] text-[#2c5282] font-bold text-xs shadow-xs cursor-pointer transition-all active:scale-95">
                          {uploadingRole === 'couple' ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-[#5797d0]" />
                              <span>Mengunggah Foto...</span>
                            </>
                          ) : (
                            <>
                              <Camera className="w-4 h-4 text-[#5797d0]" />
                              <span>Unggah Cepat File/HP</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingRole === 'couple'}
                            onChange={(e) => handlePhotoUpload('couple', e)}
                            className="hidden"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, couplePhoto: '/couple-photo.jpg' }));
                            setImageErrorRoles((prev) => ({ ...prev, couple: false }));
                          }}
                          className="px-3 py-2 rounded-xl bg-white border border-[#cbd5e0] hover:bg-gray-50 text-gray-700 font-semibold text-xs transition-all shadow-2xs cursor-pointer"
                        >
                          Foto Bawaan
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#527595] mb-1">
                        Atau Tempel URL Foto / Link Google Drive:
                      </label>
                      <input
                        type="text"
                        value={formData.couplePhoto || ''}
                        onChange={(e) => {
                          setFormData({ ...formData, couplePhoto: e.target.value });
                          setImageErrorRoles((prev) => ({ ...prev, couple: false }));
                        }}
                        placeholder="https://drive.google.com/file/d/... atau https://..."
                        className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-xs bg-white font-mono"
                      />
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-gray-200/70 text-xs">
                      <div className="text-[#527595] text-[11px]">
                        {imageErrorRoles.couple ? (
                          <span className="text-rose-600 font-semibold">⚠️ Foto tidak dapat dimuat. Periksa URL atau gunakan tombol Unggah di atas.</span>
                        ) : (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Foto aktif dan siap otomatis muncul di WhatsApp
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('tamu')}
                        className="text-[#5797d0] hover:underline font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Lihat Pratinjau Tampilan WhatsApp</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Kutipan Ayat */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#e5ebf0]">
              <h2 className="text-lg sm:text-xl font-bold text-[#5797d0] mb-4">
                📖 Kutipan Ayat / Doa
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#527595] mb-1">
                    Isi Kutipan Ayat:
                  </label>
                  <textarea
                    rows={3}
                    value={formData.quote}
                    onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#527595] mb-1">
                    Sumber / Nama Surat:
                  </label>
                  <input
                    type="text"
                    value={formData.quoteSource}
                    onChange={(e) => setFormData({ ...formData, quoteSource: e.target.value })}
                    placeholder="Contoh: Q.S Ar-Rum : 21"
                    className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AKAD & RESEPSI */}
        {activeTab === 'acara' && (
          <div className="space-y-5">
            {/* AKAD */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#e5ebf0]">
              <h2 className="text-lg sm:text-xl font-bold text-[#ef72b4] mb-4 flex items-center gap-2">
                <span>🕌 Rincian Akad Nikah</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#527595] mb-1">
                    Tanggal Akad:
                  </label>
                  <input
                    type="text"
                    value={formData.akad.dateStr}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        akad: { ...formData.akad, dateStr: e.target.value }
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white"
                    placeholder="Sabtu, 26 Desember 2026"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#527595] mb-1">
                    Waktu Akad:
                  </label>
                  <input
                    type="text"
                    value={formData.akad.timeStr}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        akad: { ...formData.akad, timeStr: e.target.value }
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white"
                    placeholder="Pukul 08.00 WIB - Selesai"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#527595] mb-1">
                    Nama Tempat Akad:
                  </label>
                  <input
                    type="text"
                    value={formData.akad.venueName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        akad: { ...formData.akad, venueName: e.target.value }
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white"
                    placeholder="Kediaman Mempelai Wanita"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#527595] mb-1">
                    Alamat Lengkap Akad:
                  </label>
                  <input
                    type="text"
                    value={formData.akad.address}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        akad: { ...formData.akad, address: e.target.value }
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white"
                  />
                </div>
              </div>
            </div>

            {/* RESEPSI */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#e5ebf0]">
              <h2 className="text-lg sm:text-xl font-bold text-[#5797d0] mb-4 flex items-center gap-2">
                <span>🎉 Rincian Resepsi Pernikahan</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#527595] mb-1">
                    Tanggal Resepsi:
                  </label>
                  <input
                    type="text"
                    value={formData.resepsi.dateStr}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        resepsi: { ...formData.resepsi, dateStr: e.target.value }
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white"
                    placeholder="Minggu, 27 Desember 2026"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#527595] mb-1">
                    Waktu Resepsi:
                  </label>
                  <input
                    type="text"
                    value={formData.resepsi.timeStr}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        resepsi: { ...formData.resepsi, timeStr: e.target.value }
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white"
                    placeholder="Pukul 14.00 - 19.00 WIB"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#527595] mb-1">
                    Nama Tempat Resepsi:
                  </label>
                  <input
                    type="text"
                    value={formData.resepsi.venueName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        resepsi: { ...formData.resepsi, venueName: e.target.value }
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white"
                    placeholder="Kediaman Mempelai Wanita"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#527595] mb-1">
                    Alamat Lengkap Resepsi:
                  </label>
                  <input
                    type="text"
                    value={formData.resepsi.address}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        resepsi: { ...formData.resepsi, address: e.target.value }
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#527595] mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#ef72b4]" />
                    <span>Link Google Maps:</span>
                  </label>
                  <input
                    type="text"
                    value={formData.resepsi.mapsUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({
                        ...formData,
                        resepsi: { ...formData.resepsi, mapsUrl: val },
                        akad: { ...formData.akad, mapsUrl: val }
                      });
                    }}
                    placeholder="https://maps.app.goo.gl/..."
                    className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MUSIK & CERITA CINTA */}
        {activeTab === 'musik_cerita' && (
          <div className="space-y-5">
            {/* Musik */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#e5ebf0]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-[#5797d0] flex items-center gap-2">
                  <Music className="w-5 h-5 text-[#5797d0]" />
                  <span>🎵 Pengaturan Musik Undangan</span>
                </h2>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`self-start sm:self-auto px-3.5 py-1.5 rounded-lg text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-all ${
                    justSaved 
                      ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300' 
                      : 'bg-[#5797d0] hover:bg-[#4784ba]'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : justSaved ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      <span>Musik Tersimpan!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Musik</span>
                    </>
                  )}
                </button>
              </div>

              {/* Preset Pilihan Cepat */}
              <div className="mb-4 p-3.5 rounded-xl bg-[#f0f7fc] border border-[#d3e5f4]">
                <span className="block text-xs font-bold text-[#2b6cb0] mb-2 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#ef72b4]" />
                  <span>Pilihan Cepat Musik Rekomendasi:</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectAudioPreset(
                        'https://wedding-invitations-chi.vercel.app/audio/cinta_terakhir_cover1.mp3',
                        'Cinta Terakhir (Cover)',
                        'Ari Lasso / Cover'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#b8d5ee] text-[#2c5282] hover:bg-[#ebf4fc] shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-[#ef72b4]" />
                    <span>Lagu: Cinta Terakhir (Cover)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleSelectAudioPreset(
                        'https://cdn.pixabay.com/download/audio/2022/05/16/audio_c89b7eb9a0.mp3?filename=romantic-acoustic-guitar-112191.mp3',
                        'Romantic Acoustic Guitar',
                        'Acoustic Wedding'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#b8d5ee] text-[#2c5282] hover:bg-[#ebf4fc] shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Music className="w-3.5 h-3.5 text-[#5797d0]" />
                    <span>Lagu: Akustik Gitar Romantis</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#527595] mb-1">
                    URL File Audio (.mp3 / link online):
                  </label>
                  <input
                    type="text"
                    value={formData.audioUrl}
                    onChange={(e) => {
                      setFormData({ ...formData, audioUrl: e.target.value });
                      if (previewAudioInstance) {
                        previewAudioInstance.pause();
                        setPreviewAudioInstance(null);
                        setIsPreviewAudioPlaying(false);
                      }
                    }}
                    placeholder="https://wedding-invitations-chi.vercel.app/audio/cinta_terakhir_cover1.mp3"
                    className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white font-mono text-xs"
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
                    <span className="text-xs text-[#718096]">
                      Masukkan link file audio online langsung (.mp3) atau unggah file dari perangkat.
                    </span>

                    {/* Upload File Button */}
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f0f4f8] hover:bg-[#e2e8f0] text-[#4a5568] text-xs font-semibold cursor-pointer border border-[#cbd5e0] transition-colors self-start sm:self-auto">
                      <FileAudio className="w-3.5 h-3.5 text-[#5797d0]" />
                      <span>Unggah File Audio...</span>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={handleAudioUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Test Audio Preview Bar */}
                <div className="sm:col-span-2 p-3 rounded-xl bg-[#f7fafc] border border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleTogglePreviewAudio()}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs ${
                        isPreviewAudioPlaying
                          ? 'bg-[#ef72b4] text-white hover:bg-[#d65d9e]'
                          : 'bg-[#5797d0] text-white hover:bg-[#4784ba]'
                      }`}
                    >
                      {isPreviewAudioPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>Jeda Tes Audio</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Putar Tes Audio Sekarang</span>
                        </>
                      )}
                    </button>

                    <div className="text-xs text-[#4a5568]">
                      {previewAudioStatus ? (
                        <span className="font-medium">{previewAudioStatus}</span>
                      ) : (
                        <span className="text-[#718096]">Klik tombol untuk mengetes apakah suara audio terdengar</span>
                      )}
                    </div>
                  </div>

                  {formData.audioUrl && (
                    <span className="text-[11px] font-mono text-[#718096] truncate max-w-xs">
                      {formData.audioUrl.startsWith('data:') ? 'File lokal terunggah' : formData.audioUrl}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#527595] mb-1">
                    Judul Lagu:
                  </label>
                  <input
                    type="text"
                    value={formData.musicTitle}
                    onChange={(e) => setFormData({ ...formData, musicTitle: e.target.value })}
                    placeholder="Cinta Terakhir (Cover)"
                    className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#527595] mb-1">
                    Penyanyi / Artis:
                  </label>
                  <input
                    type="text"
                    value={formData.musicArtist}
                    onChange={(e) => setFormData({ ...formData, musicArtist: e.target.value })}
                    placeholder="Ari Lasso / Cover"
                    className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Love Story Milestones */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#e5ebf0]">
              <h2 className="text-lg sm:text-xl font-bold text-[#5797d0] mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-[#ef72b4]" />
                <span>💕 Love Story (Cerita Perjalanan Cinta)</span>
              </h2>

              <div className="space-y-4">
                {formData.stories.map((story, idx) => (
                  <div key={idx} className="p-4 bg-[#f8fbfe] rounded-xl border border-[#d9e8f5] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#ef72b4] text-sm">
                        Cerita #{idx + 1}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#527595] mb-1">
                        Judul Cerita:
                      </label>
                      <input
                        type="text"
                        value={story.title}
                        onChange={(e) => {
                          const newStories = [...formData.stories];
                          newStories[idx].title = e.target.value;
                          setFormData({ ...formData, stories: newStories });
                        }}
                        placeholder="Awal Pertemuan"
                        className="w-full px-3 py-1.5 rounded-lg border border-[#d9e0e5] text-sm bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#527595] mb-1">
                        Isi Cerita:
                      </label>
                      <textarea
                        rows={2}
                        value={story.story}
                        onChange={(e) => {
                          const newStories = [...formData.stories];
                          newStories[idx].story = e.target.value;
                          setFormData({ ...formData, stories: newStories });
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-[#d9e0e5] text-sm bg-white resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: HADIAH & REKENING */}
        {activeTab === 'kado' && (
          <div className="space-y-5">
            {/* Rekening Bank (Amplop Digital) */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#e5ebf0]">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#5797d0] flex items-center gap-2">
                    <span>💳 Amplop Digital (Nomor Rekening Bank)</span>
                  </h2>
                  <p className="text-xs text-[#527595] mt-0.5">
                    Daftar rekening bank / e-wallet yang ditampilkan kepada para tamu undangan
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const currentAccounts = formData.bankAccounts && formData.bankAccounts.length > 0
                      ? [...formData.bankAccounts]
                      : [{ ...formData.bank }];
                    const newAccounts = [
                      ...currentAccounts,
                      {
                        bankName: 'BANK BSI SYARIAH',
                        accountNumber: '',
                        accountHolder: 'JAKA'
                      }
                    ];
                    setFormData({
                      ...formData,
                      bankAccounts: newAccounts
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5797d0] hover:bg-[#4383bd] text-white text-xs font-bold shadow-2xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Rekening Baru</span>
                </button>
              </div>

              {/* Render List of Bank Accounts */}
              <div className="space-y-4">
                {(formData.bankAccounts && formData.bankAccounts.length > 0
                  ? formData.bankAccounts
                  : [{ ...formData.bank }]
                ).map((account, index) => {
                  const isJaka = account.accountHolder.toLowerCase().includes('jaka');
                  return (
                    <div 
                      key={index}
                      className="p-4 rounded-xl border border-[#d9e8f5] bg-[#f8fbfe] relative"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-white border border-[#d9e8f5] text-[#2c5282]">
                          Rekening #{index + 1} {isJaka ? '• Mempelai Pria (Jaka)' : '• Mempelai Wanita (Dian)'}
                        </span>

                        {(formData.bankAccounts ? formData.bankAccounts.length : 1) > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const current = formData.bankAccounts || [{ ...formData.bank }];
                              const updated = current.filter((_, i) => i !== index);
                              setFormData({
                                ...formData,
                                bank: updated[0] || formData.bank,
                                bankAccounts: updated
                              });
                            }}
                            className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-semibold p-1 hover:bg-red-50 rounded cursor-pointer"
                            title="Hapus Rekening Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-[#527595] mb-1">
                            Nama Bank:
                          </label>
                          <input
                            type="text"
                            value={account.bankName}
                            onChange={(e) => {
                              const current = formData.bankAccounts && formData.bankAccounts.length > 0
                                ? [...formData.bankAccounts]
                                : [{ ...formData.bank }];
                              current[index] = { ...current[index], bankName: e.target.value };
                              setFormData({
                                ...formData,
                                bank: index === 0 ? current[0] : formData.bank,
                                bankAccounts: current
                              });
                            }}
                            placeholder="BANK BSI SYARIAH"
                            className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#527595] mb-1">
                            Nomor Rekening:
                          </label>
                          <input
                            type="text"
                            value={account.accountNumber}
                            onChange={(e) => {
                              const current = formData.bankAccounts && formData.bankAccounts.length > 0
                                ? [...formData.bankAccounts]
                                : [{ ...formData.bank }];
                              current[index] = { ...current[index], accountNumber: e.target.value };
                              setFormData({
                                ...formData,
                                bank: index === 0 ? current[0] : formData.bank,
                                bankAccounts: current
                              });
                            }}
                            placeholder="Contoh: 7238491028"
                            className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#527595] mb-1">
                            Atas Nama Rekening:
                          </label>
                          <input
                            type="text"
                            value={account.accountHolder}
                            onChange={(e) => {
                              const current = formData.bankAccounts && formData.bankAccounts.length > 0
                                ? [...formData.bankAccounts]
                                : [{ ...formData.bank }];
                              current[index] = { ...current[index], accountHolder: e.target.value };
                              setFormData({
                                ...formData,
                                bank: index === 0 ? current[0] : formData.bank,
                                bankAccounts: current
                              });
                            }}
                            placeholder="JAKA"
                            className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Kirim Kado Fisik */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#e5ebf0]">
              <h2 className="text-lg sm:text-xl font-bold text-[#5797d0] mb-4 flex items-center gap-2">
                <span>🎁 Alamat Pengiriman Kado Fisik</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#527595] mb-1">
                    Nama Penerima:
                  </label>
                  <input
                    type="text"
                    value={formData.giftAddress.recipient}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        giftAddress: { ...formData.giftAddress, recipient: e.target.value }
                      })
                    }
                    placeholder="Dian"
                    className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#527595] mb-1">
                    Alamat Lengkap Pengiriman:
                  </label>
                  <textarea
                    rows={3}
                    value={formData.giftAddress.fullAddress}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        giftAddress: { ...formData.giftAddress, fullAddress: e.target.value }
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white resize-none"
                    placeholder="Jl. Pashanda Bhakti RT 005 RW 002, Dusun Pangkalan Betung, Desa Pipitteja..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: MANAJEMEN TAMU & WHATSAPP */}
        {activeTab === 'tamu' && (
          <div className="space-y-5">
            {/* FORM TAMBAH TAMU */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#e5ebf0]">
              <h2 className="text-lg sm:text-xl font-bold text-[#5797d0] mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#5797d0]" />
                <span>Tambah Tamu Undangan Baru</span>
              </h2>

              <form onSubmit={handleAddGuest} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-[#527595] mb-1">
                    Nama Tamu: *
                  </label>
                  <input
                    type="text"
                    required
                    value={newGuestName}
                    onChange={(e) => setNewGuestName(e.target.value)}
                    placeholder="Contoh: Bapak Hendra"
                    className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#527595] mb-1">
                    Kategori:
                  </label>
                  <select
                    value={newGuestCategory}
                    onChange={(e) => setNewGuestCategory(e.target.value as GuestItem['category'])}
                    className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white"
                  >
                    <option value="Umum">Umum</option>
                    <option value="Keluarga">Keluarga</option>
                    <option value="Teman">Teman</option>
                    <option value="VIP">VIP</option>
                    <option value="Kantor">Kantor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#527595] mb-1">
                    No. WhatsApp (opsional):
                  </label>
                  <input
                    type="text"
                    value={newGuestPhone}
                    onChange={(e) => setNewGuestPhone(e.target.value)}
                    placeholder="08123456789"
                    className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white"
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    className="w-full py-2 px-4 rounded-lg bg-[#ec79b8] hover:bg-[#d866a4] text-white font-bold text-sm shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Tamu</span>
                  </button>
                </div>
              </form>
            </div>

            {/* PRATINJAU TAMPILAN PESAN WHATSAPP (SESUAI REFERENSI FOTO MEMPELAI) */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#e5ebf0]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#5797d0] flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-[#25D366]" />
                    <span>📱 Pratinjau Tampilan Pesan WhatsApp (Sesuai Referensi)</span>
                  </h2>
                  <p className="text-xs text-[#718096] mt-0.5">
                    Tampilan nyata saat undangan dikirimkan ke WhatsApp tamu. Menampilkan gambar foto mempelai pria & wanita di bagian atas pesan.
                  </p>
                </div>

                {/* Pilih Tamu */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#527595] shrink-0">Pilih Tamu:</span>
                  <select
                    value={selectedPreviewGuestId || (guestList[0]?.id || '')}
                    onChange={(e) => setSelectedPreviewGuestId(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-[#d9e0e5] text-xs font-medium bg-white focus:border-[#5797d0] outline-none cursor-pointer"
                  >
                    {guestList.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Simulation Box */}
              {(() => {
                const activePreviewGuest = guestList.find(g => g.id === selectedPreviewGuestId) || guestList[0] || { id: 'sample', name: 'Bapak Hendra', category: 'Umum' };
                const guestLink = getGuestUrl(activePreviewGuest.name);
                const hostName = typeof window !== 'undefined' ? window.location.host : 'undangan-nikah.com';

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* WhatsApp Chat Simulation (Left / 7 cols) */}
                    <div className="lg:col-span-7 bg-[#0b141a] rounded-2xl p-4 sm:p-6 shadow-inner border border-[#222e35] relative overflow-hidden">
                      {/* WhatsApp Header bar */}
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#222e35] text-xs text-[#8696a0]">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#25D366]"></div>
                          <span className="font-medium text-[#e9edef]">WhatsApp Chat • {activePreviewGuest.name}</span>
                        </div>
                        <span className="text-[11px] text-[#25D366] font-medium">Online</span>
                      </div>

                      {/* Bubble Container */}
                      <div className="max-w-[460px] bg-[#202c33] text-[#e9edef] rounded-2xl p-3 sm:p-4 shadow-md relative text-xs leading-relaxed border border-[#2a3942]">
                        {/* Diteruskan label */}
                        <div className="flex items-center gap-1.5 text-[#8696a0] text-[11px] italic mb-2.5">
                          <Share2 className="w-3 h-3 rotate-180 text-[#8696a0]" />
                          <span>Diteruskan</span>
                        </div>

                        {/* Rich Link Card (At the top of message as in reference) */}
                        <div className="bg-[#111b21] rounded-xl p-2.5 mb-3.5 border border-[#2a3942] flex items-center gap-3">
                          {/* Photo of Groom & Bride */}
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden shrink-0 bg-[#202c33] border border-[#2a3942] relative">
                            <img
                              src={normalizeImageUrl(formData.couplePhoto || '/couple-photo.jpg')}
                              alt="Foto Mempelai Pria & Wanita"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-[#e9edef] truncate">
                              {formData.groom.name} & {formData.bride.name}
                            </h4>
                            <p className="text-[11px] text-[#8696a0] truncate flex items-center gap-1 mt-0.5">
                              <ExternalLink className="w-3 h-3 text-[#53bdeb]" />
                              <span className="text-[#53bdeb]">{hostName}</span>
                            </p>
                            <p className="text-[10px] text-[#8696a0] line-clamp-2 mt-1 leading-snug">
                              Undangan Pernikahan {formData.groom.name} & {formData.bride.name}. Tanpa mengurangi rasa hormat, kami mengundang Bapak/Ibu/Saudara/i...
                            </p>
                          </div>
                        </div>

                        {/* Message Body */}
                        <div className="space-y-2 text-[#d1d7db] text-[12px] whitespace-pre-line font-sans">
                          <p>Kepada Yth.<br />Bapak/Ibu/Saudara/i<br /><strong className="text-white font-bold">{activePreviewGuest.name}</strong></p>
                          <div className="w-full border-t border-[#3b4a54] my-1.5"></div>
                          <p className="font-semibold text-white">Assalamualaikum Warahmatullahi Wabarakatuh</p>
                          <p>Tanpa mengurangi rasa hormat, perkenankan kami mengundang Bapak/Ibu/Saudara/i, teman sekaligus sahabat, untuk menghadiri acara pernikahan kami.</p>
                          <p>Resepsi : <strong className="text-white">{formData.resepsi.dateStr || 'Minggu, 27 Desember 2026'}</strong></p>
                          <p>
                            Berikut tautan link undangan kami, untuk info lengkap jadwal dan lokasi acara, silakan kunjungi:<br />
                            <span className="text-[#53bdeb] underline break-all">{guestLink}</span>
                          </p>
                          <p>Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan untuk hadir dan memberikan doa restu.</p>
                          <p className="font-semibold text-white">Wassalamualaikum Warahmatullahi Wabarakatuh</p>
                          <p>Terima Kasih</p>
                          <p>Hormat kami,<br /><strong className="text-white">{formData.groom.name} & {formData.bride.name}</strong></p>
                        </div>

                        {/* Timestamp */}
                        <div className="text-right text-[10px] text-[#8696a0] mt-2.5 flex items-center justify-end gap-1">
                          <span>10:45</span>
                          <span className="text-[#53bdeb] font-bold">✓✓</span>
                        </div>
                      </div>
                    </div>

                    {/* Explanations & Quick Actions (Right / 5 cols) */}
                    <div className="lg:col-span-5 space-y-4">
                      {/* Action buttons */}
                      <div className="p-4 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] space-y-3">
                        <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          Foto Mempelai Terpasang di WhatsApp Preview
                        </span>
                        <p className="text-xs text-emerald-900/80 leading-relaxed">
                          Foto pria dan wanita di thumbnail ini otomatis terpasang melalui server via meta tag Open Graph (<code>og:image</code>).
                        </p>

                        <div className="flex flex-col gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => openWhatsApp(activePreviewGuest)}
                            className="w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                          >
                            <MessageCircle className="w-4 h-4 fill-current" />
                            <span>Kirim Langsung ke WhatsApp</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => copyToClipboard(getWhatsAppMessage(activePreviewGuest), `preview-${activePreviewGuest.id}`)}
                            className="w-full py-2 px-4 rounded-xl bg-white border border-[#cbd5e0] hover:bg-gray-50 text-gray-700 font-bold text-xs shadow-2xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                          >
                            {copiedIndex === `preview-${activePreviewGuest.id}` ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-green-600" />
                                <span className="text-green-600">Pesan Tersalin ke Clipboard!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Salin Teks Lengkap Pesan</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Panduan Tips WhatsApp */}
                      <div className="p-4 rounded-xl bg-[#f8fbfe] border border-[#d9e8f5] space-y-2.5 text-xs text-[#2c5282]">
                        <h4 className="font-bold text-sm text-[#5797d0] flex items-center gap-1.5">
                          <span>💡 Tips Mengirim Undangan WhatsApp:</span>
                        </h4>
                        <ul className="space-y-1.5 list-disc list-inside text-[11px] text-[#527595] leading-relaxed">
                          <li>
                            Saat aplikasi WhatsApp terbuka, <strong>tunggu 1–2 detik</strong> hingga kartu thumbnail foto & judul muncul di atas teks sebelum menekan tombol Kirim.
                          </li>
                          <li>
                            Foto berdua pria dan wanita dapat diganti kapan saja di menu <strong>"Pengantin & Acara"</strong>.
                          </li>
                          <li>
                            Tamu yang membuka tautan akan langsung disambut dengan nama mereka di amplop pembuka.
                          </li>
                        </ul>
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setActiveTab('pengantin')}
                            className="text-xs font-bold text-[#ec79b8] hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Ganti Foto Berdua di Tab Pengantin</span>
                            <span>→</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* DAFTAR TABEL TAMU */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#e5ebf0]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#5797d0] flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#5797d0]" />
                    <span>Daftar Tamu & Tautan Undangan ({filteredGuests.length})</span>
                  </h2>
                  <p className="text-xs text-[#718096] mt-0.5">
                    Klik salin link atau tombol WhatsApp untuk mengirim undangan langsung kepada tamu.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-[#a0aec0] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={guestSearch}
                    onChange={(e) => setGuestSearch(e.target.value)}
                    placeholder="Cari nama atau kategori..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[#d9e0e5] text-xs bg-white focus:border-[#5797d0] outline-none"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="w-full overflow-x-auto rounded-xl border border-[#edf2f7]">
                <table className="w-full text-left text-sm border-collapse min-w-[650px]">
                  <thead>
                    <tr className="bg-[#f7fafc] border-b border-[#edf2f7] text-[#527595] text-xs uppercase tracking-wider font-semibold">
                      <th className="py-3 px-3 w-12 text-center">No</th>
                      <th className="py-3 px-3">Nama Tamu</th>
                      <th className="py-3 px-3 w-28">Kategori</th>
                      <th className="py-3 px-3">Tautan Undangan & Aksi WhatsApp</th>
                      <th className="py-3 px-3 w-20 text-center">Hapus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf2f7]">
                    {filteredGuests.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[#a0aec0] text-sm">
                          Belum ada tamu ditemukan. Tambahkan tamu baru di atas.
                        </td>
                      </tr>
                    ) : (
                      filteredGuests.map((guest, idx) => {
                        const guestUrl = getGuestUrl(guest.name);
                        const isCopied = copiedIndex === guest.id;

                        return (
                          <tr key={guest.id} className="hover:bg-[#fcfdfe] transition-colors">
                            <td className="py-3 px-3 text-center text-xs text-[#a0aec0] font-mono">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-bold text-[#2d3748] block">
                                {guest.name}
                              </span>
                              {guest.phone && (
                                <span className="text-xs text-[#718096] block">
                                  WA: {guest.phone}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`text-xs px-2.5 py-1 rounded-full font-semibold inline-block ${
                                  guest.category === 'VIP'
                                    ? 'bg-amber-100 text-amber-800'
                                    : guest.category === 'Keluarga'
                                    ? 'bg-purple-100 text-purple-800'
                                    : guest.category === 'Teman'
                                    ? 'bg-blue-100 text-blue-800'
                                    : guest.category === 'Kantor'
                                    ? 'bg-teal-100 text-teal-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {guest.category}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="text-xs font-mono text-[#527595] truncate max-w-[280px] bg-[#f7fafc] px-2 py-1 rounded border border-[#edf2f7] mb-2 select-all">
                                {guestUrl}
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(guestUrl, guest.id)}
                                  className="px-2.5 py-1 rounded-md bg-[#e9eef2] hover:bg-[#dce4e9] text-[#527595] text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                                  title="Salin tautan ke clipboard"
                                >
                                  {isCopied ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-green-600" />
                                      <span className="text-green-600">Tersalin!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Salin Link</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(getWhatsAppMessage(guest), `msg-${guest.id}`)}
                                  className="px-2.5 py-1 rounded-md bg-[#e9eef2] hover:bg-[#dce4e9] text-[#527595] text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                                  title="Salin template pesan undangan"
                                >
                                  {copiedIndex === `msg-${guest.id}` ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-green-600" />
                                      <span className="text-green-600">Pesan Tersalin!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Share2 className="w-3.5 h-3.5" />
                                      <span>Salin Pesan</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openWhatsApp(guest)}
                                  className="px-2.5 py-1 rounded-md bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                                  title="Buka WhatsApp & Kirim Pesan Undangan"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 fill-current" />
                                  <span>WhatsApp</span>
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteGuest(guest.id, guest.name)}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-all cursor-pointer"
                                title="Hapus Tamu"
                              >
                                <Trash2 className="w-4 h-4" />
                                <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => {
          const newMsg = prompt(`Edit ucapan dari "${wish.name}":`, wish.message);
          if (newMsg !== null && newMsg.trim() !== '') {
            const updated = wishesList.map((w) => w.id === wish.id ? { ...w, message: newMsg.trim() } : w);
            setWishesList(updated);
            try {
              localStorage.setItem('wedding_wishes_jaka_dian', JSON.stringify(updated));
            } catch {}
          }
        }}
        title="Edit teks ucapan ini"
        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
      >
        ✏️
      </button>

      <button
        type="button"
        onClick={() => handleDeleteWish(wish.id, wish.name)}
        title="Hapus ucapan ini"
        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

       {/* TAB 6: UCAPAN & RSVP */}
        {activeTab === 'ucapan' && (
          <div className="space-y-5">
            {/* Header & Metrics */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#e5ebf0]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-[#edf2f7] pb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#5797d0] flex items-center gap-2">
                    <MessageSquareHeart className="w-5 h-5 text-[#ef72b4]" />
                    <span>💌 Data Ucapan & Konfirmasi Kehadiran (RSVP)</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-[#718096] mt-0.5">
                    Daftar ucapan, doa restu, dan status kehadiran dari tamu undangan secara real-time.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchAdminWishes}
                  disabled={isLoadingWishes}
                  className="px-3.5 py-2 rounded-xl bg-[#5797d0]/10 hover:bg-[#5797d0]/20 text-[#5797d0] font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingWishes ? 'animate-spin' : ''}`} />
                  <span>Segarkan Data</span>
                </button>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <div className="bg-[#f8fafc] border border-[#e2e8f0] p-3.5 rounded-xl text-center">
                  <div className="text-2xl font-extrabold text-[#2d3748]">{wishesList.length}</div>
                  <div className="text-xs font-semibold text-[#718096] mt-0.5">Total Ucapan</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-center">
                  <div className="text-2xl font-extrabold text-emerald-700">
                    {wishesList.filter((w) => w.attendance === 'hadir').length}
                  </div>
                  <div className="text-xs font-semibold text-emerald-600 mt-0.5">Akan Hadir</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-center">
                  <div className="text-2xl font-extrabold text-amber-700">
                    {wishesList.filter((w) => w.attendance === 'ragu').length}
                  </div>
                  <div className="text-xs font-semibold text-amber-600 mt-0.5">Masih Ragu</div>
                </div>
                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-center">
                  <div className="text-2xl font-extrabold text-rose-700">
                    {wishesList.filter((w) => w.attendance === 'tidak').length}
                  </div>
                  <div className="text-xs font-semibold text-rose-600 mt-0.5">Tidak Hadir</div>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={wishesSearch}
                    onChange={(e) => setWishesSearch(e.target.value)}
                    placeholder="Cari berdasarkan nama tamu atau isi ucapan..."
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#cbd5e0] focus:border-[#5797d0] focus:ring-2 focus:ring-[#5797d0]/20 text-xs outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['semua', 'hadir', 'ragu', 'tidak'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setWishesFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer capitalize ${
                        wishesFilter === cat
                          ? 'bg-[#5797d0] text-white shadow-2xs'
                          : 'bg-gray-100 text-[#527595] hover:bg-gray-200'
                      }`}
                    >
                      {cat === 'semua' ? 'Semua' : cat === 'hadir' ? 'Hadir' : cat === 'ragu' ? 'Ragu' : 'Tidak Hadir'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* List of Wishes */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#e5ebf0]">
              <div className="space-y-3">
                {(() => {
                  const filtered = wishesList.filter((w) => {
                    const matchFilter =
                      wishesFilter === 'semua' ? true : w.attendance === wishesFilter;
                    const matchSearch =
                      wishesSearch.trim() === ''
                        ? true
                        : w.name.toLowerCase().includes(wishesSearch.toLowerCase()) ||
                          w.message.toLowerCase().includes(wishesSearch.toLowerCase());
                    return matchFilter && matchSearch;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-10 text-[#718096] text-sm">
                        Tidak ada ucapan yang sesuai dengan filter atau pencarian saat ini.
                      </div>
                    );
                  }

                  return filtered.map((wish) => (
                    <div
                      key={wish.id}
                      className="p-4 rounded-xl border border-[#e2e8f0] hover:border-[#5797d0]/30 transition-all bg-[#fafcfd]"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-[#2d3748]">{wish.name}</span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                wish.attendance === 'hadir'
                                  ? 'bg-green-100 text-green-700'
                                  : wish.attendance === 'ragu'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {wish.attendance === 'hadir'
                                ? '✓ Hadir'
                                : wish.attendance === 'ragu'
                                ? '? Ragu-ragu'
                                : '✗ Tidak Hadir'}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#a0aec0] block mt-0.5">
                            {wish.timestamp}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteWish(wish.id, wish.name)}
                          title="Hapus ucapan ini"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-xs sm:text-sm text-[#4a5568] leading-relaxed whitespace-pre-line bg-white p-3 rounded-lg border border-[#edf2f7]">
                        {wish.message}
                      </p>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: BUKU TAMU & GOOGLE SHEETS */}
        {activeTab === 'google_script' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-[#0f7b40] to-[#13944d] text-white p-5 rounded-2xl shadow-md">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span>📗 Integrasi Buku Tamu & Google Sheets</span>
              </h2>
              <p className="text-xs text-emerald-100 mt-1">
                Sinkronisasi ucapan, konfirmasi kehadiran (RSVP), dan buku tamu langsung ke Google Spreadsheet.
              </p>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 space-y-4">
              <label className="block text-sm font-bold text-gray-700">
                URL Aplikasi Web Google Apps Script (berakhiran /exec):
              </label>
              <input
                type="text"
                value={formData.googleScriptUrl || ''}
                onChange={(e) => setFormData({ ...formData, googleScriptUrl: e.target.value })}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-emerald-600 outline-none font-mono"
              />
              <p className="text-xs text-gray-500">
                Tempelkan URL Google Apps Script yang sudah Anda deploy ke kolom di atas, lalu klik <b>Simpan Data</b> di pojok kanan atas layar.
              </p>
            </div>
          </div>
        )}

        {/* Global Save & Backup Footer Actions */}
        <div className="mt-8 pt-5 border-t border-[#d9e0e5] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={`px-5 py-2.5 rounded-xl text-white font-bold text-sm shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-2 ${
                justSaved 
                  ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300' 
                  : 'bg-[#5797d0] hover:bg-[#4383bd]'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan ke Server...</span>
                </>
              ) : justSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>SEMUA PERUBAHAN TERSIMPAN!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>SIMPAN SEMUA PERUBAHAN</span>
                </>
              )}
            </button>

            {lastSavedTime && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Terakhir disimpan: {lastSavedTime}</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset data kembali ke konfigurasi awal bawaan?')) {
                  onResetDefault();
                  alert('Data telah dikembalikan ke pengaturan awal.');
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-[#e9eef2] hover:bg-[#dce4ea] text-[#527595] font-semibold text-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Default</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportJson}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#d9e0e5] hover:bg-[#f8fafc] text-[#527595] text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Cadangkan data ke file JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor JSON</span>
            </button>

            <label
              className="px-3.5 py-2 rounded-xl bg-white border border-[#d9e0e5] hover:bg-[#f8fafc] text-[#527595] text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Pulihkan data dari file JSON"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Impor JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#d9e2ea] animate-scale-up">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#edf2f7]">
              <div className="flex items-center gap-2 text-[#2c3e50]">
                <div className="p-2 rounded-xl bg-[#5797d0]/10 text-[#5797d0]">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Ubah Kata Sandi Admin</h3>
                  <p className="text-xs text-[#718096]">Amankan panel admin undangan pernikahan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {passwordModalError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                {passwordModalError}
              </div>
            )}

            {passwordModalSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
                {passwordModalSuccess}
              </div>
            )}

            <form onSubmit={handleSaveNewPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#4a5568] uppercase tracking-wider mb-1">
                  Kata Sandi Saat Ini
                </label>
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  value={oldPasswordInput}
                  onChange={(e) => setOldPasswordInput(e.target.value)}
                  placeholder="Masukkan kata sandi lama..."
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-[#cbd5e0] focus:border-[#5797d0] focus:ring-2 focus:ring-[#5797d0]/20 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4a5568] uppercase tracking-wider mb-1">
                  Kata Sandi Baru
                </label>
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Minimal 4 karakter..."
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-[#cbd5e0] focus:border-[#5797d0] focus:ring-2 focus:ring-[#5797d0]/20 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4a5568] uppercase tracking-wider mb-1">
                  Konfirmasi Kata Sandi Baru
                </label>
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="Ulangi kata sandi baru..."
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-[#cbd5e0] focus:border-[#5797d0] focus:ring-2 focus:ring-[#5797d0]/20 text-sm outline-none"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-[#718096] pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showPasswordText}
                    onChange={(e) => setShowPasswordText(e.target.checked)}
                    className="rounded text-[#5797d0]"
                  />
                  <span>Tampilkan teks sandi</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#edf2f7]">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#5797d0] hover:bg-[#4784ba] text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                >
                  Simpan Sandi Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Advanced Photo Editor Modal */}
      <PhotoEditorModal
        isOpen={photoEditorConfig.isOpen}
        role={photoEditorConfig.role}
        currentPhotoUrl={photoEditorConfig.currentUrl}
        personName={photoEditorConfig.personName}
        onClose={() => setPhotoEditorConfig((prev) => ({ ...prev, isOpen: false }))}
        onSavePhoto={handleSavePhotoFromEditor}
      />
    </div>
  );
};
