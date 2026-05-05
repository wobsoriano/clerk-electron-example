import { ipcMain, BrowserWindow } from 'electron'
import { AuthSession, UserCancelledError } from 'electron-auth-session'
import { getToken, saveToken, clearToken } from './token-store'
import { AUTH_CHANNELS } from './types'

export function setupAuthIpcHandlers(): void {
  ipcMain.handle(AUTH_CHANNELS.TOKEN_GET, (_event, key: string) => getToken(key))
  ipcMain.handle(AUTH_CHANNELS.TOKEN_SAVE, (_event, key: string, value: string) =>
    saveToken(key, value)
  )
  ipcMain.handle(AUTH_CHANNELS.TOKEN_CLEAR, (_event, key: string) => clearToken(key))

  ipcMain.handle(AUTH_CHANNELS.SSO_AUTHENTICATE, async (event, url: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) throw new Error('No window found for SSO request')

    const session = new AuthSession({
      url,
      callbackScheme: 'clerk-electron',
      windowHandle: win.getNativeWindowHandle()
    })

    try {
      return await session.start()
    } catch (err) {
      if (err instanceof UserCancelledError) return null
      throw err
    }
  })
}
