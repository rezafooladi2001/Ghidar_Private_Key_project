/**
 * Telegram WebApp SDK integration utilities for Ghidar Mini App.
 */

import type { TelegramUser, WebAppInitData } from '../vite-env';

// Cache the initData once we have it
let cachedInitData: string | null = null;

/**
 * Get the raw initData string for authentication.
 * This should be sent in the Telegram-Data header for all API requests.
 */
export function getInitData(): string {
  // Return cached value if available
  if (cachedInitData !== null) {
    return cachedInitData;
  }

  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    const initData = window.Telegram.WebApp.initData;
    if (initData) {
      // Cache the initData for future calls
      cachedInitData = initData;
      console.log('[Telegram] initData loaded successfully, length:', initData.length);
    }
    return initData || '';
  }
  return '';
}

/**
 * Wait for Telegram SDK to be fully initialized with initData.
 * This should be called before making any API calls.
 * 
 * @param maxWaitMs Maximum time to wait in milliseconds (default: 3000ms)
 * @param checkIntervalMs Interval between checks in milliseconds (default: 100ms)
 * @returns Promise that resolves to true if SDK is ready with initData, false otherwise
 */
export async function waitForTelegramSdk(maxWaitMs: number = 3000, checkIntervalMs: number = 100): Promise<boolean> {
  const startTime = Date.now();
  
  console.log('[Telegram] Waiting for SDK to be ready...');
  
  return new Promise((resolve) => {
    const checkSdk = () => {
      const elapsed = Date.now() - startTime;
      
      // Check if SDK is loaded with valid initData
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
        const initData = window.Telegram.WebApp.initData;
        if (initData && initData.length > 0) {
          // Cache it immediately
          cachedInitData = initData;
          console.log('[Telegram] SDK ready with initData after', elapsed, 'ms');
          resolve(true);
          return;
        }
      }
      
      // Check if we've exceeded the max wait time
      if (elapsed >= maxWaitMs) {
        console.warn('[Telegram] SDK timeout after', elapsed, 'ms. initData not available.');
        console.warn('[Telegram] window.Telegram exists:', !!window.Telegram);
        console.warn('[Telegram] window.Telegram.WebApp exists:', !!window.Telegram?.WebApp);
        console.warn('[Telegram] initData value:', window.Telegram?.WebApp?.initData || '(empty)');
        resolve(false);
        return;
      }
      
      // Continue checking
      setTimeout(checkSdk, checkIntervalMs);
    };
    
    // Start checking
    checkSdk();
  });
}

/**
 * Check if the Telegram SDK is ready with valid initData.
 * This is a synchronous check - use waitForTelegramSdk for async initialization.
 */
export function isSdkReady(): boolean {
  if (typeof window === 'undefined') return false;
  if (!window.Telegram?.WebApp) return false;
  const initData = window.Telegram.WebApp.initData;
  return typeof initData === 'string' && initData.length > 0;
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
 * Check if running inside Telegram WebApp.
 * Returns true only if Telegram SDK is available AND initData is a non-empty string.
 */
export function isTelegramWebApp(): boolean {
  if (typeof window === 'undefined') return false;
  if (!window.Telegram?.WebApp) return false;
  
  const initData = window.Telegram.WebApp.initData;
  // initData must be a non-empty string for valid Telegram context
  return typeof initData === 'string' && initData.length > 0;
}

/**
 * Check if Telegram SDK is loaded (but may not have valid initData).
 */
export function isTelegramSdkLoaded(): boolean {
  return typeof window !== 'undefined' && !!window.Telegram?.WebApp;
}

