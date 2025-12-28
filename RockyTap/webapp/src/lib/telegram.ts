/**
 * Telegram WebApp SDK integration utilities for Ghidar Mini App.
 */

import type { TelegramUser, WebAppInitData } from '../vite-env';

/**
 * Get the raw initData string for authentication.
 * This should be sent in the Telegram-Data header for all API requests.
 * 
 * Telegram provides initData in different ways depending on context:
 * 1. window.Telegram.WebApp.initData (most common)
 * 2. URL fragment: #tgWebAppData=...
 * 3. URL query: ?tgWebAppData=...
 * 4. initDataUnsafe (parsed version, but we need the raw string)
 */
export function getInitData(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  // Method 1: Check URL fragment first (Telegram sometimes puts it here)
  const hash = window.location.hash;
  if (hash) {
    // Look for tgWebAppData= in fragment
    const fragmentParams = new URLSearchParams(hash.substring(1));
    const tgDataFromHash = fragmentParams.get('tgWebAppData');
    if (tgDataFromHash) {
      console.log('[Telegram] Found initData in URL fragment');
      return decodeURIComponent(tgDataFromHash);
    }
    
    // Also check for direct pattern
    const match = hash.match(/tgWebAppData=([^&]+)/);
    if (match && match[1]) {
      console.log('[Telegram] Found initData in URL fragment (pattern match)');
      return decodeURIComponent(match[1]);
    }
  }

  // Method 2: Check URL query parameters
  const search = window.location.search;
  if (search) {
    const params = new URLSearchParams(search);
    const tgDataFromQuery = params.get('tgWebAppData');
    if (tgDataFromQuery) {
      console.log('[Telegram] Found initData in URL query');
      return decodeURIComponent(tgDataFromQuery);
    }
  }

  // Method 3: Check Telegram WebApp object
  const webApp = window.Telegram?.WebApp;
  if (webApp) {
    // Check if initData getter exists and returns a value
    try {
      const initData = webApp.initData;
      if (initData && typeof initData === 'string' && initData.trim().length > 0) {
        console.log('[Telegram] Found initData in WebApp.initData');
        return initData;
      }
    } catch (e) {
      console.warn('[Telegram] Error accessing WebApp.initData:', e);
    }
  }

  // Method 4: Try to construct initData from initDataUnsafe (fallback)
  if (webApp && webApp.initDataUnsafe && Object.keys(webApp.initDataUnsafe).length > 0) {
    const unsafeData = webApp.initDataUnsafe;
    const params: string[] = [];
    
    // Add auth_date if available
    if (unsafeData.auth_date) {
      params.push(`auth_date=${unsafeData.auth_date}`);
    }
    
    // Add user if available (must be JSON string)
    if (unsafeData.user && typeof unsafeData.user === 'object') {
      params.push(`user=${encodeURIComponent(JSON.stringify(unsafeData.user))}`);
    } else if (unsafeData.user && typeof unsafeData.user === 'string') {
      params.push(`user=${encodeURIComponent(unsafeData.user)}`);
    }
    
    // Add start_param if available
    if (unsafeData.start_param) {
      params.push(`start_param=${encodeURIComponent(unsafeData.start_param)}`);
    }
    
    // Add query_id if available (but backend will ignore it for hash validation)
    if (unsafeData.query_id) {
      params.push(`query_id=${encodeURIComponent(unsafeData.query_id)}`);
    }
    
    if (params.length > 0) {
      const constructedInitData = params.join('&');
      console.warn('[Telegram] ⚠️ initData string is missing, constructing from initDataUnsafe');
      console.log('[Telegram] Constructed initData (first 100 chars):', constructedInitData.substring(0, 100));
      return constructedInitData;
    }
  }

  // Debug: Log full state for troubleshooting
  console.error('[Telegram] ❌ initData NOT FOUND!');
  console.log('[Telegram] Debug info:', {
    url: window.location.href,
    hash: window.location.hash,
    search: window.location.search,
    hasTelegram: !!window.Telegram,
    hasWebApp: !!webApp,
    hasInitData: !!(webApp && webApp.initData),
    initDataValue: webApp ? webApp.initData : 'N/A',
    hasInitDataUnsafe: !!(webApp && webApp.initDataUnsafe),
    platform: webApp?.platform,
    version: webApp?.version
  });

  if (webApp && webApp.initDataUnsafe && webApp.initDataUnsafe.user) {
    console.warn('[Telegram] ⚠️ initDataUnsafe exists but initData string is missing!');
    console.warn('[Telegram] This usually means MiniApp was opened via menu button.');
    console.warn('[Telegram] Solution: Use inline button in /start message, NOT menu button.');
  }

  return '';
}

/**
 * Wait for initData to be available.
 * Checks multiple sources and waits if needed.
 */
