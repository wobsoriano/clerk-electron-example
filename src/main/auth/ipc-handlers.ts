import { ipcMain, shell } from 'electron'
import { getToken, saveToken, clearToken } from './token-store'
import { AUTH_CHANNELS } from './types'

export function setupAuthIpcHandlers(): void {
  ipcMain.handle(AUTH_CHANNELS.TOKEN_GET, (_event, key: string) => getToken(key))
  ipcMain.handle(AUTH_CHANNELS.TOKEN_SAVE, (_event, key: string, value: string) =>
    saveToken(key, value)
  )
  ipcMain.handle(AUTH_CHANNELS.TOKEN_CLEAR, (_event, key: string) => clearToken(key))

  ipcMain.on(AUTH_CHANNELS.SSO_OPEN, (_event, url: string) => {
    shell.openExternal(url)
  })
}
