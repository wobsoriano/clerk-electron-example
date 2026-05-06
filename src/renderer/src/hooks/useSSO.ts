import { useSignIn, useSignUp } from '@clerk/react/legacy'
import type { OAuthStrategy, SetActive, SignInResource, SignUpResource } from '@clerk/shared/types'

const SSO_CALLBACK_TIMEOUT_MS = 3 * 60 * 1000

export type StartSSOFlowParams = {
  strategy: OAuthStrategy
  unsafeMetadata?: SignUpUnsafeMetadata
}

export type StartSSOFlowReturnType = {
  createdSessionId: string | null
  setActive?: SetActive
  signIn?: SignInResource
  signUp?: SignUpResource
}

type UseSSOReturn = {
  startSSOFlow: (params: StartSSOFlowParams) => Promise<StartSSOFlowReturnType>
}

export function useSSO(): UseSSOReturn {
  const { signIn, setActive, isLoaded: isSignInLoaded } = useSignIn()
  const { signUp, isLoaded: isSignUpLoaded } = useSignUp()

  async function startSSOFlow(params: StartSSOFlowParams): Promise<StartSSOFlowReturnType> {
    if (!isSignInLoaded || !isSignUpLoaded) {
      return { createdSessionId: null, signIn, signUp, setActive }
    }

    // The exact loopback callback URL must be whitelisted in Clerk.
    const redirectUrl = await window.electron.sso.getRedirectUrl()

    await signIn!.create({
      strategy: params.strategy,
      redirectUrl
    })

    const { externalVerificationRedirectURL } = signIn!.firstFactorVerification
    if (!externalVerificationRedirectURL) {
      throw new Error('Missing external verification redirect URL for SSO flow')
    }

    // Resolves when the browser redirects back to the loopback listener after OAuth completes.
    const callbackUrl = await new Promise<string>((resolve, reject) => {
      const removeListener = window.electron.sso.onCallback((url) => {
        window.clearTimeout(timeoutId)
        resolve(url)
      })

      const timeoutId = window.setTimeout(() => {
        removeListener()
        reject(new Error('Timed out waiting for the browser to finish sign-in'))
      }, SSO_CALLBACK_TIMEOUT_MS)

      window.electron.sso.open(externalVerificationRedirectURL.toString())
    })

    const rotatingTokenNonce = new URL(callbackUrl).searchParams.get('rotating_token_nonce') ?? ''
    await signIn!.reload({ rotatingTokenNonce })

    if (signIn!.firstFactorVerification.status === 'transferable') {
      await signUp!.create({ transfer: true, unsafeMetadata: params.unsafeMetadata })
    }

    return {
      createdSessionId: signUp!.createdSessionId ?? signIn!.createdSessionId ?? null,
      setActive,
      signIn,
      signUp
    }
  }

  return { startSSOFlow }
}
