import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const tokenCache = {
  getToken: (key: string): Promise<string | null> => ipcRenderer.invoke('token:get', key),
  saveToken: (key: string, value: string): Promise<void> =>
    ipcRenderer.invoke('token:save', key, value),
  clearToken: (key: string): Promise<void> => ipcRenderer.invoke('token:clear', key)
}

const sso = {
  // Prepares the loopback callback server and returns the whitelisted redirect URL.
  getRedirectUrl: (): Promise<string> => ipcRenderer.invoke('auth:sso:prepare'),
  // Opens the OAuth provider URL in the system browser.
  open: (url: string): void => ipcRenderer.send('auth:sso:open', url),
  // Registers a one-time callback for when the browser redirects back to loopback.
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
  // @ts-expect-error Electron injects the bridge when context isolation is disabled.
  window.electron = { ...electronAPI, tokenCache, sso }
}
