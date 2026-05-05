import { ElectronAPI } from '@electron-toolkit/preload'

interface TokenCache {
  getToken(key: string): Promise<string | null>
  saveToken(key: string, value: string): Promise<void>
  clearToken(key: string): Promise<void>
}

interface SSOBridge {
  getRedirectUrl(): Promise<string>
  authenticate(url: string): Promise<string | null>
}

declare global {
  interface Window {
    electron: ElectronAPI & { tokenCache: TokenCache; sso: SSOBridge }
  }
}
