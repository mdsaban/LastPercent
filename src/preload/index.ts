import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI, AppState, AppAlert, UserPrefs, NotchPayload, UpdateStatus } from '../shared/types';

const api: ElectronAPI = {
  getState: () => ipcRenderer.invoke('get-state'),
  getPrefs: () => ipcRenderer.invoke('get-prefs'),
  setPrefs: (prefs) => ipcRenderer.invoke('set-prefs', prefs),

  onStateUpdate: (callback) => {
    const listener = (_: unknown, state: AppState) => callback(state);
    ipcRenderer.on('state-update', listener);
    return () => ipcRenderer.off('state-update', listener);
  },

  onAlert: (callback) => {
    const listener = (_: unknown, alert: AppAlert) => callback(alert);
    ipcRenderer.on('alert', listener);
    return () => ipcRenderer.off('alert', listener);
  },

  onNotchAlert: (callback) => {
    const listener = (_: unknown, payload: NotchPayload) => callback(payload);
    ipcRenderer.on('notch-alert', listener);
    return () => ipcRenderer.off('notch-alert', listener);
  },

  onNotchDismiss: (callback) => {
    ipcRenderer.on('notch-dismiss', callback);
    return () => ipcRenderer.off('notch-dismiss', callback);
  },

  onUpdateState: (callback) => {
    const listener = (_: unknown, state: UpdateStatus) => callback(state);
    ipcRenderer.on('update-state', listener);
    return () => ipcRenderer.off('update-state', listener);
  },

  installUpdate: () => ipcRenderer.invoke('install-update'),
  requestCharger: (toPeerId) => ipcRenderer.invoke('request-charger', toPeerId),
  openSettings: () => ipcRenderer.invoke('open-settings'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  showDropdown: () => ipcRenderer.invoke('show-dropdown'),
};

contextBridge.exposeInMainWorld('electron', api);
