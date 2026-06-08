import { BrowserWindow } from 'electron'
import { AUTH_CHANNELS } from './types'

// Custom protocol scheme registered with the OS. The exact callback URL (`clerk://sso-callback`)
// must be whitelisted under Redirect URLs in the Clerk Dashboard, since Clerk redirects the
// system browser to it directly after the OAuth flow completes.
export const PROTOCOL = 'clerk'
const CALLBACK_HOST = 'sso-callback'
const REDIRECT_URL = `${PROTOCOL}://${CALLBACK_HOST}`
const CALLBACK_TIMEOUT_MS = 3 * 60 * 1000
// How long the app must stay focused (after the user returns to it) with no deep link arriving
// before we treat the external flow as abandoned. Long enough to absorb a quick glance back at the
// app; returning to the browser (blur) within this window aborts the cancellation entirely.
const FOCUS_CANCEL_GRACE_MS = 2000

type PendingSSOState = {
  timeout: NodeJS.Timeout
  redirectUrl: string
}

type FocusCancellation = {
  focusListener: () => void
  blurListener: () => void
  graceTimeout: NodeJS.Timeout | null
}

let pendingSSO: PendingSSOState | null = null
let focusCancellation: FocusCancellation | null = null

function logDeepLink(message: string, details?: Record<string, unknown>): void {
  console.log(`[clerk-electron:sso] ${message}`, details ?? '')
}

function getDeepLinkDebugInfo(url: string): Record<string, unknown> {
  try {
    const parsedUrl = new URL(url)

    return {
      href: parsedUrl.href,
      protocol: parsedUrl.protocol,
      host: parsedUrl.host,
      pathname: parsedUrl.pathname,
      search: parsedUrl.search,
      params: Object.fromEntries(parsedUrl.searchParams.entries()),
      hasPendingSSO: Boolean(pendingSSO)
    }
  } catch (error) {
    return {
      rawUrl: url,
      hasPendingSSO: Boolean(pendingSSO),
      parseError: error instanceof Error ? error.message : String(error)
    }
  }
}

export function isDeepLink(url: string): boolean {
  return url.startsWith(`${PROTOCOL}://`)
}

function teardownFocusCancellation(): void {
  if (!focusCancellation) return
  const mainWindow = getMainWindow()
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.removeListener('focus', focusCancellation.focusListener)
    mainWindow.removeListener('blur', focusCancellation.blurListener)
  }
  if (focusCancellation.graceTimeout) clearTimeout(focusCancellation.graceTimeout)
  focusCancellation = null
}

function disposePendingSSO(): void {
  if (!pendingSSO) return
  logDeepLink('disposing pending SSO callback', { redirectUrl: pendingSSO.redirectUrl })
  clearTimeout(pendingSSO.timeout)
  pendingSSO = null
  teardownFocusCancellation()
}

function getMainWindow(): BrowserWindow | undefined {
  return BrowserWindow.getAllWindows()[0]
}

// Notifies the renderer that the external flow was abandoned so it can stop waiting (and clear the
// button spinner) instead of hanging until the long callback timeout.
function cancelPendingSSO(reason: string): void {
  if (!pendingSSO) return
  logDeepLink('cancelling pending SSO callback', { reason, redirectUrl: pendingSSO.redirectUrl })
  disposePendingSSO()
  getMainWindow()?.webContents.send(AUTH_CHANNELS.SSO_CANCELLED)
}

// Arms a focus-based cancellation heuristic for an in-progress external (system browser) flow.
//
// The system browser gives us no signal when the user closes the OAuth tab (per RFC 8252 we use an
// external user-agent, so the tab lifecycle is invisible to us). As a heuristic, if the user returns
// to the app and it stays focused for the grace period without a deep link arriving, we treat the
// flow as abandoned. Switching back to the browser (blur) during the grace aborts the cancellation,
// so briefly checking the app mid-login does not cancel a live flow.
export function armFocusCancellation(): void {
  teardownFocusCancellation()
  const mainWindow = getMainWindow()
  if (!mainWindow) return

  const clearGrace = (): void => {
    if (focusCancellation?.graceTimeout) {
      clearTimeout(focusCancellation.graceTimeout)
      focusCancellation.graceTimeout = null
    }
  }

  const focusListener = (): void => {
    if (!pendingSSO || !focusCancellation) return
    clearGrace()
    focusCancellation.graceTimeout = setTimeout(() => {
      cancelPendingSSO('app refocused without a callback')
    }, FOCUS_CANCEL_GRACE_MS)
  }

  const blurListener = (): void => {
    // The user went back to the external browser; the flow may still complete, so do not cancel.
    clearGrace()
  }

  focusCancellation = { focusListener, blurListener, graceTimeout: null }
  mainWindow.on('focus', focusListener)
  mainWindow.on('blur', blurListener)
  logDeepLink('focus cancellation armed', { graceMs: FOCUS_CANCEL_GRACE_MS })
}

function focusMainWindow(): void {
  const mainWindow = getMainWindow()
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  if (!mainWindow.isVisible()) mainWindow.show()
  mainWindow.focus()
}

// Arms the deep-link callback and returns the static redirect URL to hand to Clerk. There is no
// port to allocate; the pending guard ensures stray deep links are ignored unless a sign-in is
// actually in progress.
export function prepareDeepLinkRedirect(): string {
  logDeepLink('prepare requested', {
    redirectUrl: REDIRECT_URL,
    hadPendingSSO: Boolean(pendingSSO)
  })
  disposePendingSSO()

  const timeout = setTimeout(() => {
    logDeepLink('pending SSO callback timed out', { redirectUrl: REDIRECT_URL })
    disposePendingSSO()
  }, CALLBACK_TIMEOUT_MS)

  pendingSSO = { timeout, redirectUrl: REDIRECT_URL }
  logDeepLink('pending SSO callback armed', { redirectUrl: REDIRECT_URL })

  return REDIRECT_URL
}

// Invoked by the OS deep-link events in index.ts. Forwards the callback URL (carrying the
// rotating_token_nonce) to the renderer over IPC, then brings the app to the foreground.
export function handleDeepLink(url: string): void {
  logDeepLink('deep link received', getDeepLinkDebugInfo(url))

  if (!isDeepLink(url)) {
    logDeepLink('deep link ignored: unsupported protocol', getDeepLinkDebugInfo(url))
    return
  }

  if (!pendingSSO) {
    logDeepLink('deep link ignored: no pending SSO callback', getDeepLinkDebugInfo(url))
    return
  }

  disposePendingSSO()
  logDeepLink('forwarding deep link to renderer', getDeepLinkDebugInfo(url))
  getMainWindow()?.webContents.send(AUTH_CHANNELS.SSO_CALLBACK, url)
  focusMainWindow()
}
