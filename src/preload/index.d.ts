import { ElectronAPI } from '@electron-toolkit/preload'

interface TokenCache {
  getToken(key: string): Promise<string | null>
  saveToken(key: string, value: string): Promise<void>
  clearToken(key: string): Promise<void>
}

interface SSOBridge {
  getRedirectUrl(): Promise<string>
  open(url: string): Promise<void>
  onCallback(cb: (url: string) => void): () => void
}

interface ClerkElectronBridge {
  getRedirectUrl(): Promise<string>
  openExternal(url: string | URL): Promise<void>
  waitForRedirectCallback(): Promise<string>
}

declare global {
  interface Window {
    electron: ElectronAPI & { tokenCache: TokenCache; sso: SSOBridge }
    __clerk_internal_electron: ClerkElectronBridge
  }
}
