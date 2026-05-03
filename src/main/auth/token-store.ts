import { safeStorage } from 'electron'
import Store from 'electron-store'

const store = new Store<Record<string, string>>({ name: 'clerk-tokens' })

export function getToken(key: string): string | null {
  const encrypted = store.get(key)
  if (!encrypted) return null
  try {
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
  } catch {
    return null
  }
}

export function saveToken(key: string, value: string): void {
  const encrypted = safeStorage.encryptString(value)
  store.set(key, encrypted.toString('base64'))
}

export function clearToken(key: string): void {
  store.delete(key)
}
