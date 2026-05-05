# Electron + Clerk

<img width="1164" height="836" alt="Screenshot 2026-05-03 at 5 01 03 AM" src="https://github.com/user-attachments/assets/8de164f1-754d-48da-947f-95b58d5cc6ff" />

An example Electron app demonstrating [Clerk](https://clerk.com) authentication in a desktop environment.

## Quick Start

```bash
git clone <repo-url>
cd clerk-electron-poc
pnpm install
```

Create `.env`:

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

Add `clerk-electron://sso-callback` to your [Clerk Dashboard](https://dashboard.clerk.com) under **Allowed redirect URLs**.

Enable the OAuth providers you want (Google, GitHub, Microsoft) in your Clerk Dashboard.

```bash
pnpm dev
```

## What This Demonstrates

Electron apps can't use traditional cookie-based auth. This example shows how to run Clerk in a desktop app using:

1. **Native token flow** — Clerk's native app mode, the same approach used by `@clerk/expo`, `clerk-ios` and `clerk-android`, adapted for Electron
2. **Native OS auth session** — Uses [`electron-auth-session`](https://github.com/wobsoriano/electron-auth-session) to open OAuth flows in a sandboxed OS browser session (`ASWebAuthenticationSession` on macOS, `WebAuthenticationBroker` on Windows) that intercepts the callback without registering an OS-level protocol handler
3. **Encrypted session storage** — Uses `electron-store` with Electron's `safeStorage` API (OS keychain) so tokens survive restarts and can't be read from disk

## Architecture

```
Renderer (React)              Main Process (Node.js)
┌─────────────────────┐      ┌────────────────────────────────┐
│ createClerkInstance │      │ auth/request-interceptor.ts    │
│  Session bridging   │      │  CORS setup for Electron        │
├─────────────────────┤      ├────────────────────────────────┤
│ hooks/useSSO.ts     │─IPC─▶│ auth/ipc-handlers.ts           │
│  startSSOFlow()     │◀─────│  token:get/save/clear          │
└─────────────────────┘      │  auth:sso:authenticate         │
                             ├────────────────────────────────┤
   Native OS Browser         │ electron-auth-session          │
  ┌─────────────────┐        │  ASWebAuthenticationSession    │
  │ OAuth Provider  │───────▶│  WebAuthenticationBroker       │
  └─────────────────┘        ├────────────────────────────────┤
                             │ auth/token-store.ts            │
                             │  electron-store + safeStorage  │
                             └────────────────────────────────┘
```

## Key Files

| File | Purpose |
|------|---------|
| [`src/renderer/src/lib/createClerkInstance.ts`](src/renderer/src/lib/createClerkInstance.ts) | Configures the Clerk instance for Electron's native environment |
| [`src/renderer/src/lib/ClerkProvider.tsx`](src/renderer/src/lib/ClerkProvider.tsx) | Wires Clerk to React Router |
| [`src/renderer/src/hooks/useSSO.ts`](src/renderer/src/hooks/useSSO.ts) | Orchestrates the OAuth SSO flow via native OS auth session |
| [`src/main/auth/ipc-handlers.ts`](src/main/auth/ipc-handlers.ts) | IPC handlers for token storage and SSO; opens the native auth session |
| [`src/main/auth/token-store.ts`](src/main/auth/token-store.ts) | Encrypted token persistence via OS keychain |
| [`src/main/auth/request-interceptor.ts`](src/main/auth/request-interceptor.ts) | CORS configuration for Electron's renderer |
| [`src/preload/index.ts`](src/preload/index.ts) | Exposes `window.electron.tokenCache` and `window.electron.sso` |

## How It Works

### Native token flow

Clerk's web SDK is designed for browsers where sessions live in cookies. Electron apps don't have a real browser domain, so this example runs Clerk in native app mode — the same approach used by `@clerk/expo`, `clerk-ios` and `clerk-android`. Sessions are stored in encrypted local storage and attached to each request as a token, rather than relying on cookies.

### OAuth SSO flow

1. User clicks a social button (Google, GitHub, Microsoft)
2. Clerk generates a URL pointing to the OAuth provider
3. The main process opens a native OS auth session via `electron-auth-session`
4. The OS launches a sandboxed browser view where the user authenticates
5. After authentication, the provider redirects to `clerk-electron://sso-callback`
6. The OS intercepts the redirect and resolves it back to the app — no protocol registration required
7. The callback URL is returned to the renderer to complete sign-in

No custom protocol handler is registered at the OS level. No `shell.openExternal`. No single-instance lock needed for Windows callback routing.

### Session storage

Tokens are stored on disk using [`electron-store`](https://github.com/sindresorhus/electron-store) encrypted with Electron's [`safeStorage`](https://www.electronjs.org/docs/latest/api/safe-storage) API, which uses the OS keychain (Keychain on macOS, libsecret on Linux, DPAPI on Windows). Sessions survive app restarts and tokens can't be read from plain disk inspection.

## Build

```bash
pnpm build:mac    # macOS
pnpm build:win    # Windows
pnpm build:linux  # Linux
```

## Learn More

- [Clerk Docs](https://clerk.com/docs) — Full authentication documentation
- [electron-auth-session](https://github.com/wobsoriano/electron-auth-session) — Native OS auth sessions for Electron
- [electron-store](https://github.com/sindresorhus/electron-store) — Persistent config storage for Electron
- [Electron `safeStorage`](https://www.electronjs.org/docs/latest/api/safe-storage) — OS keychain encryption API
