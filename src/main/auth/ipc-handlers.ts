import { ipcMain, shell } from 'electron'
import { getToken, saveToken, clearToken } from './token-store'
import { armFocusCancellation, prepareDeepLinkRedirect } from './deeplink-handler'
import { AUTH_CHANNELS } from './types'

export function setupAuthIpcHandlers(): void {
  ipcMain.handle(AUTH_CHANNELS.TOKEN_GET, (_event, key: string) => getToken(key))
  ipcMain.handle(AUTH_CHANNELS.TOKEN_SAVE, (_event, key: string, value: string) =>
    saveToken(key, value)
  )
  ipcMain.handle(AUTH_CHANNELS.TOKEN_CLEAR, (_event, key: string) => clearToken(key))
  ipcMain.handle(AUTH_CHANNELS.SSO_PREPARE, () => {
    console.log('[clerk-electron:sso] IPC prepare')
    const redirectUrl = prepareDeepLinkRedirect()
    console.log('[clerk-electron:sso] IPC prepare resolved', { redirectUrl })
    return redirectUrl
  })

  ipcMain.handle(AUTH_CHANNELS.SSO_OPEN, async (_event, url: unknown) => {
    console.log('[clerk-electron:sso] IPC open requested', { url })

    if (typeof url !== 'string') {
      throw new TypeError('Refusing to open non-string SSO URL')
    }

    const parsedUrl = new URL(url)
    console.log('[clerk-electron:sso] IPC open parsed URL', {
      href: parsedUrl.href,
      origin: parsedUrl.origin,
      pathname: parsedUrl.pathname,
      search: parsedUrl.search
    })

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new TypeError(`Refusing to open unsupported SSO URL protocol: ${parsedUrl.protocol}`)
    }

    // Arm before opening so the focus/blur listeners are in place for the upcoming app blur.
    armFocusCancellation()

    await shell.openExternal(parsedUrl.toString())
    console.log('[clerk-electron:sso] IPC openExternal completed', { url: parsedUrl.toString() })
  })
}
