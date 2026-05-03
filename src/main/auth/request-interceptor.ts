import { session } from 'electron'

const CLERK_URLS = ['https://*.clerk.accounts.dev/*', 'https://*.clerk.com/*']

export function setupClerkRequestInterception(): void {
  // Strip Origin so FAPI never gets Origin+Authorization together (mutual exclusion error).
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: CLERK_URLS },
    (details, callback) => {
      const headers = { ...details.requestHeaders }
      delete headers['Origin']
      delete headers['origin']
      callback({ requestHeaders: headers })
    }
  )

  // Patch CORS headers so the renderer (file:// origin) can read Clerk responses.
  session.defaultSession.webRequest.onHeadersReceived({ urls: CLERK_URLS }, (details, callback) => {
    const responseHeaders = { ...details.responseHeaders }
    responseHeaders['access-control-allow-origin'] = ['*']
    responseHeaders['access-control-allow-headers'] = ['*']
    responseHeaders['access-control-allow-methods'] = ['*']
    responseHeaders['access-control-expose-headers'] = ['Authorization']
    callback({ responseHeaders })
  })
}
