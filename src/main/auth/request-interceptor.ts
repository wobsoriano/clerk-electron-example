import { session } from 'electron'
import { parsePublishableKey } from '@clerk/shared/keys'

// Generic Clerk hosts, kept as a fallback alongside the instance-specific Frontend API host
// derived from the publishable key (which is what covers production custom domains).
const FALLBACK_CLERK_URLS = ['https://*.clerk.accounts.dev/*', 'https://*.clerk.com/*']

function resolveClerkUrls(publishableKey: string | undefined): string[] {
  const frontendApi = publishableKey ? parsePublishableKey(publishableKey)?.frontendApi : undefined
  // Dev: frontendApi is the `*.clerk.accounts.dev` host. Production: the custom domain
  // (e.g. `clerk.yourapp.com`), which the fallback patterns would otherwise miss.
  const urls = frontendApi
    ? [`https://${frontendApi}/*`, ...FALLBACK_CLERK_URLS]
    : FALLBACK_CLERK_URLS
  return [...new Set(urls)]
}

export function setupClerkRequestInterception(publishableKey?: string): void {
  const clerkUrls = resolveClerkUrls(publishableKey)

  // Strip Origin so FAPI never gets Origin+Authorization together (mutual exclusion error).
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: clerkUrls },
    (details, callback) => {
      const headers = { ...details.requestHeaders }
      delete headers['Origin']
      delete headers['origin']
      callback({ requestHeaders: headers })
    }
  )

  // Patch CORS headers so the renderer (file:// origin) can read Clerk responses.
  session.defaultSession.webRequest.onHeadersReceived({ urls: clerkUrls }, (details, callback) => {
    const responseHeaders = { ...details.responseHeaders }
    responseHeaders['access-control-allow-origin'] = ['*']
    responseHeaders['access-control-allow-headers'] = ['*']
    responseHeaders['access-control-allow-methods'] = ['*']
    responseHeaders['access-control-expose-headers'] = ['Authorization']
    callback({ responseHeaders })
  })
}
