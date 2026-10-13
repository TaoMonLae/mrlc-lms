function parseLmsUrl(value, allowLocalhost = false) {
  const url = new URL(value);
  const local = allowLocalhost && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !local) throw new Error('The kiosk URL must use HTTPS');
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Use the LMS origin without a path, credentials, or query');
  return url.origin;
}

function isLmsUrl(value, origin) {
  try {
    const url = new URL(value);
    const localOrigin = new URL(origin);
    return url.origin === origin && (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(localOrigin.hostname)));
  } catch { return false; }
}

function isBlockedShortcut(input) {
  if (input.type !== 'keyDown') return false;
  const key = String(input.key || '').toLowerCase();
  if (key === 'f11' || key === 'f12') return true;
  if (input.alt && key === 'f4') return true;
  if ((input.control || input.meta) && ['w', 'q', 'n', 't', 'l', 'p', 'h', 'm', 'tab'].includes(key)) return true;
  if ((input.control || input.meta) && input.shift && ['i', 'j', 'c', 'escape'].includes(key)) return true;
  if (input.meta && input.alt && ['i', 'j', 'c', 'escape'].includes(key)) return true;
  if (input.alt && key === 'tab') return true;
  if (input.alt && ['escape', ' '].includes(key)) return true;
  return false;
}

function isReleasedStatus(value) {
  return value === 'RELEASED' || value === 'COMPLETED';
}

module.exports = { parseLmsUrl, isLmsUrl, isBlockedShortcut, isReleasedStatus };
