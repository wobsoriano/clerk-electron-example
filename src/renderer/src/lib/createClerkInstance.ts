import { Clerk } from '@clerk/clerk-js'

const CLERK_CLIENT_JWT_KEY = '__clerk_client_jwt'

let cached: { key: string; instance: InstanceType<typeof Clerk> } | null = null

interface ClerkInternalHooks {
  __internal_onBeforeRequest(
    cb: (req: { credentials?: RequestCredentials; url?: URL; headers?: Headers }) => Promise<void>
  ): void
  __internal_onAfterResponse(cb: (req: unknown, res: Response) => Promise<void>): void
}

export function createClerkInstance(publishableKey: string): InstanceType<typeof Clerk> {
  if (cached && cached.key === publishableKey) return cached.instance

  const clerk = new Clerk(publishableKey)
  const hooks = clerk as unknown as ClerkInternalHooks

  hooks.__internal_onBeforeRequest(async (req) => {
    req.credentials = 'omit'
    // Always flag as native so FAPI never requires browser cookies or Origin header.
    req.url?.searchParams.append('_is_native', '1')

    const jwt = await window.electron.tokenCache.getToken(CLERK_CLIENT_JWT_KEY)
    if (!jwt) return

    ;(req.headers as Headers).set('Authorization', `Bearer ${jwt}`)
  })

  hooks.__internal_onAfterResponse(async (_req, res) => {
    const header = res.headers.get('Authorization')
    if (header?.startsWith('Bearer ')) {
      const jwt = header.split(' ')[1]
      if (jwt) await window.electron.tokenCache.saveToken(CLERK_CLIENT_JWT_KEY, jwt)
    } else if (header) {
      await window.electron.tokenCache.saveToken(CLERK_CLIENT_JWT_KEY, header)
    }
  })

  cached = { key: publishableKey, instance: clerk }
  return clerk
}
