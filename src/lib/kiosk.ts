declare global {
  interface Window {
    mrlcKiosk?: { readonly active: boolean };
  }
}

export function isMrlcKiosk(): boolean {
  return typeof window !== 'undefined' && window.mrlcKiosk?.active === true;
}
