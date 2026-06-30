import { SignIn } from '@clerk/electron/react'

export function SignInPage(): React.JSX.Element {
  return (
    <div style={s.page}>
      <SignIn withSignUp={true} />
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    justifyContent: 'center',
    padding: '48px 24px'
  }
}
