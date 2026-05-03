import { Show } from '@clerk/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Toolbar } from './components/Toolbar'
import { ClerkProvider } from './lib/ClerkProvider'
import { ProfilePage } from './pages/ProfilePage'
import { SignInPage } from './pages/SignInPage'
import { SignUpPage } from './pages/SignUpPage'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string

function App(): React.JSX.Element {
  return (
    <MemoryRouter>
      <ClerkProvider publishableKey={publishableKey}>
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
            <Route path="/profile/*" element={<ProfilePage />} />
          </Routes>
        </main>
      </ClerkProvider>
    </MemoryRouter>
  )
}

export default App
