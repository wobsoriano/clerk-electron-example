import { Waitlist } from '@clerk/react'

export function WaitlistPage(): React.JSX.Element {
  return (
    <div style={s.page}>
      <Waitlist />
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
