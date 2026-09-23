import { useState, useEffect } from 'react';
import { weddingData, initialGuests } from './data/weddingData';
import { WeddingConfig, GuestItem } from './types';
import { audioController } from './utils/audioPlayer';
import { CoverSection } from './components/CoverSection';
import { Page2TitleQuote } from './components/Page2TitleQuote';
import { BrideGroomSection } from './components/BrideGroomSection';
import { SaveTheDateSection } from './components/SaveTheDateSection';
import { EventDetailsSection } from './components/EventDetailsSection';
import { LoveStorySection } from './components/LoveStorySection';
import { WeddingGiftSection } from './components/WeddingGiftSection';
import { WishesRsvpSection } from './components/WishesRsvpSection';
import { FooterSection } from './components/FooterSection';
import { FloatingControls } from './components/FloatingControls';
import { AdminPanel } from './components/AdminPanel';
import { AdminLogin } from './components/AdminLogin';
import { PhotoEditorModal, PhotoRole } from './components/PhotoEditorModal';
import { normalizeImageUrl } from './utils/imageUrl';
import {
  DEFAULT_ADMIN_PASSWORD,
  ADMIN_PASSWORD_STORAGE_KEY,
  validateAdminPassword,
  checkStoredAuth,
  saveAdminAuth,
  clearAdminAuth,
  cleanPasswordString,
} from './utils/auth';

const CONFIG_STORAGE_KEY = 'wedding_config_jaka_dian';
const GUESTS_STORAGE_KEY = 'wedding_guests_jaka_dian';

// Detect whether the current URL path is for the /admin route
const checkIsAdminPath = (): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const search = window.location.search.toLowerCase();
  const hash = window.location.hash.toLowerCase();

  return (
    path === '/admin' ||
    path.startsWith('/admin/') ||
    search.includes('admin=true') ||
    search.includes('page=admin') ||
    hash === '#/admin' ||
    hash.startsWith('#/admin')
  );
};

