import { SignUp } from '@clerk/react'

export function SignUpPage(): React.JSX.Element {
  return (
    <div style={s.page}>
      <SignUp />
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
