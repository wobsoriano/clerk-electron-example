import { createClerkBridge } from '@clerk/electron'
import { storage } from '@clerk/electron/storage'
import { join, sep } from 'path'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { app, BrowserWindow, net, protocol, session } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

const APP_PROTOCOL_SCHEME = 'clerk'
const APP_PROTOCOL_HOST = 'app'
const DEV_SERVER_URL = process.env['ELECTRON_RENDERER_URL']
const CLERK_FRONTEND_API_SOURCES = ['https://*.clerk.accounts.dev', 'https://*.clerk.com']
const CLERK_CHALLENGES_SOURCE = 'https://challenges.cloudflare.com'

function createContentSecurityPolicy(): string {
  const scriptSources = [
    "'self'",
    "'unsafe-inline'",
    ...CLERK_FRONTEND_API_SOURCES,
    CLERK_CHALLENGES_SOURCE
  ]
  const connectSources = ["'self'", ...CLERK_FRONTEND_API_SOURCES]

  if (DEV_SERVER_URL) {
    const devServer = new URL(DEV_SERVER_URL)
    const devWebSocketProtocol = devServer.protocol === 'https:' ? 'wss:' : 'ws:'
    const devWebSocketOrigin = `${devWebSocketProtocol}//${devServer.host}`

    scriptSources.push("'unsafe-eval'")
    connectSources.push(devServer.origin, devWebSocketOrigin)
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(' ')}`,
    `connect-src ${connectSources.join(' ')}`,
    "img-src 'self' https://img.clerk.com data:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' https: data:",
    "worker-src 'self' blob:",
    `frame-src 'self' ${CLERK_CHALLENGES_SOURCE} ${CLERK_FRONTEND_API_SOURCES.join(' ')}`,
    "form-action 'self'"
  ].join('; ')
}

function registerContentSecurityPolicy(): void {
  const contentSecurityPolicy = createContentSecurityPolicy()

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [contentSecurityPolicy]
      }
    })
  })
}

const clerk = createClerkBridge({
  storage: storage(),
  renderer: {
    scheme: APP_PROTOCOL_SCHEME,
    host: APP_PROTOCOL_HOST
  }
})

function registerAppProtocol(): void {
  const rendererRoot = path.resolve(__dirname, '../renderer')

  protocol.handle(APP_PROTOCOL_SCHEME, async (request) => {
    const url = new URL(request.url)

    if (url.host !== APP_PROTOCOL_HOST) {
      return new Response(null, { status: 404 })
    }

    if (DEV_SERVER_URL) {
      const target = new URL(url.pathname + url.search, DEV_SERVER_URL)
      const init: RequestInit = { method: request.method }

      if (request.method !== 'GET' && request.method !== 'HEAD') {
        init.body = request.body
        ;(init as RequestInit & { duplex: 'half' }).duplex = 'half'
      }

      try {
        return await net.fetch(target.toString(), init)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error('[clerk-electron:app-protocol] dev proxy failed', {
          requested: request.url,
          target: target.toString(),
          error: message
        })
        return new Response(`clerk://app dev proxy error: ${message}`, { status: 502 })
      }
    }

    const requestedPath = decodeURIComponent(url.pathname)
    const resolvedPath = path.resolve(rendererRoot, `.${requestedPath}`)

    if (resolvedPath !== rendererRoot && !resolvedPath.startsWith(rendererRoot + sep)) {
      return new Response(null, { status: 403 })
    }

    const hasExtension = /\.[^/]+$/.test(url.pathname)
    const filePath = hasExtension ? resolvedPath : path.join(rendererRoot, 'index.html')

    return net.fetch(pathToFileURL(filePath).toString())
  })
}

// Keep the demo app single-instance so deep-link callbacks always resume in the same window.
if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

if (process.defaultApp && process.argv.length >= 2) {
  app.setAsDefaultProtocolClient(APP_PROTOCOL_SCHEME, process.execPath, [
    path.resolve(process.argv[1])
  ])
}

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

  mainWindow.loadURL(`${APP_PROTOCOL_SCHEME}://${APP_PROTOCOL_HOST}/`)
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerAppProtocol()
  registerContentSecurityPolicy()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    clerk.cleanup()
    app.quit()
  }
})
