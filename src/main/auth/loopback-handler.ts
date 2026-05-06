import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http'
import { BrowserWindow } from 'electron'
import { AUTH_CHANNELS } from './types'

const LOOPBACK_HOST = '127.0.0.1'
const LOOPBACK_PORT = 45789
const CALLBACK_PATH = '/sso-callback'
const CALLBACK_TIMEOUT_MS = 3 * 60 * 1000

type PendingSSOState = {
  server: Server
  redirectUrl: string
  timeout: NodeJS.Timeout
  completed: boolean
}

let pendingSSO: PendingSSOState | null = null

function createCallbackPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sign-in complete</title>
    <style>
      :root { color-scheme: light dark; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #111827;
        color: #f9fafb;
      }
      main {
        max-width: 420px;
        padding: 24px;
        text-align: center;
      }
      h1 {
        margin: 0 0 12px;
        font-size: 24px;
      }
      p {
        margin: 0;
        line-height: 1.5;
        color: #d1d5db;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Sign-in complete</h1>
      <p>You can close this window and return to the app.</p>
    </main>
    <script>
      window.close();
    </script>
  </body>
</html>`
}

function getMainWindow(): BrowserWindow | undefined {
  return BrowserWindow.getAllWindows()[0]
}

function focusMainWindow(): void {
  const mainWindow = getMainWindow()
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  if (!mainWindow.isVisible()) mainWindow.show()
  mainWindow.focus()
}

function disposePendingSSO(): void {
  if (!pendingSSO) return
  clearTimeout(pendingSSO.timeout)
  pendingSSO.server.close()
  pendingSSO = null
}

function respond(
  response: ServerResponse,
  statusCode: number,
  body: string,
  contentType = 'text/plain'
): void {
  response.writeHead(statusCode, { 'Content-Type': contentType })
  response.end(body)
}

function completeSSOCallback(url: string, response: ServerResponse): void {
  if (!pendingSSO || pendingSSO.completed) {
    respond(response, 409, 'No sign-in attempt is waiting for a callback.')
    return
  }

  pendingSSO.completed = true
  getMainWindow()?.webContents.send(AUTH_CHANNELS.SSO_CALLBACK, url)
  focusMainWindow()
  respond(response, 200, createCallbackPage(), 'text/html; charset=utf-8')
  disposePendingSSO()
}

function handleCallbackRequest(request: IncomingMessage, response: ServerResponse): void {
  if (request.method !== 'GET') {
    respond(response, 405, 'Method not allowed.')
    return
  }

  const requestUrl = new URL(request.url ?? '/', `http://${LOOPBACK_HOST}:${LOOPBACK_PORT}`)
  if (requestUrl.pathname !== CALLBACK_PATH) {
    respond(response, 404, 'Not found.')
    return
  }

  completeSSOCallback(requestUrl.toString(), response)
}

export async function prepareLoopbackRedirect(): Promise<string> {
  disposePendingSSO()

  const redirectUrl = `http://${LOOPBACK_HOST}:${LOOPBACK_PORT}${CALLBACK_PATH}`

  const server = createServer((request, response) => {
    try {
      handleCallbackRequest(request, response)
    } catch {
      respond(response, 500, 'Sign-in callback failed.')
    }
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(LOOPBACK_PORT, LOOPBACK_HOST, () => {
      server.off('error', reject)
      resolve()
    })
  })

  const timeout = setTimeout(() => {
    disposePendingSSO()
  }, CALLBACK_TIMEOUT_MS)

  pendingSSO = {
    server,
    redirectUrl,
    timeout,
    completed: false
  }

  return redirectUrl
}
