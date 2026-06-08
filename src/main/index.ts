import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import path from 'node:path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { setupAuthIpcHandlers } from './auth/ipc-handlers'
import { setupClerkRequestInterception } from './auth/request-interceptor'
import { PROTOCOL, isDeepLink, handleDeepLink } from './auth/deeplink-handler'

// Keep the demo app single-instance so deep-link callbacks always resume in the same window.
if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

// Register the custom protocol so the OS routes `clerk://` callbacks to this app.
if (process.defaultApp) {
  // Dev: electron is launched as `electron .`, so the entry script must be passed explicitly.
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL)
}

// macOS delivers the deep link via this event (whether the app was already running or cold-started).
app.on('open-url', (event, url) => {
  event.preventDefault()
  console.log('[clerk-electron:sso] app open-url event', { url })
  handleDeepLink(url)
})

// Windows/Linux deliver the deep link as argv to the existing instance via the single-instance lock.
app.on('second-instance', (_event, argv) => {
  console.log('[clerk-electron:sso] app second-instance event', { argv })
  const url = argv.find(isDeepLink)
  if (url) handleDeepLink(url)
})

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  setupClerkRequestInterception(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)
  setupAuthIpcHandlers()
  createWindow()

  // Windows/Linux cold start: the deep link arrives in the launch argv rather than via open-url.
  const coldStartUrl = process.argv.find(isDeepLink)
  if (coldStartUrl) {
    console.log('[clerk-electron:sso] app cold-start deep link', { url: coldStartUrl })
    handleDeepLink(coldStartUrl)
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
