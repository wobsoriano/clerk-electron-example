import { InternalClerkProvider } from '@clerk/react/internal'
import { ui } from '@clerk/ui'
import type { ComponentType, ReactNode } from 'react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClerkInstance } from './createClerkInstance'

const InnerClerkProvider = InternalClerkProvider as unknown as ComponentType<
  Record<string, unknown> & { children?: ReactNode }
>

interface ClerkProviderProps {
  publishableKey: string
  children: ReactNode
}

export function ClerkProvider({ publishableKey, children }: ClerkProviderProps): React.JSX.Element {
  const clerk = useMemo(() => createClerkInstance(publishableKey), [publishableKey])
  const navigate = useNavigate()

  return (
    <InnerClerkProvider
      Clerk={clerk}
      ui={ui}
      publishableKey={publishableKey}
      standardBrowser={false}
      routerPush={(to: string) => navigate(to)}
      routerReplace={(to: string) => navigate(to, { replace: true })}
      signInUrl="/sign-in"
      afterSignInUrl="/"
      afterSignUpUrl="/"
    >
      {children}
    </InnerClerkProvider>
  )
}
