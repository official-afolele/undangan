import React, { useState, useEffect } from 'react';
import { WeddingConfig, GuestItem, WishEntry, GalleryPhoto } from '../types';
import { weddingData } from '../data/weddingData';
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
  Sliders,
  Edit3,
  FileSpreadsheet,
  FileCode,
  CheckCheck,
  Globe,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon
} from 'lucide-react';
import { normalizeImageUrl } from '../utils/imageUrl';
import { validateAdminPassword } from '../utils/auth';
import { PhotoEditorModal, PhotoRole } from './PhotoEditorModal';
import { CoverSection } from './CoverSection';
import { Page2TitleQuote } from './Page2TitleQuote';
import { BrideGroomSection } from './BrideGroomSection';
import { SaveTheDateSection } from './SaveTheDateSection';
import { EventDetailsSection } from './EventDetailsSection';
import { OurGallerySection } from './OurGallerySection';
import { LoveStorySection } from './LoveStorySection';
import { WeddingGiftSection } from './WeddingGiftSection';

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

type AdminTab = 'pengantin' | 'acara' | 'galeri' | 'musik_cerita' | 'kado' | 'tamu' | 'ucapan' | 'google_script';

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
  const [formData, setFormData] = useState<WeddingConfig>(() => {
    const cloned: WeddingConfig = JSON.parse(JSON.stringify(config));
    if (!cloned.gallery || !Array.isArray(cloned.gallery) || cloned.gallery.length === 0) {
      cloned.gallery = (weddingData.gallery && weddingData.gallery.length > 0)
        ? JSON.parse(JSON.stringify(weddingData.gallery))
        : [];
    }
    return cloned;
  });
  const [guestList, setGuestList] = useState<GuestItem[]>(JSON.parse(JSON.stringify(guests)));
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<{ title: string; detail: string; time: string } | null>(null);

  // Our Gallery state for Admin
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [newGalleryCaption, setNewGalleryCaption] = useState('');
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);

  // Helper to upload an image file via server API with multi-stage fallback
  const processAndUploadImage = async (file: File): Promise<string> => {
    let finalUrl = '';
    // 1. Multipart upload to /api/upload-file
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('photo', file);
      const res = await fetch('/api/upload-file', {
        method: 'POST',
        body: uploadFormData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.url) finalUrl = data.url;
      }
    } catch {
      // fallback
    }

    // 2. Base64 POST to /api/upload
    if (!finalUrl) {
      try {
        const compressed = await compressImageFile(file, 1200, 0.85);
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl: compressed }),
        });
        if (res.ok) {
          const data = await res.json();
          finalUrl = data.url || compressed;
        } else {
          finalUrl = compressed;
        }
      } catch {
        // fallback
      }
    }

    // 3. Fallback client compressed base64 if server offline
    if (!finalUrl) {
      finalUrl = await compressImageFile(file, 1000, 0.80);
    }

    return finalUrl;
  };

  const handleUploadGalleryPhotos = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsUploadingGallery(true);
    const addedPhotos: GalleryPhoto[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 30 * 1024 * 1024) {
          alert(`File ${file.name} melebihi batas 30MB.`);
          continue;
        }
        const finalUrl = await processAndUploadImage(file);
        if (finalUrl) {
          addedPhotos.push({
            id: `gal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}_${i}`,
            url: finalUrl,
            caption: newGalleryCaption.trim() || undefined,
          });
        }
      }

      if (addedPhotos.length > 0) {
        const currentList = (formData.gallery && Array.isArray(formData.gallery))
          ? [...formData.gallery]
          : [];
        const updatedList = [...currentList, ...addedPhotos];
        const nextFormData = {
          ...formData,
          gallery: updatedList,
        };
        setFormData(nextFormData);
        setNewGalleryUrl('');
        setNewGalleryCaption('');

        // Langsung simpan otomatis ke server & localStorage
        await onSaveConfig(nextFormData);
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 3000);

        setSaveToast({
          title: `Berhasil Mengunggah ${addedPhotos.length} Foto Galeri! 📸`,
          detail: 'Foto prewedding telah otomatis ditambahkan dan tersimpan ke server.',
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
        });
      }
    } catch (err) {
      console.error('Upload gallery error:', err);
      alert('Gagal memproses foto galeri. Silakan coba lagi.');
    } finally {
      setIsUploadingGallery(false);
    }
  };

  const handleReplaceGalleryPhoto = async (index: number, file: File) => {
    if (!file || !formData.gallery || !formData.gallery[index]) return;
    setIsUploadingGallery(true);
    try {
      const finalUrl = await processAndUploadImage(file);
      if (finalUrl) {
        const list = [...formData.gallery];
        list[index] = { ...list[index], url: finalUrl };
        const nextFormData = {
          ...formData,
          gallery: list,
        };
        setFormData(nextFormData);
        await onSaveConfig(nextFormData);
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 3000);
        setSaveToast({
          title: 'Foto Berhasil Diganti! 📸',
          detail: `Foto #${index + 1} telah diganti dan otomatis disimpan ke server.`,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
        });
      }
    } catch (err) {
      console.error('Replace gallery photo error:', err);
      alert('Gagal mengganti foto galeri.');
    } finally {
      setIsUploadingGallery(false);
    }
  };

  const handleAddGalleryPhoto = async () => {
    if (!newGalleryUrl.trim()) {
      alert('Silakan pilih foto atau masukkan link URL foto terlebih dahulu.');
      return;
    }
    const currentGallery = (formData.gallery && Array.isArray(formData.gallery))
      ? [...formData.gallery]
      : [];
    const newPhoto: GalleryPhoto = {
      id: `gal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      url: newGalleryUrl.trim(),
      caption: newGalleryCaption.trim() || undefined,
    };
    const updatedGallery = [...currentGallery, newPhoto];
    const nextFormData = {
      ...formData,
      gallery: updatedGallery,
    };
    setFormData(nextFormData);
    setNewGalleryUrl('');
    setNewGalleryCaption('');

    await onSaveConfig(nextFormData);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 3000);
    setSaveToast({
      title: 'Foto Ditambahkan ke Galeri! 🎉',
      detail: 'Foto baru berhasil disimpan dan siap tampil di Our Gallery.',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
    });
  };

  const handleResetDefaultGallery = async () => {
    if (!confirm('Kembalikan galeri ke 4 foto prewedding bawaan Dian & Jaka?')) return;
    const defaultList = weddingData.gallery && weddingData.gallery.length > 0
      ? JSON.parse(JSON.stringify(weddingData.gallery))
      : [];
    const nextFormData = {
      ...formData,
      gallery: defaultList,
    };
    setFormData(nextFormData);
    await onSaveConfig(nextFormData);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 3000);
    setSaveToast({
      title: 'Galeri Direset ke Bawaan! 📸',
      detail: 'Foto prewedding bawaan Dian & Jaka telah dipulihkan.',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
    });
  };

  const handleRemoveGalleryPhoto = (index: number) => {
    if (!formData.gallery) return;
    if (!confirm('Hapus foto ini dari galeri?')) return;
    const updated = formData.gallery.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      gallery: updated,
    });
  };

  const handleMoveGalleryPhoto = (index: number, direction: 'up' | 'down') => {
    if (!formData.gallery) return;
    const list = [...formData.gallery];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    setFormData({
      ...formData,
      gallery: list,
    });
  };

  const handleUpdateGalleryCaption = (index: number, caption: string) => {
    if (!formData.gallery) return;
    const list = [...formData.gallery];
    list[index] = { ...list[index], caption };
    setFormData({
      ...formData,
      gallery: list,
    });
  };

  // Wishes state for Admin
  const [wishesList, setWishesList] = useState<WishEntry[]>([]);
  const [isLoadingWishes, setIsLoadingWishes] = useState(false);
  const [wishesFilter, setWishesFilter] = useState<'semua' | 'hadir' | 'ragu' | 'tidak'>('semua');
  const [wishesSearch, setWishesSearch] = useState('');

  const WISHES_STORAGE_KEY = 'wedding_wishes_jaka_dian';

  const fetchAdminWishes = async () => {
    setIsLoadingWishes(true);

    const targetScriptUrl = (formData.googleScriptUrl && formData.googleScriptUrl.startsWith('http'))
      ? formData.googleScriptUrl
      : 'https://script.google.com/macros/s/AKfycby6h1lOSpTyczUj5Bsyu3n0W3AnlZuME1Cn4V2WFfpNQeGj6v_3poNiZScPbButlpVf/exec';

    if (targetScriptUrl) {
      try {
        const scriptRes = await fetch(`${targetScriptUrl}?action=get_wishes`);
        if (scriptRes.ok) {
          const data = await scriptRes.json();
          if (data && Array.isArray(data.wishes)) {
            setWishesList(data.wishes);
            try {
              localStorage.setItem(WISHES_STORAGE_KEY, JSON.stringify(data.wishes));
            } catch {}
            setIsLoadingWishes(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Gagal memuat ucapan dari Google Script di Admin:', err);
      }
    }

    try {
      const res = await fetch('/api/wishes');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setWishesList(data);
          try {
            localStorage.setItem(WISHES_STORAGE_KEY, JSON.stringify(data));
          } catch {}
          return;
        }
      }
    } catch (err) {
      console.warn('Gagal memuat ucapan di Admin Panel dari server:', err);
    } finally {
      setIsLoadingWishes(false);
    }

    // Fallback: load from localStorage
    try {
      const saved = localStorage.getItem(WISHES_STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setWishesList(parsed);
          return;
        }
      }
    } catch {}
    setWishesList([]);
  };

  useEffect(() => {
    fetchAdminWishes();
  }, []);

  const handleDeleteWish = async (id: string, name: string) => {
    if (!window.confirm(`Hapus ucapan dan konfirmasi dari "${name}"?`)) return;

    // Immediately update state and localStorage
    const updated = wishesList.filter((w) => w.id !== id);
    setWishesList(updated);
    try {
      localStorage.setItem(WISHES_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
    } catch {}

    try {
      const res = await fetch(`/api/wishes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.wishes)) {
          setWishesList(data.wishes);
          try {
            localStorage.setItem(WISHES_STORAGE_KEY, JSON.stringify(data.wishes));
          } catch {}
        }
      }
    } catch (err) {
      console.warn('API delete wish error (tersimpan di penyimpanan lokal):', err);
    }
  };

  const handleClearAllWishes = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus SEMUA ucapan yang masuk? Tindakan ini akan mengosongkan daftar ucapan.')) return;
    setWishesList([]);
    try {
      localStorage.setItem(WISHES_STORAGE_KEY, JSON.stringify([]));
      window.dispatchEvent(new Event('storage'));
    } catch {}
    try {
      await fetch('/api/wishes/all', { method: 'DELETE' });
    } catch {}
  };

  // Editing wish state & handler
  const [editingWish, setEditingWish] = useState<WishEntry | null>(null);

  const handleSaveEditWish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWish) return;

    const updated = wishesList.map((w) => (w.id === editingWish.id ? editingWish : w));
    setWishesList(updated);
    try {
      localStorage.setItem(WISHES_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
    } catch {}

    setEditingWish(null);
    setSaveToast({
      title: 'Ucapan Berhasil Diperbarui!',
      detail: `Ucapan dari "${editingWish.name}" telah berhasil diperbarui dan disimpan.`,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
    });
  };

  // Photo upload & error states
  const [uploadingRole, setUploadingRole] = useState<'groom' | 'bride' | 'couple' | null>(null);
  const [uploadFeedback, setUploadFeedback] = useState<{ role: 'groom' | 'bride' | 'couple'; type: 'success' | 'error'; message: string } | null>(null);
  const [imageErrorRoles, setImageErrorRoles] = useState<{ groom?: boolean; bride?: boolean; couple?: boolean }>({});
  const [selectedPreviewGuestId, setSelectedPreviewGuestId] = useState<string>('');
  const [whatsAppMessageFormat, setWhatsAppMessageFormat] = useState<'standar' | 'link_atas'>('standar');

  // Auto-Save, Live Sync, and Preview states
  const isInternalUpdate = React.useRef(false);
  const isFirstMount = React.useRef(true);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isExportCodeOpen, setIsExportCodeOpen] = useState(false);
  const [copiedCodeSuccess, setCopiedCodeSuccess] = useState(false);

  // Sync state if config prop updates from outside (e.g. initial load or reset default)
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    if (config) {
      setFormData(JSON.parse(JSON.stringify(config)));
    }
  }, [config]);

  // Live Auto-Save effect: Debounced 600ms whenever user types in ANY tab
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    setAutoSaveStatus('saving');
    const timer = setTimeout(() => {
      isInternalUpdate.current = true;
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

      const storiesToSave = Array.isArray(formData.stories) && formData.stories.length > 0
        ? formData.stories
        : (config.stories || weddingData.stories);

      const updatedConfig: WeddingConfig = {
        ...formData,
        stories: storiesToSave,
        groom: updatedGroom,
        bride: updatedBride
      };

      onSaveConfig(updatedConfig);
      setAutoSaveStatus('saved');
      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
      setLastSavedTime(timeStr);
      setTimeout(() => setAutoSaveStatus('idle'), 2500);
    }, 600);

    return () => clearTimeout(timer);
  }, [formData]);

  const getGeneratedWeddingDataCode = () => {
    return `import { WeddingConfig } from '../types';

export const weddingData: WeddingConfig = ${JSON.stringify(formData, null, 2)};
`;
  };

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

  // Google Apps Script state
  const [isTestingScript, setIsTestingScript] = useState(false);
  const [isSyncingScript, setIsSyncingScript] = useState(false);
  const [scriptTestResult, setScriptTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [scriptSyncResult, setScriptSyncResult] = useState<{ success: boolean; message: string; wishesSynced?: number; guestsSynced?: number } | null>(null);
  const [scriptCode, setScriptCode] = useState<string>('');
  const [hasCopiedScript, setHasCopiedScript] = useState(false);
  const [isDomainGuideOpen, setIsDomainGuideOpen] = useState(false);

  // Fetch script code on mount or when Google Script tab opened
  useEffect(() => {
    if (activeTab === 'google_script' && !scriptCode) {
      fetch('/api/google-script/code')
        .then((res) => res.json())
        .then((data) => {
          if (data.code) setScriptCode(data.code);
        })
        .catch(() => {});
    }
  }, [activeTab, scriptCode]);

  const handleTestScriptConnection = async () => {
    const url = formData.googleScriptUrl?.trim();
    if (!url) {
      setScriptTestResult({
        success: false,
        message: 'Silakan masukkan URL Aplikasi Web Google Apps Script terlebih dahulu.'
      });
      return;
    }

    setIsTestingScript(true);
    setScriptTestResult(null);

    try {
      const res = await fetch('/api/google-script/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptUrl: url })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setScriptTestResult({
          success: true,
          message: data.message || 'Koneksi berhasil! Google Apps Script & Spreadsheet terhubung.',
          details: data.details
        });
      } else {
        setScriptTestResult({
          success: false,
          message: data.error || 'Gagal menghubungi Google Apps Script. Pastikan izin akses diatur ke "Siapa saja" (Anyone).'
        });
      }
    } catch (err: any) {
      setScriptTestResult({
        success: false,
        message: `Terjadi kesalahan koneksi: ${err?.message || 'Gagal tersambung'}`
      });
    } finally {
      setIsTestingScript(false);
    }
  };

  const handleSyncToGoogleSheet = async () => {
    const url = formData.googleScriptUrl?.trim();
    if (!url) {
      setScriptSyncResult({
        success: false,
        message: 'Masukkan dan simpan URL Google Apps Script terlebih dahulu sebelum sinkronisasi.'
      });
      return;
    }

    setIsSyncingScript(true);
    setScriptSyncResult(null);

    try {
      const res = await fetch('/api/google-script/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptUrl: url })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setScriptSyncResult({
          success: true,
          message: `Berhasil menyinkronkan data ke Spreadsheet! (${data.wishesSynced || 0} Ucapan, ${data.guestsSynced || 0} Tamu)`,
          wishesSynced: data.wishesSynced,
          guestsSynced: data.guestsSynced
        });
      } else {
        setScriptSyncResult({
          success: false,
          message: data.error || 'Gagal melakukan sinkronisasi ke Google Spreadsheet.'
        });
      }
    } catch (err: any) {
      setScriptSyncResult({
        success: false,
        message: `Gagal sinkronisasi: ${err?.message || 'Jaringan bermasalah'}`
      });
    } finally {
      setIsSyncingScript(false);
    }
  };

  const handleCopyScriptCode = () => {
    if (!scriptCode) return;
    navigator.clipboard.writeText(scriptCode);
    setHasCopiedScript(true);
    setTimeout(() => setHasCopiedScript(false), 3000);
  };

  const handleDownloadScriptFile = () => {
    if (!scriptCode) return;
    const blob = new Blob([scriptCode], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Code.gs';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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

    const storiesToSave = Array.isArray(formData.stories) && formData.stories.length > 0
      ? formData.stories
      : (config.stories || weddingData.stories);

    const currentGallery = Array.isArray(formData.gallery) ? [...formData.gallery] : [];
    if (newGalleryUrl.trim()) {
      currentGallery.push({
        id: `gal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        url: newGalleryUrl.trim(),
        caption: newGalleryCaption.trim() || undefined,
      });
      setNewGalleryUrl('');
      setNewGalleryCaption('');
      setFormData((prev) => ({ ...prev, gallery: currentGallery }));
    }

    const updatedConfig: WeddingConfig = {
      ...formData,
      gallery: currentGallery,
      stories: storiesToSave,
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

  // Get base public URL (prioritizing custom domain if configured by user)
  const getBasePublicUrl = () => {
    if (typeof window === 'undefined') return '';
    const domain = formData.customDomain?.trim();
    if (domain) {
      const clean = domain.replace(/\/$/, '');
      return clean.startsWith('http') ? clean : `https://${clean}`;
    }
    return window.location.origin;
  };

  // Generate invitation link for a guest (always points to the root guest page /)
  const getGuestUrl = (name: string) => {
    const base = getBasePublicUrl();
    return `${base}/?to=${encodeURIComponent(name)}`;
  };

  const getAdminUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/admin`;
  };

  const getMainGuestUrl = () => {
    const base = getBasePublicUrl();
    return `${base}/`;
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
                {autoSaveStatus === 'saving' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full animate-pulse shadow-xs">
                    <Loader2 className="w-3 h-3 animate-spin" /> Menyimpan Otomatis...
                  </span>
                ) : autoSaveStatus === 'saved' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-500 text-white px-2 py-0.5 rounded-full shadow-xs">
                    <Check className="w-3 h-3" /> Tersimpan Otomatis!
                  </span>
                ) : lastSavedTime ? (
                  <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-600/90 text-white px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Tersimpan: {lastSavedTime}
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Lihat Pratinjau Tampilan Undangan Secara Langsung Tanpa Keluar Admin"
            >
              <Eye className="w-4 h-4 text-cyan-200" />
              <span>👁️ Pratinjau Live</span>
            </button>

            <button
              type="button"
              onClick={() => setIsExportCodeOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-medium text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Salin Data Konfigurasi untuk GitHub (weddingData.ts)"
            >
              <FileCode className="w-4 h-4 text-amber-300" />
              <span>📋 Ekspor ke GitHub</span>
            </button>

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
              onClick={() => setActiveTab('google_script')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                activeTab === 'google_script'
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                  : 'bg-emerald-500/90 hover:bg-emerald-600 text-white'
              }`}
              title="Buka Pengaturan Google Sheets & Script"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>📊 Google Sheets</span>
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

          {/* Custom Domain Settings Row */}
          <div className="mt-4 pt-4 border-t border-[#e2eaf1] bg-[#f8fbfe] -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-4 sm:p-5 rounded-b-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#5797d0]" />
                <span className="text-xs sm:text-sm font-bold text-[#2d3748]">
                  Pengaturan Custom Domain Pribadi (Opsional)
                </span>
                {formData.customDomain ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    Domain Aktif
                  </span>
                ) : (
                  <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    Belum Diisi
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsDomainGuideOpen(!isDomainGuideOpen)}
                className="text-xs text-[#5797d0] hover:text-[#3d7bb0] font-semibold underline cursor-pointer"
              >
                {isDomainGuideOpen ? 'Tutup Panduan Domain' : '📖 Cara Pasang Domain (Niagahoster, Cloudflare, dll)'}
              </button>
            </div>

            <p className="text-xs text-[#527595] mb-3 leading-relaxed">
              Punya domain sendiri seperti <code className="bg-white px-1 py-0.5 rounded font-mono font-bold text-[#2b6cb0]">jakadian.my.id</code> atau <code className="bg-white px-1 py-0.5 rounded font-mono font-bold text-[#2b6cb0]">jaka-dian.com</code>? Masukkan di sini agar semua link undangan WhatsApp tamu otomatis menggunakan nama domain Anda.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={formData.customDomain || ''}
                  onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })}
                  placeholder="Contoh: jakadian.my.id atau https://undangan.jakadian.com"
                  className="w-full pl-3.5 pr-10 py-2 rounded-xl border border-[#cbd5e0] focus:border-[#5797d0] focus:ring-2 focus:ring-[#5797d0]/20 font-mono text-xs sm:text-sm outline-none text-[#2d3748] bg-white"
                />
                {formData.customDomain && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, customDomain: '' })}
                    title="Hapus domain"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs cursor-pointer p-1"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={async () => {
                  await handleSave();
                  alert('Pengaturan custom domain berhasil disimpan!');
                }}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-[#5797d0] hover:bg-[#4582b8] text-white font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Domain</span>
              </button>
            </div>

            {/* Collapsible Domain Guide */}
            {isDomainGuideOpen && (
              <div className="mt-4 p-4 rounded-xl bg-white border border-[#cbd5e1] text-xs text-[#334155] space-y-3 animate-fade-in shadow-2xs">
                <div className="font-bold text-sm text-[#1e293b] flex items-center gap-1.5 border-b border-[#edf2f7] pb-2">
                  <Globe className="w-4 h-4 text-[#5797d0]" />
                  <span>Panduan Menghubungkan Domain Pribadi Anda</span>
                </div>

                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                    <strong className="text-emerald-900 block mb-1">
                      🌟 Cara 1: URL Redirection / Domain Forwarding (Paling Cepat &amp; Mudah ~ 1 Menit)
                    </strong>
                    <p className="text-emerald-800 leading-relaxed">
                      Di panel domain Anda (Niagahoster, Domainesia, Rumahweb, IDCloudHost, Namecheap, dll):
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-emerald-900 mt-1 pl-1">
                      <li>Buka menu <b>Domain Forwarding / URL Redirect</b>.</li>
                      <li>Masukkan URL tujuan: <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold select-all">https://ais-pre-dl3ag26jsusy2o4eewdsjr-862196243200.asia-southeast1.run.app</code></li>
                      <li>Pilih mode <b>Redirect with Masking / Stealth</b> agar alamat di browser pengunjung tetap terlihat sebagai nama domain Anda (misal: <i>jakadian.my.id</i>).</li>
                    </ol>
                  </div>

                  <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                    <strong className="text-blue-900 block mb-1">
                      🛡️ Cara 2: Melalui Cloudflare (Gratis SSL HTTPS + Anti-DDoS)
                    </strong>
                    <p className="text-blue-800 leading-relaxed">
                      Jika domain Anda menggunakan Cloudflare DNS:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-blue-900 mt-1 pl-1">
                      <li>Buka menu <b>Rules &gt; Redirect Rules</b> di Cloudflare.</li>
                      <li>Buat aturan forwarding dari <code className="bg-white px-1.5 py-0.5 rounded font-mono">jakadian.my.id/*</code> diarahkan ke <code className="bg-white px-1.5 py-0.5 rounded font-mono">https://ais-pre-dl3ag26jsusy2o4eewdsjr-862196243200.asia-southeast1.run.app/$1</code>.</li>
                      <li>Pilih status <b>301 (Permanent Redirect)</b> atau <b>302</b>.</li>
                    </ol>
                  </div>

                  <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200">
                    <strong className="text-purple-900 block mb-1">
                      🚀 Cara 3: Hosting Mandiri di Vercel / Netlify (Gratis Custom Domain + SSL)
                    </strong>
                    <p className="text-purple-800 leading-relaxed">
                      Bila Anda ingin menghubungkan CNAME langsung: Anda bisa mengunduh repository/file proyek ini (atau menghubungkan ke GitHub), import ke <b>Vercel</b> atau <b>Netlify</b> (100% gratis), lalu tambahkan domain Anda di menu <b>Project Settings &gt; Domains</b> dan arahkan DNS CNAME ke Vercel/Netlify.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Shortcut Card for Google Sheets */}
        <div className="bg-gradient-to-r from-[#f0fdf4] to-[#dcfce7] border-2 border-[#86efac] p-4 sm:p-5 rounded-2xl mb-5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#0f7b40] text-white shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-emerald-950 flex items-center gap-2">
                <span>📊 Integrasi Google Sheets & Google Apps Script</span>
                <span className="text-[10px] bg-[#0f7b40] text-white px-2 py-0.5 rounded-full font-bold">Menu Baru</span>
              </h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                Salin kode <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-[#0f7b40]">Code.gs</code> atau tempelkan Web App URL untuk sinkronisasi ucapan dan tamu.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('google_script')}
            className={`px-4 py-2 rounded-xl text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs ${
              activeTab === 'google_script'
                ? 'bg-[#15803d] ring-2 ring-emerald-300'
                : 'bg-[#0f7b40] hover:bg-[#0c6333]'
            }`}
          >
            <span>Buka Google Sheets & Script</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Notice Info */}
        <div className="bg-[#fff8df] border-l-4 border-[#efc45c] p-3.5 rounded-r-xl mb-5 text-sm text-[#745e28] leading-relaxed shadow-xs flex items-start gap-2.5">
          <Clock className="w-5 h-5 text-[#efc45c] shrink-0 mt-0.5" />
          <div>
            <strong>Informasi Jadwal Acara:</strong> Akad Nikah diset pada <b>{formData.akad.dateStr}</b> dan Resepsi pada <b>{formData.resepsi.dateStr}</b>. Data ini langsung terhubung ke kalender dan hitung mundur di halaman undangan.
          </div>
        </div>

        {/* Navigation Tabs (Flex-Wrap so all tabs are visible without scrolling) */}
        <div className="flex flex-wrap items-center gap-2 pb-3 mb-5 border-b border-[#d9e0e5]">
          <button
            type="button"
            onClick={() => setActiveTab('pengantin')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
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
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
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
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
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
            onClick={() => setActiveTab('galeri')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'galeri'
                ? 'bg-[#5797d0] text-white shadow-xs'
                : 'bg-white text-[#527595] hover:bg-[#e9eef2]'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>📷 Galeri Prewedding ({formData.gallery?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kado')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
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
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
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
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
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
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'google_script'
                ? 'bg-[#0f7b40] text-white shadow-md ring-2 ring-[#0f7b40]/30'
                : 'bg-emerald-50 text-[#0f7b40] hover:bg-emerald-100 border-2 border-emerald-300 shadow-2xs'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>📊 Google Sheets & Script</span>
            <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-md font-semibold ml-0.5">
              Baru
            </span>
            {formData.googleScriptUrl ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white ml-0.5" title="Google Script Terpasang"></span>
            ) : null}
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#ef72b4] flex items-center gap-2">
                    <span>🕌 Rincian Akad Nikah</span>
                  </h2>
                  <p className="text-xs text-[#527595] mt-0.5">
                    Atur tanggal, waktu, nama tempat, dan alamat lengkap prosesi akad nikah.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`self-start sm:self-auto px-4 py-2 rounded-xl text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2 transition-all ${
                    justSaved 
                      ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300' 
                      : 'bg-[#ef72b4] hover:bg-[#d85e9e]'
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
                      <span>Akad Tersimpan!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Rincian Akad</span>
                    </>
                  )}
                </button>
              </div>

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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#5797d0] flex items-center gap-2">
                    <span>🎉 Rincian Resepsi Pernikahan</span>
                  </h2>
                  <p className="text-xs text-[#527595] mt-0.5">
                    Atur tanggal, waktu, nama tempat, dan alamat resepsi pernikahan.
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
                      <span>Resepsi Tersimpan!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Rincian Resepsi</span>
                    </>
                  )}
                </button>
              </div>

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

            {/* Bottom Save Bar for Tab 2 */}
            <div className="bg-white p-4 rounded-xl border border-[#e5ebf0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <span className="text-xs text-[#527595]">
                Pastikan klik tombol simpan untuk memperbarui rincian Akad & Resepsi di undangan.
              </span>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className={`px-5 py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold shadow-md cursor-pointer flex items-center justify-center gap-2 transition-all ${
                  justSaved 
                    ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300' 
                    : 'bg-[#5797d0] hover:bg-[#4383bd] active:scale-95'
                }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan Rincian Acara...</span>
                  </>
                ) : justSaved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Rincian Acara Berhasil Disimpan!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Semua Rincian Acara (Akad & Resepsi)</span>
                  </>
                )}
              </button>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#5797d0] flex items-center gap-2">
                    <Heart className="w-5 h-5 text-[#ef72b4]" />
                    <span>💕 Love Story (Cerita Perjalanan Cinta)</span>
                  </h2>
                  <p className="text-xs text-[#527595] mt-0.5">
                    Ubah judul dan kisah perjalanan cinta Anda yang tampil di undangan.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const current = Array.isArray(formData.stories) && formData.stories.length > 0 
                        ? [...formData.stories] 
                        : [...weddingData.stories];
                      const newStoryItem = {
                        title: 'Momen Baru',
                        story: 'Tuliskan momen berharga perjalanan cinta Anda di sini...'
                      };
                      setFormData({
                        ...formData,
                        stories: [...current, newStoryItem]
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#f0f7fc] text-[#2b6cb0] hover:bg-[#e1f0fa] border border-[#b8d5ee] transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>+ Tambah Cerita</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`px-3.5 py-1.5 rounded-lg text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-all ${
                      justSaved 
                        ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300' 
                        : 'bg-[#ef72b4] hover:bg-[#d85e9e]'
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
                        <span>Cerita Tersimpan!</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Simpan Cerita</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {(Array.isArray(formData.stories) && formData.stories.length > 0
                  ? formData.stories
                  : weddingData.stories
                ).map((story, idx) => (
                  <div key={idx} className="p-4 bg-[#f8fbfe] rounded-xl border border-[#d9e8f5] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#ef72b4] text-sm flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 fill-[#ef72b4]" />
                        <span>Kisah Bagian #{idx + 1}</span>
                      </span>

                      {/* Tombol Hapus jika lebih dari 1 cerita */}
                      {(formData.stories || weddingData.stories).length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const current = Array.isArray(formData.stories) && formData.stories.length > 0 
                              ? [...formData.stories] 
                              : [...weddingData.stories];
                            const filtered = current.filter((_, i) => i !== idx);
                            setFormData({ ...formData, stories: filtered });
                          }}
                          className="text-xs text-rose-500 hover:text-rose-700 font-semibold px-2 py-0.5 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          Hapus Cerita
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#527595] mb-1">
                        Judul Cerita:
                      </label>
                      <input
                        type="text"
                        value={story.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          const current = Array.isArray(formData.stories) && formData.stories.length > 0 
                            ? [...formData.stories] 
                            : [...weddingData.stories];
                          const updated = current.map((item, i) => i === idx ? { ...item, title: val } : item);
                          setFormData({ ...formData, stories: updated });
                        }}
                        placeholder="Contoh: Awal Pertemuan"
                        className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#527595] mb-1">
                        Isi Cerita:
                      </label>
                      <textarea
                        rows={3}
                        value={story.story}
                        onChange={(e) => {
                          const val = e.target.value;
                          const current = Array.isArray(formData.stories) && formData.stories.length > 0 
                            ? [...formData.stories] 
                            : [...weddingData.stories];
                          const updated = current.map((item, i) => i === idx ? { ...item, story: val } : item);
                          setFormData({ ...formData, stories: updated });
                        }}
                        placeholder="Tuliskan cerita cinta Anda..."
                        className="w-full px-3 py-2 rounded-lg border border-[#d9e0e5] focus:border-[#5797d0] outline-none text-sm bg-white resize-y"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Tombol Simpan di Bawah */}
              <div className="mt-5 pt-3 border-t border-[#edf2f7] flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-[#718096]">
                  Pastikan menekan tombol <strong>Simpan Cerita</strong> agar teks langsung terupdate di undangan.
                </span>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`px-4 py-2 rounded-xl text-white text-xs sm:text-sm font-bold shadow-md cursor-pointer flex items-center gap-1.5 transition-all ${
                    justSaved 
                      ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300' 
                      : 'bg-[#ef72b4] hover:bg-[#d85e9e] active:scale-95'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan Cerita...</span>
                    </>
                  ) : justSaved ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Cerita Berhasil Disimpan!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Simpan Perubahan Cerita</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB GALERI: FOTO PREWEDDING */}
        {activeTab === 'galeri' && (
          <div className="space-y-6">
            {/* Header Box */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#e5ebf0]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#5797d0] flex items-center gap-2">
                    <Camera className="w-5 h-5 text-[#ef72b4]" />
                    <span>Our Gallery (Foto Prewedding)</span>
                  </h2>
                  <p className="text-xs text-[#527595] mt-1">
                    Kelola foto-foto prewedding dan momen bahagia yang ditampilkan di bagian Our Gallery (tepat di atas Love Story).
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 bg-sky-50 border border-sky-200 text-[#5797d0] text-xs font-semibold rounded-full">
                    Total: {formData.gallery?.length || 0} Foto
                  </span>
                  <button
                    type="button"
                    onClick={handleResetDefaultGallery}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-full cursor-pointer flex items-center gap-1 transition-colors shadow-2xs"
                    title="Kembalikan ke 4 foto prewedding bawaan Dian & Jaka"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                    <span>Reset ke Bawaan</span>
                  </button>
                </div>
              </div>

              {/* Form Tambah Foto Baru */}
              <div className="p-4 rounded-xl bg-[#f8fbfe] border border-[#d2e4f5] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#2c3e50] flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-[#ef72b4]" />
                    <span>Tambah Foto Prewedding Baru</span>
                  </h3>
                  <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-medium">
                    ⚡ Otomatis Tersimpan Saat Upload
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Upload atau Input URL */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#4a5568] mb-1">
                        Upload Foto dari HP / Komputer (Bisa Pilih Banyak Foto Sekaligus)
                      </label>
                      <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white border border-[#cbd5e0] hover:border-[#5797d0] text-xs font-medium text-[#4a5568] cursor-pointer transition-all hover:bg-sky-50 shadow-2xs">
                        {isUploadingGallery ? (
                          <>
                            <Loader2 className="w-4 h-4 text-[#5797d0] animate-spin" />
                            <span className="text-[#5797d0] font-bold">Sedang Mengunggah & Menyimpan Foto...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 text-[#5797d0]" />
                            <span className="font-semibold text-[#2c3e50]">Pilih File Foto (Bisa Banyak Foto Sekaligus)</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          disabled={isUploadingGallery}
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files && files.length > 0) handleUploadGalleryPhotos(files);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Format didukung: JPG, PNG, WEBP. Ukuran file otomatis dioptimalkan agar ringan dan cepat dibuka tamu.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#4a5568] mb-1">
                        Atau Masukkan Link / URL Foto
                      </label>
                      <input
                        type="text"
                        placeholder="https://... atau /couple-cover.jpg"
                        value={newGalleryUrl}
                        onChange={(e) => setNewGalleryUrl(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#cbd5e0] text-xs outline-none focus:border-[#5797d0] focus:ring-1 focus:ring-[#5797d0]"
                      />
                    </div>

                    {/* Presets Cepat */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-[#718096]">Pilihan Cepat:</span>
                      <button
                        type="button"
                        onClick={() => setNewGalleryUrl('/couple-cover.jpg')}
                        className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-[11px] text-[#5797d0] hover:bg-sky-50 cursor-pointer"
                      >
                        Foto Berdua Latar Biru
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewGalleryUrl('/couple-photo.jpg')}
                        className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-[11px] text-[#5797d0] hover:bg-sky-50 cursor-pointer"
                      >
                        Foto Pasangan 2
                      </button>
                    </div>
                  </div>

                  {/* Keterangan / Caption & Preview */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#4a5568] mb-1">
                        Keterangan Foto (Caption) - Opsional
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Menatap Masa Depan / Momen Bahagia"
                        value={newGalleryCaption}
                        onChange={(e) => setNewGalleryCaption(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#cbd5e0] text-xs outline-none focus:border-[#5797d0] focus:ring-1 focus:ring-[#5797d0]"
                      />
                    </div>

                    {/* Preview Kotak Foto yang Akan Ditambah */}
                    {newGalleryUrl && (
                      <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-[#cbd5e0]">
                        <img
                          src={normalizeImageUrl(newGalleryUrl)}
                          alt="Preview"
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#2c3e50] truncate">Siap Ditambahkan</p>
                          <p className="text-[11px] text-[#718096] truncate">{newGalleryCaption || 'Tanpa keterangan'}</p>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleAddGalleryPhoto}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#5797d0] hover:bg-[#4886be] active:scale-98 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambahkan ke Galeri & Simpan</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Daftar Foto Galeri yang Ada */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#e5ebf0]">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#2c3e50] flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#5797d0]" />
                    <span>Koleksi Foto Galeri Saat Ini ({formData.gallery?.length || 0})</span>
                  </h3>
                  <span className="text-xs text-gray-500 hidden sm:inline">• Bebas tambah lebih dari 2 foto</span>
                </div>

                <label className="px-3.5 py-1.5 bg-[#5797d0] hover:bg-[#4886be] text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-xs active:scale-95">
                  <Plus className="w-4 h-4" />
                  <span>+ Tambah Foto #{ (formData.gallery?.length || 0) + 1 }</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={isUploadingGallery}
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) handleUploadGalleryPhotos(files);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>

              {(!formData.gallery || formData.gallery.length === 0) ? (
                <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 font-semibold">Belum ada foto dalam galeri.</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Gunakan tombol upload di atas untuk menambahkan foto prewedding.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {formData.gallery.map((photo, idx) => (
                    <div
                      key={photo.id || idx}
                      className="bg-[#fcfdfd] border border-[#e2e8f0] rounded-xl p-3 shadow-2xs flex flex-col justify-between space-y-3"
                    >
                      {/* Image Thumbnail */}
                      <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 relative group">
                        <img
                          src={normalizeImageUrl(photo.url)}
                          alt={photo.caption || `Foto ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white rounded text-[10px] font-bold">
                          #{idx + 1}
                        </span>

                        {/* Quick Replace Overlay on hover/click */}
                        <label className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/70 hover:bg-black/90 text-white rounded-lg text-[11px] font-medium flex items-center gap-1 cursor-pointer shadow-md transition-all">
                          <Camera className="w-3 h-3 text-cyan-300" />
                          <span>Ganti File</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={isUploadingGallery}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleReplaceGalleryPhoto(idx, file);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>

                      {/* Caption Input */}
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">
                          Caption / Judul Foto:
                        </label>
                        <input
                          type="text"
                          value={photo.caption || ''}
                          onChange={(e) => handleUpdateGalleryCaption(idx, e.target.value)}
                          placeholder="Keterangan foto..."
                          className="w-full px-2 py-1 text-xs rounded border border-gray-300 focus:border-[#5797d0] outline-none"
                        />
                      </div>

                      {/* Actions: Reorder, Replace & Delete */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 gap-1 flex-wrap">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveGalleryPhoto(idx, 'up')}
                            className="p-1 rounded hover:bg-gray-200 text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                            title="Geser ke kiri / atas"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === (formData.gallery?.length || 1) - 1}
                            onClick={() => handleMoveGalleryPhoto(idx, 'down')}
                            className="p-1 rounded hover:bg-gray-200 text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                            title="Geser ke kanan / bawah"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <label className="px-2 py-1 rounded bg-sky-50 hover:bg-sky-100 text-[#5797d0] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer" title="Ganti foto ini">
                            <Camera className="w-3 h-3" />
                            <span>Ganti</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={isUploadingGallery}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleReplaceGalleryPhoto(idx, file);
                                e.target.value = '';
                              }}
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryPhoto(idx)}
                            className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Hapus foto dari galeri"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Kartu Tambah Foto Berikutnya (Slot #3, #4, dst.) */}
                  <label className="border-2 border-dashed border-[#5797d0]/40 hover:border-[#5797d0] bg-[#f8fbfe] hover:bg-[#eaf4fa] rounded-xl p-4 flex flex-col items-center justify-center min-h-[220px] cursor-pointer transition-all group shadow-2xs hover:shadow-xs">
                    <div className="w-12 h-12 rounded-full bg-[#5797d0]/10 group-hover:bg-[#5797d0] text-[#5797d0] group-hover:text-white flex items-center justify-center mb-2.5 transition-colors">
                      <Plus className="w-6 h-6" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-[#2c3e50] group-hover:text-[#5797d0] text-center">
                      + Tambah Foto #{ (formData.gallery?.length || 0) + 1 }
                    </span>
                    <span className="text-[11px] text-[#527595] text-center mt-1 px-2 leading-relaxed">
                      Klik untuk upload foto prewedding ke-{(formData.gallery?.length || 0) + 1} dari HP / Laptop
                    </span>
                    <span className="mt-2.5 px-3 py-1 bg-white border border-[#5797d0]/30 rounded-lg text-[11px] font-bold text-[#5797d0] shadow-2xs group-hover:border-[#5797d0]">
                      Pilih Foto
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={isUploadingGallery}
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) handleUploadGalleryPhotos(files);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              )}

              {/* Tombol Simpan Galeri */}
              <div className="mt-6 pt-4 border-t border-[#e2e8f0] flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`px-5 py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold shadow-md cursor-pointer flex items-center gap-1.5 transition-all ${
                    justSaved
                      ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300'
                      : 'bg-[#5797d0] hover:bg-[#4383bd] active:scale-95'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan Galeri...</span>
                    </>
                  ) : justSaved ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Galeri Berhasil Disimpan!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Simpan Perubahan Galeri</span>
                    </>
                  )}
                </button>
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

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {wishesList.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllWishes}
                      className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Kosongkan seluruh ucapan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Semua</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={fetchAdminWishes}
                    disabled={isLoadingWishes}
                    className="px-3.5 py-2 rounded-xl bg-[#5797d0]/10 hover:bg-[#5797d0]/20 text-[#5797d0] font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingWishes ? 'animate-spin' : ''}`} />
                    <span>Segarkan Data</span>
                  </button>
                </div>
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
                {/* Search */}
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

                {/* Filter buttons */}
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

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingWish(wish)}
                            title="Edit ucapan ini"
                            className="p-1.5 text-gray-400 hover:text-[#5797d0] hover:bg-[#5797d0]/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
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

        {/* TAB 7: INTEGRASI GOOGLE SCRIPT & SPREADSHEET */}
        {activeTab === 'google_script' && (
          <div className="space-y-6">
            {/* Header Status Card */}
            <div className="bg-gradient-to-r from-[#0f7b40] to-[#13944d] text-white p-5 sm:p-6 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-white/15 text-white backdrop-blur-xs">
                    <FileSpreadsheet className="w-6 h-6" />
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold">
                    Integrasi Google Sheets & Google Apps Script
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed pt-1">
                  Otomatisasi pengiriman Ucapan Doa, Konfirmasi Kehadiran (RSVP), dan Daftar Tamu ke Google Spreadsheet secara <i>real-time</i> tanpa biaya server tambahan.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2.5 rounded-xl text-right">
                <div className="text-[11px] uppercase tracking-wider text-emerald-100 font-semibold mb-0.5">
                  Status Integrasi
                </div>
                {formData.googleScriptUrl ? (
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-700/80 px-2.5 py-1 rounded-full border border-emerald-400/40">
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                    <span>Tersambung ke Google Script</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-200 bg-black/20 px-2.5 py-1 rounded-full">
                    <span>⚪ Belum Terkonfigurasi</span>
                  </div>
                )}
              </div>
            </div>

            {/* URL Configuration Card */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#e5ebf0]">
              <h3 className="text-base sm:text-lg font-bold text-[#2d3748] mb-2 flex items-center gap-2">
                <span className="text-[#0f7b40]">🔗</span>
                <span>URL Aplikasi Web (Google Apps Script Web App URL)</span>
              </h3>
              <p className="text-xs sm:text-sm text-[#718096] mb-4">
                Masukkan URL Aplikasi Web yang Anda dapatkan setelah menerapkan (Deploy) script di Google Sheets (URL biasanya berakhiran <code className="bg-gray-100 px-1 py-0.5 rounded text-[#0f7b40] font-mono font-bold">/exec</code>).
              </p>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      value={formData.googleScriptUrl || ''}
                      onChange={(e) => setFormData({ ...formData, googleScriptUrl: e.target.value })}
                      placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-[#cbd5e0] focus:border-[#0f7b40] focus:ring-2 focus:ring-[#0f7b40]/20 font-mono text-xs sm:text-sm outline-none text-[#2d3748]"
                    />
                    {formData.googleScriptUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, googleScriptUrl: '' })}
                        title="Hapus URL"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs cursor-pointer p-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      await handleSave();
                      alert('URL Google Apps Script berhasil disimpan!');
                    }}
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl bg-[#0f7b40] hover:bg-[#0c6333] text-white font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan URL</span>
                  </button>
                </div>

                {/* Action Buttons: Test Connection & Sync */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleTestScriptConnection}
                    disabled={isTestingScript || !formData.googleScriptUrl}
                    className="px-4 py-2 rounded-xl bg-[#f0fdf4] hover:bg-[#dcfce7] border border-[#bbf7d0] text-[#15803d] font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                  >
                    {isTestingScript ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#15803d]" />
                        <span>Menguji Koneksi...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-[#15803d]" />
                        <span>Uji Koneksi Google Script</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncToGoogleSheet}
                    disabled={isSyncingScript || !formData.googleScriptUrl}
                    className="px-4 py-2 rounded-xl bg-[#eff6ff] hover:bg-[#dbeafe] border border-[#bfdbfe] text-[#1d4ed8] font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                  >
                    {isSyncingScript ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#1d4ed8]" />
                        <span>Menyinkronkan ke Sheets...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 text-[#1d4ed8]" />
                        <span>Sinkronkan Semua Data ({wishesList.length} Ucapan, {guestList.length} Tamu)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Feedback Alerts */}
                {scriptTestResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-start gap-2.5 animate-fade-in ${
                      scriptTestResult.success
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-red-50 border-red-300 text-red-800'
                    }`}
                  >
                    {scriptTestResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="font-bold">{scriptTestResult.message}</div>
                      {scriptTestResult.details && (
                        <div className="mt-1 text-xs text-emerald-700 font-mono">
                          {scriptTestResult.details.spreadsheetTitle && (
                            <div>Judul Dokumen: <b>{scriptTestResult.details.spreadsheetTitle}</b></div>
                          )}
                          {scriptTestResult.details.serverTime && (
                            <div>Waktu Server: {scriptTestResult.details.serverTime}</div>
                          )}
                        </div>
                      )}
                      {!scriptTestResult.success && (
                        <div className="mt-1.5 text-xs text-red-700 leading-relaxed">
                          <b>Tips Mengatasi:</b> Pastikan di menu Deploy Apps Script, kolom <i>"Who has access"</i> dipilih <b>"Anyone" (Siapa saja)</b>, bukan "Only myself".
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setScriptTestResult(null)}
                      className="text-gray-400 hover:text-gray-600 font-bold p-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {scriptSyncResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-start gap-2.5 animate-fade-in ${
                      scriptSyncResult.success
                        ? 'bg-blue-50 border-blue-300 text-blue-800'
                        : 'bg-amber-50 border-amber-300 text-amber-800'
                    }`}
                  >
                    {scriptSyncResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="font-bold">{scriptSyncResult.message}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setScriptSyncResult(null)}
                      className="text-gray-400 hover:text-gray-600 font-bold p-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Script Code Viewer & Copy Card */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#e5ebf0]">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-[#edf2f7]">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#2d3748] flex items-center gap-2">
                    <FileCode className="w-5 h-5 text-[#0f7b40]" />
                    <span>Kode Script Google Apps Script (Code.gs)</span>
                  </h3>
                  <p className="text-xs text-[#718096] mt-0.5">
                    Salin seluruh kode ini, lalu tempelkan ke editor Google Apps Script di Spreadsheet Anda.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyScriptCode}
                    className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                      hasCopiedScript
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                        : 'bg-[#0f7b40] hover:bg-[#0c6333] text-white'
                    }`}
                  >
                    {hasCopiedScript ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{hasCopiedScript ? 'Kode Tersalin!' : 'Salin Semua Kode'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadScriptFile}
                    className="px-3.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#4a5568] text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Unduh file Code.gs ke perangkat"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh .gs</span>
                  </button>
                </div>
              </div>

              {/* Code Box */}
              <div className="relative rounded-xl overflow-hidden border border-[#2d3748] bg-[#1e293b] text-gray-200">
                <div className="bg-[#0f172a] px-4 py-2 border-b border-[#334155] flex items-center justify-between text-xs text-gray-400">
                  <span className="font-mono text-emerald-400 font-semibold">📄 google-apps-script/Code.gs</span>
                  <span>Google Apps Script (JavaScript)</span>
                </div>
                <div className="max-h-96 overflow-y-auto p-4 font-mono text-xs leading-relaxed select-all">
                  <pre className="whitespace-pre text-emerald-300/90 font-mono">
                    {scriptCode || 'Memuat kode script Google Apps Script...'}
                  </pre>
                </div>
              </div>
            </div>

            {/* Step-by-Step Installation Tutorial */}
            <div className="bg-[#f8fafc] p-5 sm:p-6 rounded-2xl border border-[#cbd5e1] space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-[#1e293b] flex items-center gap-2">
                <span>📖 Panduan Lengkap Memasang di Google Apps Script (2 Menit)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Step 1 */}
                <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-2 text-[#0f7b40] font-bold text-sm">
                    <span className="w-6 h-6 rounded-full bg-[#0f7b40] text-white flex items-center justify-center text-xs">1</span>
                    <span>Buka Google Sheets Baru</span>
                  </div>
                  <p className="text-xs text-[#64748b] leading-relaxed">
                    Buka <a href="https://sheets.google.com" target="_blank" rel="noreferrer" className="text-[#0f7b40] underline font-semibold">sheets.google.com</a>, klik <b>Kosong (Blank)</b>, dan beri nama file misalnya <i>"Buku Tamu Jaka & Dian"</i>.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-2 text-[#0f7b40] font-bold text-sm">
                    <span className="w-6 h-6 rounded-full bg-[#0f7b40] text-white flex items-center justify-center text-xs">2</span>
                    <span>Buka Menu Apps Script</span>
                  </div>
                  <p className="text-xs text-[#64748b] leading-relaxed">
                    Di bilah menu atas Google Sheets, klik menu <b>Ekstensi (Extensions)</b> &gt; pilih <b>Apps Script</b>. Jendela editor kode Google Script akan terbuka.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-2 text-[#0f7b40] font-bold text-sm">
                    <span className="w-6 h-6 rounded-full bg-[#0f7b40] text-white flex items-center justify-center text-xs">3</span>
                    <span>Tempelkan Kode Script & Simpan</span>
                  </div>
                  <p className="text-xs text-[#64748b] leading-relaxed">
                    Hapus semua tulisan bawaan di <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800 font-mono">Code.gs</code>, lalu klik tombol <b>"Salin Semua Kode"</b> di atas dan tempelkan (Ctrl + V). Tekan <b>Ctrl + S</b> (ikon disket) untuk menyimpan.
                  </p>
                </div>

                {/* Step 4 */}
                <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-2 text-[#0f7b40] font-bold text-sm">
                    <span className="w-6 h-6 rounded-full bg-[#0f7b40] text-white flex items-center justify-center text-xs">4</span>
                    <span>Terapkan sebagai Aplikasi Web</span>
                  </div>
                  <p className="text-xs text-[#64748b] leading-relaxed">
                    Klik tombol biru <b>Terapkan (Deploy)</b> di pojok kanan atas &gt; pilih <b>Penerapan Baru (New Deployment)</b>. Klik ikon <b>Gear ⚙️</b> di sebelah "Pilih jenis", lalu pilih <b>Aplikasi Web (Web App)</b>.
                  </p>
                </div>

                {/* Step 5 */}
                <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-2xs space-y-1.5 md:col-span-2">
                  <div className="flex items-center gap-2 text-[#0f7b40] font-bold text-sm">
                    <span className="w-6 h-6 rounded-full bg-[#0f7b40] text-white flex items-center justify-center text-xs">5</span>
                    <span>Atur Izin Akses "Siapa saja (Anyone)" — SANGAT PENTING!</span>
                  </div>
                  <div className="text-xs text-[#475569] leading-relaxed space-y-1 pl-8">
                    <div>• <b>Deskripsi</b>: Undangan Pernikahan Jaka & Dian</div>
                    <div>• <b>Jalankan sebagai (Execute as)</b>: <b>Saya (email Anda)</b></div>
                    <div>• <b>Siapa yang memiliki akses (Who has access)</b>: <b className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Siapa saja (Anyone)</b> <i>(Wajib dipilih agar website undangan dapat mengirim data ke Sheets tanpa meminta login Google)</i>.</div>
                    <div className="pt-1 text-[#64748b]">
                      Klik <b>Terapkan</b> &gt; Klik <b>Beri Akses (Review Permissions)</b> &gt; Pilih email Anda &gt; Klik <i>Lanjutan (Advanced)</i> &gt; Klik <i>Buka project (tidak aman)</i> &gt; Klik <b>Izinkan (Allow)</b>.
                    </div>
                  </div>
                </div>

                {/* Step 6 */}
                <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-2xs space-y-1.5 md:col-span-2">
                  <div className="flex items-center gap-2 text-[#0f7b40] font-bold text-sm">
                    <span className="w-6 h-6 rounded-full bg-[#0f7b40] text-white flex items-center justify-center text-xs">6</span>
                    <span>Salin URL & Masukkan ke Formulir di Atas</span>
                  </div>
                  <p className="text-xs text-[#64748b] leading-relaxed pl-8">
                    Salin <b>URL Aplikasi Web</b> yang berakhiran <code className="bg-emerald-50 text-emerald-800 px-1 py-0.5 rounded font-mono font-bold">/exec</code>. Tempelkan di kolom <i>"URL Aplikasi Web"</i> di atas, klik <b>Simpan URL</b>, lalu uji koneksi dengan menekan <b>Uji Koneksi Google Script</b>.
                  </p>
                </div>
              </div>
            </div>

            {/* Spreadsheet Auto-features info */}
            <div className="bg-[#ecfdf5] border-l-4 border-[#10b981] p-4 rounded-r-xl text-xs sm:text-sm text-[#065f46] space-y-1 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#10b981]" />
                <span>Otomatisasi Tabel di Google Spreadsheet</span>
              </div>
              <p>
                Anda tidak perlu repot membuat tabel atau mengetik judul kolom secara manual. Script akan secara otomatis membuat dan menata 2 lembar sheet berdesain elegan:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-xs text-[#047857] pl-1 pt-1">
                <li><b>Sheet "Ucapan & RSVP"</b>: Header biru (#5797d0), berisi Waktu Masuk, Nama Tamu, Konfirmasi Kehadiran (✅ Hadir / ❓ Ragu / ❌ Tidak Hadir), dan Pesan Ucapan.</li>
                <li><b>Sheet "Daftar Tamu"</b>: Header pink (#ec79b8), berisi No, Nama Tamu, Kategori, No WhatsApp, dan Link Undangan Khusus tamu tersebut.</li>
              </ul>
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

      {/* Live Preview Modal (Pratinjau Langsung Hasil Edit) */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden animate-scale-up">
            {/* Header Pratinjau */}
            <div className="bg-[#5797d0] text-white px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-cyan-200" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base leading-tight">👁️ Pratinjau Langsung Undangan</h3>
                  <p className="text-[11px] text-white/80">Menampilkan data yang sedang Anda edit secara live</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold cursor-pointer transition-all"
                title="Tutup Pratinjau"
              >
                ✕
              </button>
            </div>

            {/* Sub-header Notice */}
            <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center justify-between text-xs text-emerald-800 shrink-0">
              <span className="flex items-center gap-1.5 font-medium">
                <Check className="w-4 h-4 text-emerald-600" />
                Data Akad, Resepsi, Foto, & Cerita langsung terhubung!
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                Mobile View
              </span>
            </div>

            {/* Scrollable Mobile Phone Frame */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-4 bg-gray-100 flex justify-center">
              <div className="w-full max-w-[420px] bg-[#f8f7f4] rounded-2xl shadow-md border border-[#e2dcce] overflow-hidden flex flex-col items-center">
                {/* 1. Cover Preview */}
                <div className="w-full border-b-2 border-dashed border-[#5797d0]/20">
                  <CoverSection
                    config={formData}
                    guestName="Bapak/Ibu Tamu Undangan"
                    onOpenInvitation={() => {}}
                  />
                </div>

                {/* 2. Isi Lengkap Undangan */}
                <div className="w-full flex flex-col items-center pt-2">
                  <Page2TitleQuote config={formData} />
                  <BrideGroomSection config={formData} />
                  <SaveTheDateSection config={formData} />
                  <EventDetailsSection config={formData} />
                  <OurGallerySection config={formData} />
                  <LoveStorySection config={formData} />
                  <WeddingGiftSection config={formData} />
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-gray-500">
                Semua teks dan alamat di atas sudah sesuai yang Anda ketik.
              </span>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#5797d0] hover:bg-[#4784ba] text-white font-bold text-xs sm:text-sm cursor-pointer transition-all shadow-xs"
              >
                Tutup & Lanjut Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export to GitHub weddingData.ts Modal */}
      {isExportCodeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#2c5282] to-[#5797d0] text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/10 text-amber-300">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg leading-tight">
                    Ekspor Data ke GitHub (weddingData.ts)
                  </h3>
                  <p className="text-xs text-white/80">
                    Aktifkan semua perubahan secara permanen untuk seluruh tamu di dunia
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsExportCodeOpen(false);
                  setCopiedCodeSuccess(false);
                }}
                className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold cursor-pointer transition-all"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs sm:text-sm">
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-[#2c5282] leading-relaxed">
                <strong>Cara Kerja:</strong> Kode di bawah ini sudah otomatis terisi dengan seluruh perubahan yang baru saja Anda ketik di menu Admin (Alamat Akad, Resepsi, Cerita Cinta, Musik, Nama Pengantin, dll).
                Cukup klik tombol <strong>"Salin Seluruh Kode"</strong> lalu tempelkan ke file <strong>`src/data/weddingData.ts`</strong> di GitHub.
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-gray-700 text-xs">
                    Kode Siap Pakai untuk `src/data/weddingData.ts`:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(getGeneratedWeddingDataCode()).then(() => {
                        setCopiedCodeSuccess(true);
                        setTimeout(() => setCopiedCodeSuccess(false), 3000);
                      });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      copiedCodeSuccess
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-[#5797d0] hover:bg-[#4383bd] text-white shadow-xs'
                    }`}
                  >
                    {copiedCodeSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Kode Berhasil Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Seluruh Kode</span>
                      </>
                    )}
                  </button>
                </div>

                <textarea
                  readOnly
                  rows={14}
                  value={getGeneratedWeddingDataCode()}
                  className="w-full p-3 font-mono text-xs bg-gray-900 text-emerald-400 rounded-xl border border-gray-700 focus:outline-none select-all resize-none shadow-inner"
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
              </div>

              <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
                <a
                  href="https://github.com/official-afolele/undangan/blob/main/src/data/weddingData.ts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5797d0] hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Buka file `src/data/weddingData.ts` di GitHub Anda</span>
                </a>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsExportCodeOpen(false);
                  setCopiedCodeSuccess(false);
                }}
                className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
