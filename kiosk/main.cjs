const path = require('node:path');
const { app, BrowserWindow, ipcMain, Menu, session } = require('electron');
const { lmsUrl } = require('./config.json');
const { parseLmsUrl, isLmsUrl, isBlockedShortcut } = require('./policy.cjs');
const { createSessionWatcher } = require('./session-watcher.cjs');

const origin = parseLmsUrl(process.env.MRLC_LMS_URL || lmsUrl, process.env.MRLC_KIOSK_ALLOW_LOCALHOST === '1');
let authorizedQuit = false;
let locked = false;
const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) { authorizedQuit = true; app.quit(); }

let window = null;
let browserSession = null;
let offline = false;

function unlockAndQuit() {
  if (authorizedQuit) return;
  authorizedQuit = true;
  locked = false;
  if (window && !window.isDestroyed()) {
    window.setAlwaysOnTop(false);
    window.setKiosk(false);
    window.setClosable(true);
    window.close();
  }
  app.quit();
}

function lockWindow() {
  if (locked || authorizedQuit || !window || window.isDestroyed()) return;
  locked = true;
  window.setKiosk(true);
  window.setAlwaysOnTop(true);
  window.setMinimizable(false);
  window.setClosable(false);
  window.webContents.send('mrlc-kiosk-state', true);
  window.focus();
}

async function showOffline() {
  if (!window || window.isDestroyed() || offline) return;
  offline = true;
  await window.loadFile(path.join(__dirname, 'offline.html')).catch(() => {});
}

async function loadLms() {
  if (!window || window.isDestroyed()) return;
  try {
    await window.loadURL(origin);
    offline = false;
  } catch {
    await showOffline();
  }
}

async function retryOffline() {
  if (!offline || !browserSession || authorizedQuit) return;
  try {
    const response = await browserSession.fetch(`${origin}/api/health`, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    if (response.ok) await loadLms();
  } catch { /* remain on the local reconnecting screen */ }
}

function createWindow() {
  browserSession = session.fromPartition('mrlc-kiosk', { cache: true });
  browserSession.setPermissionRequestHandler((contents, permission, callback, details) => {
    const requestingUrl = details?.requestingUrl || contents.getURL();
    callback(isLmsUrl(requestingUrl, origin) && ['media', 'fullscreen', 'automatic-fullscreen'].includes(permission));
  });
  browserSession.setPermissionCheckHandler((_contents, permission, requestingOrigin) =>
    isLmsUrl(requestingOrigin, origin) && ['media', 'fullscreen', 'automatic-fullscreen'].includes(permission));
  browserSession.on('will-download', (event) => event.preventDefault());

  Menu.setApplicationMenu(null);
  window = new BrowserWindow({
    title: 'MRLC LMS Kiosk', show: false, width: 1200, height: 800,
    minWidth: 800, minHeight: 600,
    autoHideMenuBar: true, backgroundColor: '#102942',
    webPreferences: {
      partition: 'mrlc-kiosk', preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false, contextIsolation: true, sandbox: true,
      webviewTag: false, devTools: false, spellcheck: true,
    },
  });
  window.once('ready-to-show', () => window.show());
  window.on('close', (event) => { if (locked && !authorizedQuit) event.preventDefault(); });
  window.on('leave-full-screen', () => { if (locked && !authorizedQuit) window.setKiosk(true); });
  window.on('leave-html-full-screen', () => { if (locked && !authorizedQuit) window.setKiosk(true); });
  window.webContents.on('before-input-event', (event, input) => {
    if (locked && isBlockedShortcut(input)) event.preventDefault();
  });
  window.webContents.on('did-finish-load', () => window.webContents.send('mrlc-kiosk-state', locked));
  window.webContents.on('will-navigate', (event, details) => {
    if (!isLmsUrl(details.url, origin)) event.preventDefault();
  });
  window.webContents.on('will-redirect', (event, details) => {
    if (!isLmsUrl(details.url, origin)) event.preventDefault();
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isLmsUrl(url, origin)) setImmediate(() => {
      if (window && !window.isDestroyed()) void window.loadURL(url).catch(() => {});
    });
    return { action: 'deny' };
  });
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());
  window.webContents.on('context-menu', (event) => event.preventDefault());
  window.webContents.on('render-process-gone', () => { if (!authorizedQuit) void loadLms(); });
  const watcher = createSessionWatcher({
    isLmsPage: () => !authorizedQuit && window && !window.isDestroyed() && isLmsUrl(window.webContents.getURL(), origin),
    readToken: () => window.webContents.executeJavaScript('sessionStorage.getItem("auth_token")', true),
    fetchCurrent: async (token) => {
      const response = await browserSession.fetch(`${origin}/api/focus/session`, {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(4000),
      });
      return response.ok ? response.json() : null;
    },
    fetchWatch: async (binding) => {
      const response = await browserSession.fetch(`${origin}/api/focus/watch`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(binding),
        cache: 'no-store', signal: AbortSignal.timeout(4000),
      });
      return response.ok ? response.json() : null;
    },
    onLock: lockWindow,
    onRelease: unlockAndQuit,
  });
  void loadLms();
  setInterval(() => void watcher.poll(), 5000);
  setInterval(() => void retryOffline(), 10_000);
}

app.on('before-quit', (event) => {
  if (locked && !authorizedQuit) {
    event.preventDefault();
    if (window && !window.isDestroyed()) window.focus();
  }
});
app.on('window-all-closed', () => { if (!locked) app.quit(); });
ipcMain.on('mrlc-kiosk-state:get', (event) => { event.returnValue = locked; });
app.on('second-instance', () => {
  if (window && !window.isDestroyed()) window.focus();
});
app.on('activate', () => {
  if (window && !window.isDestroyed()) window.focus();
});
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-attach-webview', (event) => event.preventDefault());
});

if (singleInstance) app.whenReady().then(createWindow);