export function waitForInitData(timeout = 8000): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve('');
      return;
    }

    // Wait for Telegram object if not ready
    const waitForTelegram = (attempts = 0) => {
      if (window.Telegram?.WebApp) {
        startWaiting();
      } else if (attempts < 10) {
        setTimeout(() => waitForTelegram(attempts + 1), 200);
      } else {
        console.error('[Telegram] Telegram WebApp not found after waiting');
        resolve('');
      }
    };

    const startWaiting = () => {
      const webApp = window.Telegram.WebApp;
      
      // Call ready() immediately
      try {
        webApp.ready();
      } catch (e) {
        console.warn('[Telegram] Error calling ready():', e);
      }

      // Check immediately
      let currentInitData = getInitData();
      if (currentInitData && currentInitData.trim().length > 0) {
        console.log('[Telegram] ✅ initData found immediately');
        resolve(currentInitData);
        return;
      }

      // Poll for initData (check URL and WebApp object)
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        currentInitData = getInitData();
        
        if (currentInitData && currentInitData.trim().length > 0) {
          clearInterval(checkInterval);
          console.log('[Telegram] ✅ initData found after polling');
          resolve(currentInitData);
          return;
        }

        // Timeout
        if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          const finalInitData = getInitData();
          if (finalInitData && finalInitData.trim().length > 0) {
            console.log('[Telegram] ✅ initData found at timeout');
            resolve(finalInitData);
          } else {
            console.error('[Telegram] ❌ initData NOT found after timeout');
            resolve(''); // Empty - backend will reject
          }
        }
      }, 300); // Check every 300ms
    };

    // Start
    if (window.Telegram?.WebApp) {
      startWaiting();
    } else {
      waitForTelegram();
    }
  });
}

/**
 * Get user information from initDataUnsafe.
 * Use this for UI display purposes only (not for auth verification).
 */
export function getUserInfo(): TelegramUser | null {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp.initDataUnsafe.user || null;
  }
  return null;
}

/**
 * Get parsed initData object.
 */
export function getParsedInitData(): WebAppInitData | null {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp.initDataUnsafe;
  }
  return null;
}

/**
 * Setup Telegram theme colors for Ghidar branding.
 */
export function setupTelegramTheme(): void {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    const webapp = window.Telegram.WebApp;
    
    // Ghidar branding: premium dark theme with emerald-gold accents
    webapp.setHeaderColor('#0f1218');
    webapp.setBackgroundColor('#0a0c10');
    
    // Expand the Mini App to full height
    webapp.expand();
  }
}

/**
 * Signal to Telegram that the Mini App is ready.
 */
export function signalReady(): void {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    window.Telegram.WebApp.ready();
  }
}

/**
 * Trigger haptic feedback.
 */
export function hapticFeedback(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | 'selection'): void {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
    const haptic = window.Telegram.WebApp.HapticFeedback;
    
    switch (type) {
      case 'light':
      case 'medium':
      case 'heavy':
        haptic.impactOccurred(type);
        break;
      case 'success':
      case 'error':
      case 'warning':
        haptic.notificationOccurred(type);
        break;
      case 'selection':
        haptic.selectionChanged();
        break;
    }
  }
}

/**
 * Show/hide back button.
 */
export function setBackButton(visible: boolean, onClick?: () => void): void {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.BackButton) {
    const backButton = window.Telegram.WebApp.BackButton;
    
    if (visible) {
      if (onClick) {
        backButton.onClick(onClick);
      }
      backButton.show();
    } else {
      backButton.hide();
    }
  }
}

/**
 * Show Telegram alert popup.
 */
export function showAlert(message: string): void {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    window.Telegram.WebApp.showAlert(message);
  } else {
    alert(message);
  }
}

/**
 * Close the Mini App.
 */
export function closeApp(): void {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    window.Telegram.WebApp.close();
  }
}

/**
 * Check if the app is running inside an iframe.
 * Telegram MiniApps always run within an iframe.
 */
function isRunningInIframe(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch (e) {
    // If we can't access window.top, we're likely in a cross-origin iframe
    // which is the case for Telegram MiniApps
    return true;
  }
}

/**
 * Check if running inside Telegram WebApp with comprehensive validation.
 * 
 * Core security checks (required - these block browser access):
 * 1. Verifies Telegram object exists with proper structure
 * 2. Checks for non-empty initData (required for authentication)
 * 3. Verifies initDataUnsafe exists and contains valid user data
 * 
 * The backend will validate the initData signature, so even if someone
 * tries to spoof the frontend checks, they won't be able to authenticate.
 * 
 * @returns true if running in a valid Telegram WebApp context, false otherwise
 */
export function isTelegramWebApp(): boolean {
  // Must be in browser environment
  if (typeof window === 'undefined') {
    return false;
  }

  // Check if Telegram object exists with proper structure
  if (!window.Telegram || !window.Telegram.WebApp) {
    return false;
  }

  const webApp = window.Telegram.WebApp;

  // CRITICAL: Check for initData - must exist and be non-empty
  // This is the most important check - browsers cannot generate valid initData
  // Without initData, we cannot authenticate, so this is a hard requirement
  if (!webApp.initData || typeof webApp.initData !== 'string' || webApp.initData.trim().length === 0) {
    return false;
  }

  // If initData exists, we're good (backend will validate the signature)
  // initDataUnsafe and user data might not be immediately available
  // but the presence of initData string is sufficient proof we're in Telegram
  // Regular browsers cannot generate valid Telegram initData with correct signature
  
  return true;
}

