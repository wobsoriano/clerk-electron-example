import { UserProfile } from '@clerk/react'

export function ProfilePage(): React.JSX.Element {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 24px' }}>
      <UserProfile routing="hash" />
    </div>
  )
}