// Parse and cleanly decode guest name from URL query parameter (?to=...)
const parseGuestNameFromUrl = (): string => {
  if (typeof window === 'undefined') return 'Tamu Undangan';
  try {
    let raw = '';
    const searchParams = new URLSearchParams(window.location.search);
    raw = searchParams.get('to') || searchParams.get('u') || searchParams.get('nama') || searchParams.get('guest') || '';

    // Also support hash parameter (e.g., #/?to=Jaka%2FPartner)
    if (!raw && window.location.hash) {
      const qIndex = window.location.hash.indexOf('?');
      if (qIndex !== -1) {
        const hashParams = new URLSearchParams(window.location.hash.substring(qIndex));
        raw = hashParams.get('to') || hashParams.get('u') || hashParams.get('nama') || hashParams.get('guest') || '';
      }
    }

    if (raw && raw.trim()) {
      let decoded = raw;
      try {
        decoded = decodeURIComponent(decoded);
      } catch {
        // use raw if malformed URI component
      }

      // Handle double-encoded URLs (e.g., %252F -> %2F -> /)
      if (decoded.includes('%')) {
        try {
          decoded = decodeURIComponent(decoded);
        } catch {
          // ignore error
        }
      }

      // Strip surrounding quotes if present (e.g., ?to="Jaka")
      decoded = decoded.replace(/^["']+|["']+$/g, '').trim();

      if (decoded) {
        return decoded;
      }
    }
  } catch {
    // fallback to default
  }
  return 'Tamu Undangan';
};

export default function App() {
  const [isOpened, setIsOpened] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => checkIsAdminPath());
  const [guestName, setGuestName] = useState<string>(() => parseGuestNameFromUrl());

  // Password & Authentication State
  const [adminPassword, setAdminPassword] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY);
      if (saved && saved.trim()) return cleanPasswordString(saved);
    } catch {
      // storage fallback
    }
    return DEFAULT_ADMIN_PASSWORD;
  });

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const urlPass = searchParams.get('pass') || searchParams.get('key') || searchParams.get('pwd');
        if (urlPass && validateAdminPassword(urlPass, DEFAULT_ADMIN_PASSWORD)) {
          saveAdminAuth(true);
          return true;
        }
      } catch {
        // ignore url parsing error
      }
      return checkStoredAuth();
    }
    return false;
  });

  // Load config from localStorage or initial weddingData
  const [config, setConfig] = useState<WeddingConfig>(() => {
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) {
        const parsed: WeddingConfig = JSON.parse(saved);
        // If old pixabay audio was saved, update to user's desired audioUrl
        if (!parsed.audioUrl || parsed.audioUrl.includes('pixabay.com')) {
          parsed.audioUrl = weddingData.audioUrl;
          parsed.musicTitle = weddingData.musicTitle;
          parsed.musicArtist = weddingData.musicArtist;
        }
        // Normalize photos to updated groom and bride photos
        if (parsed.groom?.photo) {
          if (parsed.groom.photo.includes('unsplash.com') || parsed.groom.photo.includes('googleusercontent.com')) {
            parsed.groom.photo = weddingData.groom.photo;
          } else {
            parsed.groom.photo = normalizeImageUrl(parsed.groom.photo);
          }
        }
        if (parsed.bride?.photo) {
          if (parsed.bride.photo.includes('unsplash.com')) {
            parsed.bride.photo = weddingData.bride.photo;
          } else {
            parsed.bride.photo = normalizeImageUrl(parsed.bride.photo);
          }
        }
        if (!parsed.bankAccounts || parsed.bankAccounts.length < 2) {
          parsed.bankAccounts = weddingData.bankAccounts;
        }
        return parsed;
      }
    } catch {
      // storage error fallback
    }
    return weddingData;
  });

  // Keep audioController in sync with config.audioUrl
  useEffect(() => {
    if (config.audioUrl) {
      audioController.setAudioUrl(config.audioUrl);
    }
  }, [config.audioUrl]);

  // Load guests from localStorage or initialGuests
  const [guests, setGuests] = useState<GuestItem[]>(() => {
    try {
      const saved = localStorage.getItem(GUESTS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // storage error fallback
    }
    return initialGuests;
  });

  // Fetch shared server-side config and guests on initial mount (Cross-browser sync)
  useEffect(() => {
    let isMounted = true;

    // 1. Fetch persistent config from server
    fetch('/api/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((serverConfig: WeddingConfig | null) => {
        if (!isMounted || !serverConfig) return;
        const normalized = {
          ...serverConfig,
          groom: {
            ...serverConfig.groom,
            photo: normalizeImageUrl(serverConfig.groom?.photo || weddingData.groom.photo),
          },
          bride: {
            ...serverConfig.bride,
            photo: normalizeImageUrl(serverConfig.bride?.photo || weddingData.bride.photo),
          },
        };
        setConfig(normalized);
        try {
          localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(normalized));
        } catch {
          // ignore
        }
      })
      .catch((err) => {
        console.warn('Config fetch from server failed, using cached state:', err);
      });

    // 2. Fetch persistent guests from server
    fetch('/api/guests')
      .then((res) => (res.ok ? res.json() : null))
      .then((serverGuests: GuestItem[] | null) => {
        if (!isMounted || !serverGuests || !Array.isArray(serverGuests)) return;
        setGuests(serverGuests);
        try {
          localStorage.setItem(GUESTS_STORAGE_KEY, JSON.stringify(serverGuests));
        } catch {
          // ignore
        }
      })
      .catch((err) => {
        console.warn('Guests fetch from server failed:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Read URL query params (?to=...) and monitor routing changes
  useEffect(() => {
    const syncFromUrl = () => {
      setIsAdmin(checkIsAdminPath());
      const guest = parseGuestNameFromUrl();
      setGuestName(guest);

      // Check if URL has admin authentication query param (?pass=... or ?key=...)
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const urlPass = searchParams.get('pass') || searchParams.get('key') || searchParams.get('pwd');
        if (urlPass && validateAdminPassword(urlPass, adminPassword)) {
          setIsAdminAuthenticated(true);
          saveAdminAuth(true);
        }
      } catch {
        // ignore
      }

      if (guest && guest !== 'Tamu Undangan') {
        document.title = `Undangan Pernikahan Jaka & Dian - ${guest}`;
      } else {
        document.title = 'Undangan Pernikahan Jaka & Dian';
      }
    };

    syncFromUrl();

    window.addEventListener('popstate', syncFromUrl);
    window.addEventListener('hashchange', syncFromUrl);
    return () => {
      window.removeEventListener('popstate', syncFromUrl);
      window.removeEventListener('hashchange', syncFromUrl);
    };
  }, []);

  // Keyboard shortcut (Ctrl+Shift+A or Cmd+Shift+A) for quick owner navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        if (isAdmin) {
          navigateToGuest();
        } else {
          navigateToAdmin();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdmin, guestName]);

  // Quick Photo Editor Modal from Invitation / Cover view
  const [photoEditorState, setPhotoEditorState] = useState<{
    isOpen: boolean;
    role: PhotoRole;
    currentUrl: string;
    personName?: string;
  }>({
    isOpen: false,
    role: 'groom',
    currentUrl: '',
    personName: '',
  });

  const handleOpenPhotoEditorFromInvitation = (role: 'groom' | 'bride') => {
    const currentUrl = role === 'groom' ? config.groom.photo : config.bride.photo;
    const personName = role === 'groom' ? config.groom.name : config.bride.name;
    setPhotoEditorState({
      isOpen: true,
      role,
      currentUrl,
      personName,
    });
  };

  const handleSavePhotoModalFromInvitation = async (role: PhotoRole, newUrl: string) => {
    let updatedConfig: WeddingConfig;
    if (role === 'couple') {
      updatedConfig = { ...config, couplePhoto: newUrl };
    } else {
      updatedConfig = {
        ...config,
        [role]: {
          ...config[role],
          photo: newUrl,
        },
      };
    }
    await handleSaveConfig(updatedConfig);
  };

  const navigateToAdmin = () => {
    try {
      window.history.pushState({}, '', '/admin');
    } catch {
      window.location.hash = '/admin';
    }
    setIsAdmin(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToGuest = (customName?: string) => {
    try {
      const query = customName
        ? `?to=${encodeURIComponent(customName)}`
        : (guestName && guestName !== 'Tamu Undangan' ? `?to=${encodeURIComponent(guestName)}` : '');
      window.history.pushState({}, '', `/${query}`);
    } catch {
      window.location.hash = '';
    }
    setIsAdmin(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenInvitation = () => {
    setIsOpened(true);
    audioController.play();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveConfig = async (newConfig: WeddingConfig): Promise<boolean> => {
    const sanitized: WeddingConfig = {
      ...newConfig,
      groom: {
        ...newConfig.groom,
        photo: normalizeImageUrl(newConfig.groom?.photo) || weddingData.groom.photo,
      },
      bride: {
        ...newConfig.bride,
        photo: normalizeImageUrl(newConfig.bride?.photo) || weddingData.bride.photo,
      },
    };

    setConfig(sanitized);
    if (sanitized.audioUrl) {
      audioController.setAudioUrl(sanitized.audioUrl);
    }

    // 1. Instant local storage cache
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(sanitized));
    } catch {
      // storage fallback
    }

    // 2. Persist to server so ALL browsers & devices immediately see updated photos and details
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitized),
      });
      return res.ok;
    } catch (err) {
      console.warn('Could not persist config to server:', err);
      return false;
    }
  };

  const handleSaveGuests = async (newGuests: GuestItem[]): Promise<boolean> => {
    setGuests(newGuests);
    try {
      localStorage.setItem(GUESTS_STORAGE_KEY, JSON.stringify(newGuests));
    } catch {
      // storage fallback
    }

    // Persist to server
    try {
      const res = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGuests),
      });
      return res.ok;
    } catch (err) {
      console.warn('Could not persist guests to server:', err);
      return false;
    }
  };

  const handleAdminLoginSuccess = (rememberMe: boolean) => {
    setIsAdminAuthenticated(true);
    saveAdminAuth(rememberMe);
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    clearAdminAuth();
    navigateToGuest();
  };

  const handleChangeAdminPassword = (newPass: string) => {
    const cleaned = cleanPasswordString(newPass);
    if (!cleaned) return;
    setAdminPassword(cleaned);
    try {
      localStorage.setItem(ADMIN_PASSWORD_STORAGE_KEY, cleaned);
    } catch {
      // storage fallback
    }
  };

  const handleResetDefault = () => {
    setConfig(weddingData);
    setGuests(initialGuests);
    try {
      localStorage.removeItem(CONFIG_STORAGE_KEY);
      localStorage.removeItem(GUESTS_STORAGE_KEY);
    } catch {
      // storage fallback
    }

    // Reset server config & guests as well
    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(weddingData),
    }).catch(() => {});

    fetch('/api/guests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initialGuests),
    }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-[#e9e6df] flex flex-col items-center justify-start text-[#5797d0] selection:bg-[#facfe5] selection:text-[#5797d0]">
      {isAdmin ? (
        /* ================= ADMIN ROUTE (/admin) ================= */
        !isAdminAuthenticated ? (
          /* Password Protection Gate */
          <AdminLogin
            currentPassword={adminPassword}
            onLoginSuccess={handleAdminLoginSuccess}
            onBackToGuest={() => navigateToGuest()}
          />
        ) : (
          /* Authenticated Admin Panel */
          <AdminPanel
            config={config}
            onSaveConfig={handleSaveConfig}
            guests={guests}
            onSaveGuests={handleSaveGuests}
            onClose={() => navigateToGuest()}
            onResetDefault={handleResetDefault}
            onLogout={handleAdminLogout}
            onChangePassword={handleChangeAdminPassword}
            currentPassword={adminPassword}
          />
        )
      ) : (
        /* ================= GUEST INVITATION VIEW (/) ================= */
        <div className="w-full flex-1 flex justify-center py-0 sm:py-6 px-0 sm:px-3">
          {/* Paper Container with mobile-first friendly width */}
          <div
            className="paper-texture w-full max-w-[480px] min-h-screen bg-[#f8f7f4] sm:rounded-2xl sm:shadow-[0_10px_35px_rgba(0,0,0,0.12)] border-0 sm:border border-[#e2dcce] relative overflow-x-hidden transition-all duration-300"
          >
            {!isOpened ? (
              /* COVER VIEW */
              <CoverSection
                config={config}
                guestName={guestName}
                onOpenInvitation={handleOpenInvitation}
                onEditPhoto={handleOpenPhotoEditorFromInvitation}
              />
            ) : (
              /* MAIN INVITATION CONTENT */
              <main className="w-full flex flex-col items-center pt-2">
                {/* Title, Quote & Music Player */}
                <Page2TitleQuote config={config} />

                {/* Bride & Groom Section */}
                <BrideGroomSection 
                  config={config} 
                  onEditPhoto={handleOpenPhotoEditorFromInvitation}
                />

                {/* Save The Date & Countdown */}
                <SaveTheDateSection config={config} />

                {/* Event Details: Akad & Resepsi */}
                <EventDetailsSection config={config} />

                {/* Love Story */}
                <LoveStorySection config={config} />

                {/* Wedding Gift & Kirim Kado */}
                <WeddingGiftSection config={config} />

                {/* Wishes & RSVP Form */}
                <WishesRsvpSection initialGuestName={guestName} />

                {/* Footer (clean for guests, secret 5-click easter egg navigates to admin) */}
                <FooterSection 
                  config={config} 
                  onOpenAdmin={navigateToAdmin}
                />

                {/* Floating Music & Mobile Navigation */}
                <FloatingControls />
              </main>
            )}
          </div>
        </div>
      )}

      {/* Quick Photo Editor Modal accessible from invitation views */}
      <PhotoEditorModal
        isOpen={photoEditorState.isOpen}
        role={photoEditorState.role}
        currentPhotoUrl={photoEditorState.currentUrl}
        personName={photoEditorState.personName}
        onClose={() => setPhotoEditorState((prev) => ({ ...prev, isOpen: false }))}
        onSavePhoto={handleSavePhotoModalFromInvitation}
      />
    </div>
  );
}
