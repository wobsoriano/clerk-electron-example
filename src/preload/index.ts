import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { ClerkRuntimeError } from '@clerk/shared/error'

const SSO_CALLBACK_TIMEOUT_MS = 30 * 1000

let cancelPendingRedirect: ((reason?: unknown) => void) | undefined

function logSSO(message: string, details?: Record<string, unknown>): void {
  console.log(`[clerk-electron:preload:sso] ${message}`, details ?? '')
}

const tokenCache = {
  getToken: (key: string): Promise<string | null> => ipcRenderer.invoke('token:get', key),
  saveToken: (key: string, value: string): Promise<void> =>
    ipcRenderer.invoke('token:save', key, value),
  clearToken: (key: string): Promise<void> => ipcRenderer.invoke('token:clear', key)
}

const sso = {
  // Arms the deep-link callback and returns the whitelisted custom-scheme redirect URL.
  getRedirectUrl: async (): Promise<string> => {
    logSSO('getRedirectUrl requested')
    const redirectUrl = await ipcRenderer.invoke('auth:sso:prepare')
    logSSO('getRedirectUrl resolved', { redirectUrl })
    return redirectUrl
  },
  // Opens the OAuth provider URL in the system browser.
  open: async (url: string): Promise<void> => {
    logSSO('openExternal requested', { url })
    await ipcRenderer.invoke('auth:sso:open', url)
    logSSO('openExternal resolved', { url })
  },
  // Registers a one-time callback for when the OS hands the deep link back to the app.
  onCallback: (cb: (url: string) => void): (() => void) => {
    logSSO('legacy callback listener armed')
    const listener = (_: Electron.IpcRendererEvent, url: string): void => {
      logSSO('legacy callback listener received URL', { url })
      cb(url)
    }
    ipcRenderer.once('auth:sso:callback', listener)
    return () => {
      logSSO('legacy callback listener removed')
      ipcRenderer.removeListener('auth:sso:callback', listener)
    }
  }
}

function createNativeRedirectCancelledError(): ClerkRuntimeError {
  return new ClerkRuntimeError('Native redirect verification was cancelled or timed out.', {
    code: 'native_redirect_cancelled',
    longMessage: 'Verification was cancelled or timed out. Please try again.'
  })
}

const waitForRedirectCallback = (): Promise<string> => {
  logSSO('waitForRedirectCallback requested', {
    hadPendingRedirect: Boolean(cancelPendingRedirect)
  })
  cancelPendingRedirect?.(createNativeRedirectCancelledError())

  return new Promise((resolve, reject) => {
    const cleanup = (): void => {
      logSSO('waitForRedirectCallback cleanup')
      clearTimeout(timeout)
      ipcRenderer.removeListener('auth:sso:callback', listener)
      ipcRenderer.removeListener('auth:sso:cancelled', cancelledListener)
      cancelPendingRedirect = undefined
    }
    const listener = (_: Electron.IpcRendererEvent, url: string): void => {
      logSSO('waitForRedirectCallback received URL', {
        url,
        params: Object.fromEntries(new URL(url).searchParams.entries())
      })
      cleanup()
      resolve(url)
    }
    // Main signals abandonment (e.g. the focus heuristic fired) so the renderer stops waiting
    // immediately instead of hanging until the timeout below.
    const cancelledListener = (): void => {
      logSSO('waitForRedirectCallback cancelled by main')
      cleanup()
      reject(createNativeRedirectCancelledError())
    }
    const timeout = setTimeout(() => {
      logSSO('waitForRedirectCallback timed out')
      cleanup()
      reject(createNativeRedirectCancelledError())
    }, SSO_CALLBACK_TIMEOUT_MS)
    cancelPendingRedirect = (reason?: unknown): void => {
      logSSO('waitForRedirectCallback cancelled', {
        reason: reason instanceof Error ? reason.message : String(reason)
      })
      cleanup()
      reject(reason)
    }

    ipcRenderer.once('auth:sso:callback', listener)
    ipcRenderer.once('auth:sso:cancelled', cancelledListener)
    logSSO('waitForRedirectCallback listener armed')
  })
}

function toUrlString(url: string | URL): string {
  return typeof url === 'string' ? url : url.toString()
}

const clerkElectron = {
  getRedirectUrl: sso.getRedirectUrl,
  openExternal: (url: string | URL): Promise<void> => sso.open(toUrlString(url)),
  waitForRedirectCallback
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', { ...electronAPI, tokenCache, sso })
    contextBridge.exposeInMainWorld('__clerk_internal_electron', clerkElectron)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error Electron injects the bridge when context isolation is disabled.
  window.electron = { ...electronAPI, tokenCache, sso }
  // @ts-expect-error Clerk reads this internal bridge from the renderer.
  window.__clerk_internal_electron = clerkElectron
}
