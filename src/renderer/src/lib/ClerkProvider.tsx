import { InternalClerkProvider } from '@clerk/react/internal'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ui } from '@clerk/ui'
import { createClerkInstance } from './createClerkInstance'

interface ClerkProviderProps {
  publishableKey: string
  children: ReactNode
  __internal_clerkJSUrl?: string
  __internal_clerkUIUrl?: string
}

export function ClerkProvider({
  publishableKey,
  children,
  __internal_clerkJSUrl,
  __internal_clerkUIUrl
}: ClerkProviderProps): React.JSX.Element {
  const clerk = useMemo(() => createClerkInstance(publishableKey), [publishableKey])
  const navigate = useNavigate()

  return (
    <InternalClerkProvider
      Clerk={clerk}
      ui={ui}
      publishableKey={publishableKey}
      standardBrowser={false}
      routerPush={(to: string) => navigate(to)}
      routerReplace={(to: string) => navigate(to, { replace: true })}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      __internal_clerkJSUrl={__internal_clerkJSUrl}
      __internal_clerkUIUrl={__internal_clerkUIUrl}
    >
      {children}
    </InternalClerkProvider>
  )
}
