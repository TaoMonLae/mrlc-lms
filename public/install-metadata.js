(() => {
  const isFocusApp = window.location.pathname === '/focus-app';
  const manifest = document.querySelector('link[rel="manifest"]') || document.createElement('link');
  manifest.rel = 'manifest';
  manifest.href = isFocusApp ? '/focus.webmanifest' : '/manifest.webmanifest';
  if (!manifest.isConnected) document.head.appendChild(manifest);

  if (isFocusApp) {
    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) appleTitle.content = 'MRLC Focus';
  }
})();
