import { UserProfile } from '@clerk/electron/react'

export function ProfilePage(): React.JSX.Element {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 24px' }}>
      <UserProfile />
    </div>
  )
}
