import { ClerkProvider, Show } from '@clerk/electron/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { Toolbar } from './components/Toolbar'
import { ProfilePage } from './pages/ProfilePage'
import { SignInPage } from './pages/SignInPage'
import { SignUpPage } from './pages/SignUpPage'
import { WaitlistPage } from './pages/WaitlistPage'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string

function ClerkProviderWithRouter({ children }: { children: React.ReactNode }): React.JSX.Element {
  const navigate = useNavigate()

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
    >
      {children}
    </ClerkProvider>
  )
}

function App(): React.JSX.Element {
  return (
    <MemoryRouter>
      <ClerkProviderWithRouter>
        <Toolbar />
        <main>
          <Routes>
            <Route
              path="/"
              element={
                <div style={{ padding: '40px 24px' }}>
                  <Show when="signed-in">
                    <h2>Welcome back!</h2>
                    <p>You are signed in. Visit your profile or use the toolbar above.</p>
                  </Show>
                  <Show when="signed-out">
                    <h2>Welcome</h2>
                    <p>Sign in or create an account to get started.</p>
                  </Show>
                </div>
              }
            />
            <Route path="/sign-in/*" element={<SignInPage />} />
            <Route path="/sign-up/*" element={<SignUpPage />} />
            <Route path="/waitlist/*" element={<WaitlistPage />} />
            <Route path="/profile/*" element={<ProfilePage />} />
          </Routes>
        </main>
      </ClerkProviderWithRouter>
    </MemoryRouter>
  )
}

export default App
