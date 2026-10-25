'use strict';
const { contextBridge, ipcRenderer } = require('electron');

// The launcher page gets a few fixed actions; it never receives Node or arbitrary IPC access.
contextBridge.exposeInMainWorld('launcher', {
  info: () => ipcRenderer.invoke('launcher:info'),
  status: () => ipcRenderer.invoke('launcher:status'),
  news: language => ipcRenderer.invoke('launcher:news', language),
  play: () => ipcRenderer.send('launcher:play'),
  open: link => ipcRenderer.send('launcher:open', link),
  onUpdate: callback => ipcRenderer.on('launcher:update', (_, notice) => callback(notice)),
});
