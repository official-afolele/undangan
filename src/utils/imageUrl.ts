/**
 * Utility to convert Google Drive and other cloud storage links
 * into high-performance embeddable image URLs with no-referrer support.
 */

export const normalizeImageUrl = (url?: string): string => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  // If already data URL, blob, or local path
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('/uploads/') || trimmed.startsWith('/')) {
    return trimmed;
  }

  // Dropbox support: change ?dl=0 to ?raw=1 for direct viewing
  if (trimmed.includes('dropbox.com')) {
    if (trimmed.includes('dl=0')) return trimmed.replace('dl=0', 'raw=1');
    if (!trimmed.includes('raw=1')) return trimmed.includes('?') ? `${trimmed}&raw=1` : `${trimmed}?raw=1`;
    return trimmed;
  }

  // Check if this is a Google Drive URL
  const isGoogleDrive =
    trimmed.includes('drive.google.com') ||
    trimmed.includes('drive.usercontent.google.com') ||
    trimmed.includes('docs.google.com');

  if (isGoogleDrive) {
    let fileId = '';

    // Pattern 1: /file/d/FILE_ID (with or without /view, ?, etc.)
    const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileDMatch && fileDMatch[1]) {
      fileId = fileDMatch[1];
    }

    // Pattern 2: /d/FILE_ID
    if (!fileId) {
      const dMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (dMatch && dMatch[1]) {
        fileId = dMatch[1];
      }
    }

    // Pattern 3: ?id=FILE_ID or &id=FILE_ID (e.g., /download?id=... or /uc?id=... or ?export=view&id=...)
    if (!fileId) {
      const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) {
        fileId = idMatch[1];
      }
    }

    // Pattern 4: /open?id=FILE_ID
    if (!fileId) {
      const openMatch = trimmed.match(/\/open\?id=([a-zA-Z0-9_-]+)/);
      if (openMatch && openMatch[1]) {
        fileId = openMatch[1];
      }
    }

    if (fileId) {
      // Use Google's direct web-embedding CDN endpoint
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }

  return trimmed;
};
