import { useClerk } from '@clerk/react'
import { OAUTH_PROVIDERS } from '@clerk/shared/oauth'
import type { OAuthStrategy } from '@clerk/shared/types'

const oauthNameByStrategy = Object.fromEntries(OAUTH_PROVIDERS.map((p) => [p.strategy, p.name]))

export type SocialProvider = {
  strategy: OAuthStrategy
  name: string
}

export function useEnabledSocialProviders(): SocialProvider[] {
  const clerk = useClerk()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userSettings = (clerk as any).__internal_environment?.userSettings
  const strategies: OAuthStrategy[] = userSettings?.authenticatableSocialStrategies ?? []

  return strategies.map((strategy) => ({
    strategy,
    name: oauthNameByStrategy[strategy] ?? userSettings?.social?.[strategy]?.name ?? strategy,
  }))
}
