import { useSignIn } from '@clerk/react'
import { Field } from '@base-ui/react/field'
import { Form } from '@base-ui/react/form'
import { Button } from '@base-ui/react/button'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSSO } from '../hooks/useSSO'
import { useEnabledSocialProviders } from '../hooks/useEnabledSocialProviders'
import { Spinner } from '../components/Spinner'
import type { OAuthStrategy } from '@clerk/shared/types'

export function SignInPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { signIn, errors, fetchStatus } = useSignIn()
  const { startSSOFlow } = useSSO()
  const ssoProviders = useEnabledSocialProviders()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [ssoLoading, setSsoLoading] = useState(false)
  const [ssoError, setSsoError] = useState<string | null>(null)

  const formErrors = Object.fromEntries(
    Object.entries(errors.fields)
      .filter(([, e]) => e != null)
      .map(([k, e]) => [k, [e!.message]])
  )

  const onSubmit = async (): Promise<void> => {
    const { error } = await signIn.password({ identifier: email, password })
    if (error) return

    if (signIn.status === 'complete') {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return
          const url = decorateUrl('/')
          navigate(url.startsWith('http') ? '/' : url)
        },
      })
    }
  }

  const onSSO = async (strategy: OAuthStrategy): Promise<void> => {
    setSsoError(null)
    setSsoLoading(true)
    try {
      const { createdSessionId, setActive } = await startSSOFlow({ strategy })
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId })
        navigate('/')
      }
    } catch (err) {
      setSsoError(err instanceof Error ? err.message : 'SSO failed')
    } finally {
      setSsoLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.heading}>Sign in</h1>

        <Form errors={formErrors} onFormSubmit={onSubmit} style={s.form}>
          <Field.Root name="identifier" style={s.field}>
            <Field.Label style={s.label}>Email</Field.Label>
            <Field.Control
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              autoComplete="email"
              style={s.input}
            />
            <Field.Error style={s.error} />
          </Field.Root>

          <Field.Root name="password" style={s.field}>
            <Field.Label style={s.label}>Password</Field.Label>
            <Field.Control
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete="current-password"
              style={s.input}
            />
            <Field.Error style={s.error} />
          </Field.Root>

          <Button type="submit" disabled={fetchStatus === 'fetching'} style={s.primaryBtn}>
            {fetchStatus === 'fetching' ? 'Signing in...' : 'Sign in'}
          </Button>
        </Form>

        <div style={s.divider}>
          <hr style={s.dividerLine} />
          <span style={s.dividerText}>or continue with</span>
          <hr style={s.dividerLine} />
        </div>

        {ssoLoading ? (
          <div style={s.ssoWaiting}>
            <Spinner />
            <span>Waiting for browser sign-in to complete...</span>
          </div>
        ) : (
          <div style={s.ssoRow}>
            {ssoProviders.map(({ strategy, name }) => (
              <Button
                key={strategy}
                type="button"
                style={s.ssoBtn}
                onClick={() => onSSO(strategy)}
              >
                {name}
              </Button>
            ))}
          </div>
        )}
        {ssoError && <p style={s.error}>{ssoError}</p>}

        <p style={s.switchText}>
          Don&apos;t have an account?{' '}
          <Link to="/sign-up" style={s.link}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { display: 'flex', justifyContent: 'center', padding: '48px 24px' },
  card: { width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '20px' },
  heading: { fontSize: '20px', fontWeight: 600, color: 'var(--ev-c-text-1)', margin: 0 },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: 500, color: 'var(--ev-c-text-2)' },
  input: {
    padding: '9px 12px',
    background: 'var(--color-background-mute)',
    border: '1px solid var(--ev-c-gray-2)',
    borderRadius: '6px',
    color: 'var(--ev-c-text-1)',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  primaryBtn: {
    padding: '10px',
    background: '#6c47ff',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    width: '100%',
  },
  ssoWaiting: { display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--ev-c-text-2)', fontSize: '13px', justifyContent: 'center', padding: '8px 0' },
  ssoRow: { display: 'flex', gap: '8px' },
  ssoBtn: {
    flex: 1,
    padding: '9px 8px',
    background: 'transparent',
    border: '1px solid var(--ev-c-gray-2)',
    borderRadius: '6px',
    color: 'var(--ev-c-text-1)',
    fontSize: '13px',
    cursor: 'pointer',
  },
  divider: { display: 'flex', alignItems: 'center', gap: '12px' },
  dividerLine: { flex: 1, height: '1px', background: 'var(--ev-c-gray-3)', border: 'none' },
  dividerText: { fontSize: '12px', color: 'var(--ev-c-text-3)', whiteSpace: 'nowrap' },
  switchText: { fontSize: '13px', color: 'var(--ev-c-text-2)', textAlign: 'center', margin: 0 },
  link: { color: '#8b74ff', textDecoration: 'none' },
  error: { fontSize: '12px', color: '#f87171', margin: 0 },
}
