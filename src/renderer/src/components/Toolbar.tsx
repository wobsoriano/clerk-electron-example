import { Show, UserButton } from '@clerk/react'
import { Link, useLocation } from 'react-router-dom'

function NavLink({ to, children }: { to: string; children: React.ReactNode }): React.JSX.Element {
  const { pathname } = useLocation()
  const active = pathname === to || (to !== '/' && pathname.startsWith(to))
  return (
    <Link
      to={to}
      style={{
        color: active ? 'var(--ev-c-text-1)' : 'var(--ev-c-text-2)',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: active ? 600 : 400,
        padding: '4px 0',
        borderBottom: active ? '2px solid #6c47ff' : '2px solid transparent',
        transition: 'color 0.15s, border-color 0.15s',
      }}
    >
      {children}
    </Link>
  )
}

export function Toolbar(): React.JSX.Element {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: '52px',
        borderBottom: '1px solid #2a2a2e',
        flexShrink: 0,
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(27, 27, 31, 0.8)',
      }}
    >
      <nav style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <NavLink to="/">Home</NavLink>
        <Show when="signed-in">
          <NavLink to="/profile">Profile</NavLink>
        </Show>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Show when="signed-in">
          <UserButton />
        </Show>
        <Show when="signed-out">
          <Link
            to="/sign-in"
            style={{
              color: 'var(--ev-c-text-1)',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 500,
              padding: '6px 14px',
              border: '1px solid var(--ev-c-gray-2)',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              transition: 'background-color 0.15s',
            }}
          >
            Sign in
          </Link>
        </Show>
      </div>
    </header>
  )
}
