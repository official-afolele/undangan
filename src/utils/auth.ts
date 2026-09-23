/**
 * Authentication and password helper for Wedding Admin Panel
 * Handles resilient cross-browser, cross-device, and mobile-friendly validation.
 */

export const DEFAULT_ADMIN_PASSWORD = 'jakadian2026';
export const ADMIN_AUTH_STORAGE_KEY = 'wedding_admin_authenticated';
export const ADMIN_PASSWORD_STORAGE_KEY = 'wedding_admin_password';

/**
 * Strips accidental mobile keyboard artifacts:
 * - Leading/trailing spaces
 * - Invisible zero-width spaces (\u200B-\u200D, \uFEFF) often copied from WhatsApp/chat
 * - Normalizes Unicode
 */
export const cleanPasswordString = (str?: string): string => {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '') // remove zero-width & non-breaking spaces
    .trim();
};

/**
 * Robust password validation that accommodates:
 * 1. Exact match with custom password
 * 2. Case-insensitive match with custom password (in case mobile auto-capitalizes first letter)
 * 3. Master default password 'jakadian2026' (both exact and case-insensitive)
 * 4. Friendly name variations ('jakadian', 'jaka dian', 'jaka&dian')
 */
export const validateAdminPassword = (
  entered: string,
  customPassword?: string
): boolean => {
  const cleanEntered = cleanPasswordString(entered);
  if (!cleanEntered) return false;

  const lowerEntered = cleanEntered.toLowerCase();
  const defaultLower = DEFAULT_ADMIN_PASSWORD.toLowerCase();
  const cleanCustom = cleanPasswordString(customPassword);
  const customLower = cleanCustom.toLowerCase();

  // 1. Exact match with custom password
  if (cleanCustom && cleanEntered === cleanCustom) {
    return true;
  }

  // 2. Case-insensitive match with custom password
  if (customLower && lowerEntered === customLower) {
    return true;
  }

  // 3. Exact or case-insensitive match with default master password
  if (lowerEntered === defaultLower) {
    return true;
  }

  // 4. Also permit wedding couple slug variations
  if (
    lowerEntered === 'jakadian' ||
    lowerEntered === 'jaka dian' ||
    lowerEntered === 'jaka&dian' ||
    lowerEntered === 'jaka-dian'
  ) {
    return true;
  }

  return false;
};

/**
 * Checks whether user has an active authenticated admin session in localStorage or sessionStorage.
 * Safe against Safari Private Mode QuotaExceededError.
 */
export const checkStoredAuth = (): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    const sessionVal = sessionStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
    if (sessionVal === 'true') return true;
  } catch {
    // ignore restricted storage
  }

  try {
    const localVal = localStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
    if (localVal === 'true') return true;
  } catch {
    // ignore restricted storage
  }

  return false;
};

/**
 * Saves authenticated admin state safely.
 */
export const saveAdminAuth = (rememberMe: boolean): void => {
  if (typeof window === 'undefined') return;

  try {
    if (rememberMe) {
      localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, 'true');
      sessionStorage.setItem(ADMIN_AUTH_STORAGE_KEY, 'true');
    } else {
      sessionStorage.setItem(ADMIN_AUTH_STORAGE_KEY, 'true');
      try {
        localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  } catch (err) {
    console.warn('Storage write error (private browsing mode):', err);
  }
};

/**
 * Clears authenticated admin state.
 */
export const clearAdminAuth = (): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
  } catch {
    // ignore
  }
  try {
    sessionStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
  } catch {
    // ignore
  }
};
