import { useSignUp } from '@clerk/react'
import { Field } from '@base-ui/react/field'
import { Form } from '@base-ui/react/form'
import { Button } from '@base-ui/react/button'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export function SignUpPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { signUp, errors, fetchStatus } = useSignUp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')

  const formErrors = Object.fromEntries(
    Object.entries(errors.fields)
      .filter(([, e]) => e != null)
      .map(([k, e]) => [k, [e!.message]])
  )

  const pendingVerification =
    signUp.status === 'missing_requirements' &&
    signUp.unverifiedFields.includes('email_address')

  const onCreate = async (): Promise<void> => {
    const { error } = await signUp.password({ emailAddress: email, password })
    if (error) return
    await signUp.verifications.sendEmailCode()
  }

  const onVerify = async (): Promise<void> => {
    await signUp.verifications.verifyEmailCode({ code })
    if (signUp.status === 'complete') {
      await signUp.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return
          const url = decorateUrl('/')
          navigate(url.startsWith('http') ? '/' : url)
        },
      })
    }
  }

  if (pendingVerification) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <h1 style={s.heading}>Check your email</h1>
          <p style={s.subtitle}>We sent a verification code to {email}.</p>

          <Form errors={formErrors} onFormSubmit={onVerify} style={s.form}>
            <Field.Root name="code" style={s.field}>
              <Field.Label style={s.label}>Verification code</Field.Label>
              <Field.Control
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                style={s.input}
              />
              <Field.Error style={s.error} />
            </Field.Root>

            <Button type="submit" disabled={fetchStatus === 'fetching'} style={s.primaryBtn}>
              {fetchStatus === 'fetching' ? 'Verifying...' : 'Verify email'}
            </Button>
          </Form>

          <Button
            style={s.ghostBtn}
            onClick={() => void signUp.verifications.sendEmailCode()}
          >
            Resend code
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.heading}>Create account</h1>

        <Form errors={formErrors} onFormSubmit={onCreate} style={s.form}>
          <Field.Root name="emailAddress" style={s.field}>
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
              autoComplete="new-password"
              style={s.input}
            />
            <Field.Error style={s.error} />
          </Field.Root>

          <Button type="submit" disabled={fetchStatus === 'fetching'} style={s.primaryBtn}>
            {fetchStatus === 'fetching' ? 'Creating account...' : 'Create account'}
          </Button>
        </Form>

        <p style={s.switchText}>
          Already have an account?{' '}
          <Link to="/sign-in" style={s.link}>
            Sign in
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
  subtitle: { fontSize: '14px', color: 'var(--ev-c-text-2)', margin: 0 },
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
  ghostBtn: {
    padding: '10px',
    background: 'transparent',
    border: '1px solid var(--ev-c-gray-2)',
    borderRadius: '6px',
    color: 'var(--ev-c-text-2)',
    fontSize: '14px',
    cursor: 'pointer',
    width: '100%',
  },
  switchText: { fontSize: '13px', color: 'var(--ev-c-text-2)', textAlign: 'center', margin: 0 },
  link: { color: '#8b74ff', textDecoration: 'none' },
  error: { fontSize: '12px', color: '#f87171', margin: 0 },
}
