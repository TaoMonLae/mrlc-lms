declare global {
  interface Window {
    mrlcKiosk?: { readonly isActive?: () => boolean; readonly active?: boolean };
  }
}

export function isMrlcKiosk(): boolean {
  if (typeof window === 'undefined') return false;
  const marker = window.mrlcKiosk;
  return typeof marker?.isActive === 'function' ? marker.isActive() === true : marker?.active === true;
}
