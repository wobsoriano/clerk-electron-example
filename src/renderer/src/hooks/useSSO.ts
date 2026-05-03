import { useSignIn, useSignUp } from '@clerk/react/legacy'
import type { OAuthStrategy, SetActive, SignInResource, SignUpResource } from '@clerk/shared/types'

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

export function useSSO() {
  const { signIn, setActive, isLoaded: isSignInLoaded } = useSignIn()
  const { signUp, isLoaded: isSignUpLoaded } = useSignUp()

  async function startSSOFlow(params: StartSSOFlowParams): Promise<StartSSOFlowReturnType> {
    if (!isSignInLoaded || !isSignUpLoaded) {
      return { createdSessionId: null, signIn, signUp, setActive }
    }

    // clerk-electron://sso-callback must be in Clerk's allowed redirect URLs.
    const redirectUrl = await window.electron.sso.getRedirectUrl()

    await signIn!.create({
      strategy: params.strategy,
      redirectUrl,
    })

    const { externalVerificationRedirectURL } = signIn!.firstFactorVerification
    if (!externalVerificationRedirectURL) {
      throw new Error('Missing external verification redirect URL for SSO flow')
    }

    // Resolves when the OS fires the clerk-electron:// deep link after OAuth completes.
    const callbackUrl = await new Promise<string>((resolve) => {
      window.electron.sso.onCallback(resolve)
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
      signUp,
    }
  }

  return { startSSOFlow }
}
