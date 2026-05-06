import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const tokenCache = {
  getToken: (key: string): Promise<string | null> => ipcRenderer.invoke('token:get', key),
  saveToken: (key: string, value: string): Promise<void> => ipcRenderer.invoke('token:save', key, value),
  clearToken: (key: string): Promise<void> => ipcRenderer.invoke('token:clear', key)
}

const sso = {
  // Returns the static custom protocol redirect URL registered with Clerk.
  getRedirectUrl: (): Promise<string> => Promise.resolve('clerk-electron://sso-callback'),
  // Opens the OAuth provider URL in the system browser.
  open: (url: string): void => ipcRenderer.send('auth:sso:open', url),
  // Registers a one-time callback for when the OS deep link fires after OAuth.
  onCallback: (cb: (url: string) => void): (() => void) => {
    const listener = (_: Electron.IpcRendererEvent, url: string): void => cb(url)
    ipcRenderer.once('auth:sso:callback', listener)
    return () => ipcRenderer.removeListener('auth:sso:callback', listener)
  }
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
