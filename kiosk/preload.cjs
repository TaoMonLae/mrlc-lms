const { contextBridge } = require('electron');

// A marker only. The remote LMS receives no Node or Electron capability.
contextBridge.exposeInMainWorld('mrlcKiosk', Object.freeze({ active: true }));
