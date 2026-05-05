import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const tokenCache = {
  getToken: (key: string): Promise<string | null> => ipcRenderer.invoke('token:get', key),
  saveToken: (key: string, value: string): Promise<void> => ipcRenderer.invoke('token:save', key, value),
  clearToken: (key: string): Promise<void> => ipcRenderer.invoke('token:clear', key)
}

const sso = {
  // Returns the callback scheme URL to register with Clerk as the redirect URL.
  getRedirectUrl: (): Promise<string> => Promise.resolve('clerk-electron://sso-callback'),
  // Opens a native OS auth session and resolves with the callback URL, or null if cancelled.
  authenticate: (url: string): Promise<string | null> =>
    ipcRenderer.invoke('auth:sso:authenticate', url)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', { ...electronAPI, tokenCache, sso })
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = { ...electronAPI, tokenCache, sso }
}
