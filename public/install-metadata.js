(() => {
  // Browsers install the first rel="manifest" link. The public document already
  // declares one, so retarget it instead of appending a second link.
  const isFocusApp = window.location.pathname.replace(/\/+$/, '') === '/focus-app';
  let manifest = document.querySelector('link[rel="manifest"]');
  if (!manifest) {
    manifest = document.createElement('link');
    manifest.rel = 'manifest';
    document.head.appendChild(manifest);
  }
  manifest.href = isFocusApp ? '/focus.webmanifest' : '/manifest.webmanifest';

  if (isFocusApp) {
    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) appleTitle.content = 'MRLC Focus';
  }
})();
