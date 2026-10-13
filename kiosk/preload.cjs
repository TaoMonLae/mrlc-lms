const { contextBridge, ipcRenderer } = require('electron');

let active = ipcRenderer.sendSync('mrlc-kiosk-state:get') === true;
ipcRenderer.on('mrlc-kiosk-state', (_event, value) => {
  active = value === true;
  window.dispatchEvent(new Event('mrlc-kiosk-statechange'));
});

// Read-only state. The remote LMS receives no Node or Electron capability.
contextBridge.exposeInMainWorld('mrlcKiosk', Object.freeze({ isActive: () => active }));
