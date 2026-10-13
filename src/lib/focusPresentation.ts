import { isMrlcKiosk } from './kiosk';

export type FocusPresentationMode = 'KIOSK' | 'FULLSCREEN' | 'WEB_APP' | 'BROWSER';

export function getFocusPresentationMode(): FocusPresentationMode {
  if (isMrlcKiosk()) return 'KIOSK';
  if (document.fullscreenElement) return 'FULLSCREEN';
  if (window.matchMedia?.('(display-mode: standalone)').matches ||
      window.matchMedia?.('(display-mode: fullscreen)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true) return 'WEB_APP';
  return 'BROWSER';
}

export function canRequestFocusFullscreen(): boolean {
  return document.fullscreenEnabled && typeof document.documentElement.requestFullscreen === 'function';
}
