// Registers the service worker for PWA install + offline app shell.
// Safe in dev: the SW bypasses the Vite/HMR pipeline (see public/sw.js).
export function registerServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    // Was a SW already controlling this page before we (re)registered?
    const hadController = !!navigator.serviceWorker.controller;

    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Service worker registration failed:', err);
    });

    // When an updated SW takes control, reload once to pick up new assets.
    // Skip the very first install (no prior controller) to avoid a needless reload.
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}
