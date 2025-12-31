/**
 * Telegram WebApp SDK integration utilities for Ghidar Mini App.
 */

import type { TelegramUser, WebAppInitData } from '../vite-env';

/**
 * Get the raw initData string for authentication.
 * This should be sent in the Telegram-Data header for all API requests.
 */
export function getInitData(): string {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp.initData;
  }
  return '';
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
 */
export function isTelegramWebApp(): boolean {
  return typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initData;
}

