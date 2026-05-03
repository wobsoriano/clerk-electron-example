import { app, BrowserWindow } from 'electron'
import { resolve } from 'path'
import { AUTH_CHANNELS } from './types'

const SSO_PROTOCOL = 'clerk-electron'

export function registerProtocol(): void {
  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(SSO_PROTOCOL, process.execPath, [resolve(process.argv[1])])
  } else {
    app.setAsDefaultProtocolClient(SSO_PROTOCOL)
  }
}

function handleDeepLink(url: string): void {
  if (!url.startsWith(`${SSO_PROTOCOL}://sso-callback`)) return
  const mainWindow = BrowserWindow.getAllWindows()[0]
  mainWindow?.webContents.send(AUTH_CHANNELS.SSO_CALLBACK, url)
}

export function setupDeepLinkHandling(): void {
  app.on('open-url', (event, url) => {
    event.preventDefault()
    handleDeepLink(url)
  })

  app.on('second-instance', (_event, commandLine) => {
    const url = commandLine.find((arg) => arg.startsWith(`${SSO_PROTOCOL}://`))
    if (url) handleDeepLink(url)

    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}
