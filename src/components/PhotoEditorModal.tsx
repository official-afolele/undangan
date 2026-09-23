import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Upload, 
  Camera, 
  Link as LinkIcon, 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  Image as ImageIcon,
  Sliders,
  RefreshCw,
  Move
} from 'lucide-react';
import { normalizeImageUrl } from '../utils/imageUrl';

export type PhotoRole = 'groom' | 'bride' | 'couple';

interface PhotoEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: PhotoRole;
  currentPhotoUrl: string;
  onSavePhoto: (role: PhotoRole, newUrl: string) => Promise<boolean> | void;
  personName?: string;
}

export const PhotoEditorModal: React.FC<PhotoEditorModalProps> = ({
  isOpen,
  onClose,
  role,
  currentPhotoUrl,
  onSavePhoto,
  personName = ''
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'link' | 'presets'>('upload');
  const [selectedImageSrc, setSelectedImageSrc] = useState<string>('');
  const [urlInput, setUrlInput] = useState<string>('');
  
  // Crop & adjustment controls
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [filter, setFilter] = useState<'none' | 'bw' | 'warm' | 'bright'>('none');
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const positionStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Processing & feedback state
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Initialize or reset when modal opens
  useEffect(() => {
    if (isOpen) {
      const normalized = normalizeImageUrl(currentPhotoUrl);
      setSelectedImageSrc(normalized);
      setUrlInput(currentPhotoUrl.startsWith('/uploads/') ? '' : currentPhotoUrl);
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setFilter('none');
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsUploading(false);
      setIsSaving(false);
    }
  }, [isOpen, currentPhotoUrl]);

  if (!isOpen) return null;

  const roleTitle = 
    role === 'groom' 
      ? `Foto Mempelai Pria (${personName || 'Jaka'})`
      : role === 'bride'
      ? `Foto Mempelai Wanita (${personName || 'Dian'})`
      : 'Foto Berdua Pasangan (Preview WhatsApp & Medsos)';

  const aspectRatio = role === 'couple' ? 'aspect-square' : 'aspect-[3/4]';

  // Handle direct file selection from phone or desktop
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // 1. Direct Multipart upload to server - most reliable on Kiwi/mobile
      const formData = new FormData();
      formData.append('photo', file);

      const res = await fetch('/api/upload-file', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          setSelectedImageSrc(data.url);
          setSuccessMessage('Foto berhasil diunggah! Anda dapat menyesuaikan posisi dan filter sebelum menyimpan.');
          setIsUploading(false);
          // Reset adjusters
          setZoom(1);
          setRotation(0);
          setPosition({ x: 0, y: 0 });
          return;
        }
      }

      // Fallback: FileReader data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSelectedImageSrc(event.target.result as string);
          setSuccessMessage('Foto dimuat ke editor.');
          setIsUploading(false);
        }
      };
      reader.onerror = () => {
        setErrorMessage('Gagal membaca berkas gambar.');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);

    } catch (err: any) {
      console.error('File upload error:', err);
      setErrorMessage('Gagal memproses gambar: ' + (err.message || 'Kesalahan tidak terduga'));
      setIsUploading(false);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle downloading from external URL / Google Drive via server
  const handleDownloadFromUrl = async () => {
    if (!urlInput.trim()) {
      setErrorMessage('Silakan tempel tautan foto terlebih dahulu.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Gagal mengunduh gambar dari tautan.');
      }

      setSelectedImageSrc(data.url);
      setSuccessMessage('Foto dari tautan berhasil diambil dan disimpan!');
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    } catch (err: any) {
      console.error('Download url error:', err);
      setErrorMessage(err.message || 'Gagal memproses tautan foto.');
    } finally {
      setIsUploading(false);
    }
  };

  // Preset photos
  const handleSelectPreset = (url: string) => {
    setSelectedImageSrc(url);
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setErrorMessage(null);
    setSuccessMessage('Preset foto dipilih.');
  };

  // Pan / Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    positionStartRef.current = { ...position };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPosition({
      x: positionStartRef.current.x + dx,
      y: positionStartRef.current.y + dy,
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers for mobile / Kiwi Browser
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      dragStartRef.current = { x: touch.clientX, y: touch.clientY };
      positionStartRef.current = { ...position };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartRef.current.x;
    const dy = touch.clientY - dragStartRef.current.y;
    setPosition({
      x: positionStartRef.current.x + dx,
      y: positionStartRef.current.y + dy,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Generate adjusted canvas and export to final server URL
  const handleSaveCroppedImage = async () => {
    if (!selectedImageSrc) {
      setErrorMessage('Pilih atau unggah foto terlebih dahulu.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      // If no transformations or filters were applied and it's already a clean local /uploads URL or good URL, save directly
      const hasTransform = zoom !== 1 || rotation !== 0 || position.x !== 0 || position.y !== 0 || filter !== 'none';
      
      if (!hasTransform && selectedImageSrc.startsWith('/uploads/')) {
        await onSavePhoto(role, selectedImageSrc);
        setSuccessMessage('Foto berhasil disimpan!');
        setTimeout(() => onClose(), 600);
        return;
      }

      // Render adjusted canvas
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = selectedImageSrc;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Gagal memuat gambar untuk penyesuaian.'));
      });

      // Target canvas dimensions
      const targetWidth = role === 'couple' ? 800 : 600;
      const targetHeight = role === 'couple' ? 800 : 800;

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context tidak didukung');

      // Apply filter
      if (filter === 'bw') {
        ctx.filter = 'grayscale(100%) contrast(1.1)';
      } else if (filter === 'warm') {
        ctx.filter = 'sepia(30%) saturate(1.2) brightness(1.05)';
      } else if (filter === 'bright') {
        ctx.filter = 'brightness(1.12) contrast(1.05)';
      }

      // Move to center
      ctx.translate(targetWidth / 2, targetHeight / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      // Scaling to cover
      const imgAspect = img.width / img.height;
      const targetAspect = targetWidth / targetHeight;
      let drawW = targetWidth;
      let drawH = targetHeight;

      if (imgAspect > targetAspect) {
        drawH = targetHeight;
        drawW = targetHeight * imgAspect;
      } else {
        drawW = targetWidth;
        drawH = targetWidth / imgAspect;
      }

      // Draw with offset
      const posX = position.x * (targetWidth / 300);
      const posY = position.y * (targetHeight / 300);
      ctx.drawImage(img, -drawW / 2 + posX, -drawH / 2 + posY, drawW, drawH);

      // Convert to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.9);
      });

      if (!blob) throw new Error('Gagal menghasilkan berkas gambar.');

      // Upload rendered blob via FormData to server
      const formData = new FormData();
      formData.append('photo', blob, `edited_${role}_${Date.now()}.jpg`);

      const uploadRes = await fetch('/api/upload-file', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Gagal menyimpan foto hasil edit ke server.');
      }

      const uploadData = await uploadRes.json();
      const finalUrl = uploadData.url;

      // Save to config
      await onSavePhoto(role, finalUrl);

      setSuccessMessage('Foto berhasil disimpan dan diperbarui!');
      setTimeout(() => {
        onClose();
      }, 700);

    } catch (err: any) {
      console.error('Error saving cropped image:', err);
      // If canvas failed due to CORS on external URL, attempt direct save if it's a URL
      if (selectedImageSrc && (selectedImageSrc.startsWith('http') || selectedImageSrc.startsWith('/'))) {
        try {
          await onSavePhoto(role, selectedImageSrc);
          setSuccessMessage('Foto berhasil disimpan!');
          setTimeout(() => onClose(), 600);
          return;
        } catch (saveErr) {
          console.error(saveErr);
        }
      }
      setErrorMessage(err.message || 'Gagal menyimpan perubahan foto.');
    } finally {
      setIsSaving(false);
    }
  };

  // Get CSS filter style for preview
  const getFilterStyle = () => {
    switch (filter) {
      case 'bw':
        return 'grayscale(100%) contrast(1.1)';
      case 'warm':
        return 'sepia(30%) saturate(1.2) brightness(1.05)';
      case 'bright':
        return 'brightness(1.12) contrast(1.05)';
      default:
        return 'none';
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl overflow-hidden flex flex-col my-auto max-h-[95vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-linear-to-r from-[#5797d0] to-[#ef72b4] text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-200" />
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">Edit & Ganti Foto</h3>
              <p className="text-[11px] text-white/90 leading-none mt-0.5">{roleTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Source Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/80 px-4 pt-2 gap-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-2 font-bold rounded-t-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-white text-[#5797d0] border-t-2 border-[#5797d0] shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Unggah dari HP / File</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`px-3 py-2 font-bold rounded-t-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'link'
                ? 'bg-white text-[#ef72b4] border-t-2 border-[#ef72b4] shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Link Google Drive / Web</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-2 font-bold rounded-t-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'presets'
                ? 'bg-white text-emerald-700 border-t-2 border-emerald-600 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Pilihan Foto Lain</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          
          {/* Tab 1: Upload from Phone / PC */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="photo-file-picker"
              />

              <label
                htmlFor="photo-file-picker"
                className="w-full flex flex-col items-center justify-center p-5 border-2 border-dashed border-[#b8d5ee] hover:border-[#5797d0] bg-[#f8fbfe] hover:bg-[#eef6fc] rounded-xl cursor-pointer transition-all text-center group"
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-[#5797d0] animate-spin" />
                    <span className="text-xs font-bold text-[#2c5282]">Mengunggah foto...</span>
                  </div>
                ) : (
                  <>
                    <div className="w-11 h-11 rounded-full bg-white shadow-xs border border-[#b8d5ee] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <Camera className="w-5 h-5 text-[#5797d0]" />
                    </div>
                    <span className="text-xs font-bold text-[#2c5282]">
                      Ketuk untuk Memilih Foto dari Galeri / Kamera HP
                    </span>
                    <span className="text-[11px] text-gray-500 mt-1">
                      Mendukung JPG, PNG, WEBP, HEIC dari kamera handphone
                    </span>
                  </>
                )}
              </label>
            </div>
          )}

          {/* Tab 2: Google Drive / URL */}
          {activeTab === 'link' && (
            <div className="space-y-3 bg-pink-50/50 p-3.5 rounded-xl border border-pink-100">
              <label className="block text-xs font-bold text-[#b33771]">
                Tempel Link Foto (Google Drive atau URL Gambar Langsung):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://drive.google.com/file/d/... atau https://..."
                  className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-lg focus:border-[#ef72b4] outline-none bg-white font-mono"
                />
                <button
                  type="button"
                  onClick={handleDownloadFromUrl}
                  disabled={isUploading || !urlInput.trim()}
                  className="px-3.5 py-2 bg-[#ef72b4] hover:bg-[#d65d9e] disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5 transition-all shrink-0"
                >
                  {isUploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <DownloadIcon className="w-3.5 h-3.5" />
                  )}
                  <span>Ambil Foto</span>
                </button>
              </div>
              <p className="text-[11px] text-[#718096] leading-snug">
                💡 <strong>Tips Google Drive:</strong> Pastikan setelan berbagi file di Google Drive sudah dipilih ke <em>"Siapa saja yang memiliki link"</em> (Anyone with the link).
              </p>
            </div>
          )}

          {/* Tab 3: Presets */}
          {activeTab === 'presets' && (
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-gray-700 block">Pilihan Foto Tersedia:</span>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSelectPreset('https://lh3.googleusercontent.com/d/1yuOkyDz_WIEKZHT-YAY2wE-0kVdL0VHJ')}
                  className="flex flex-col items-center p-2 rounded-xl border border-blue-200 hover:border-blue-400 bg-blue-50/50 cursor-pointer text-center"
                >
                  <img
                    src="https://lh3.googleusercontent.com/d/1yuOkyDz_WIEKZHT-YAY2wE-0kVdL0VHJ"
                    alt="Foto Jaka"
                    className="w-12 h-14 object-cover rounded-md mb-1 border border-gray-200"
                  />
                  <span className="text-[10px] font-bold text-[#2b5783]">Foto Jaka (Drive)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPreset('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80')}
                  className="flex flex-col items-center p-2 rounded-xl border border-pink-200 hover:border-pink-400 bg-pink-50/50 cursor-pointer text-center"
                >
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
                    alt="Foto Dian"
                    className="w-12 h-14 object-cover rounded-md mb-1 border border-gray-200"
                  />
                  <span className="text-[10px] font-bold text-[#b33771]">Foto Dian (Bawaan)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPreset('/couple-photo.jpg')}
                  className="flex flex-col items-center p-2 rounded-xl border border-amber-200 hover:border-amber-400 bg-amber-50/50 cursor-pointer text-center"
                >
                  <img
                    src="/couple-photo.jpg"
                    alt="Foto Pasangan"
                    className="w-12 h-14 object-cover rounded-md mb-1 border border-gray-200"
                  />
                  <span className="text-[10px] font-bold text-amber-800">Foto Pasangan</span>
                </button>
              </div>
            </div>
          )}

          {/* Live Cropping & Positioning Stage */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#5797d0]" />
                Pratinjau & Atur Posisi Foto
              </span>
              <span className="text-[10px] text-gray-500 flex items-center gap-1">
                <Move className="w-3 h-3 text-gray-400" /> Geser foto untuk memusatkan wajah
              </span>
            </div>

            {/* Canvas / Image Stage */}
            <div className="flex items-center justify-center py-2">
              <div 
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={`relative w-48 sm:w-56 ${aspectRatio} rounded-lg overflow-hidden border-4 border-white shadow-md bg-gray-200 select-none cursor-grab active:cursor-grabbing flex items-center justify-center`}
              >
                {selectedImageSrc ? (
                  <img
                    ref={imgRef}
                    src={selectedImageSrc}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    style={{
                      transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                      filter: getFilterStyle(),
                      transformOrigin: 'center center',
                    }}
                    className="max-w-none w-full h-full object-cover pointer-events-none transition-filter duration-200"
                  />
                ) : (
                  <span className="text-xs text-gray-400">Belum ada foto</span>
                )}

                {/* Framing Overlay Hint */}
                <div className="absolute inset-0 pointer-events-none border border-black/10 rounded-xs" />
              </div>
            </div>

            {/* Adjustment Controls (Zoom, Rotate, Reset) */}
            <div className="space-y-3 mt-3 pt-3 border-t border-gray-200/80">
              {/* Zoom Control */}
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-gray-600 w-12 shrink-0">Zoom:</span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(2))))}
                  className="p-1 rounded-md bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 cursor-pointer"
                  title="Perkecil"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <input
                  type="range"
                  min="0.6"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-[#5797d0] cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, Number((z + 0.1).toFixed(2))))}
                  className="p-1 rounded-md bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 cursor-pointer"
                  title="Perbesar"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono text-gray-500 w-10 text-right">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              {/* Rotate and Reset Row */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="px-2.5 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-xs font-semibold text-gray-700 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-[#5797d0]" />
                    <span>Putar 90°</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setZoom(1);
                      setRotation(0);
                      setPosition({ x: 0, y: 0 });
                      setFilter('none');
                    }}
                    className="px-2.5 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-xs font-semibold text-gray-700 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                    <span>Reset Posisi</span>
                  </button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-gray-500 font-semibold mr-1">Filter:</span>
                  <button
                    type="button"
                    onClick={() => setFilter('none')}
                    className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer ${
                      filter === 'none' ? 'bg-[#5797d0] text-white' : 'bg-white border border-gray-200 text-gray-700'
                    }`}
                  >
                    Asli
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('bw')}
                    className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer ${
                      filter === 'bw' ? 'bg-[#5797d0] text-white' : 'bg-white border border-gray-200 text-gray-700'
                    }`}
                  >
                    Hitam Putih
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('warm')}
                    className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer ${
                      filter === 'warm' ? 'bg-[#5797d0] text-white' : 'bg-white border border-gray-200 text-gray-700'
                    }`}
                  >
                    Hangat
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold cursor-pointer transition-all"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSaveCroppedImage}
            disabled={isSaving || !selectedImageSrc}
            className="px-5 py-2.5 rounded-xl bg-linear-to-r from-[#5797d0] to-[#ef72b4] hover:opacity-95 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Menyimpan Foto ke Server...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Simpan Foto Ini Sekarang</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

function DownloadIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
