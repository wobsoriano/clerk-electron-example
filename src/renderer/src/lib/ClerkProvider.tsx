import { InternalClerkProvider } from '@clerk/react/internal'
import { ui } from '@clerk/ui'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClerkInstance } from './createClerkInstance'

interface ClerkProviderProps {
  publishableKey: string
  children: ReactNode
}

export function ClerkProvider({ publishableKey, children }: ClerkProviderProps): React.JSX.Element {
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
    >
      {children}
    </InternalClerkProvider>
  )
}
