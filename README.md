# Clerk Electron PoC

<img width="1164" height="836" alt="Screenshot 2026-05-03 at 5 01 03 AM" src="https://github.com/user-attachments/assets/8de164f1-754d-48da-947f-95b58d5cc6ff" />

An Electron + React example app for validating the `@clerk/electron` SDK snapshots from Clerk's JavaScript monorepo.

## Quick Start

```bash
git clone <repo-url>
cd clerk-electron-poc
npm install
```

Create `.env` from `.env.example`:

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

In the [Clerk Dashboard](https://dashboard.clerk.com), enable Native API for the instance and add `clerk://app/` under **Redirect URLs**.

```bash
npm run dev
```

## What This Demonstrates

Electron apps can't use traditional cookie-based auth. This example uses `@clerk/electron` for:

1. **Native token flow**: Clerk runs in native app mode and sends the client token through Electron-safe storage instead of browser cookies.
2. **External OAuth transport**: OAuth opens in the system browser and resumes in the app through the `clerk://app/` deep link.
3. **SDK-managed session storage**: `@clerk/electron/storage` uses `electron-store` with Electron's `safeStorage` API.

## Architecture

```
Renderer (React)                         Main Process
┌──────────────────────────────┐        ┌──────────────────────────────┐
│ @clerk/electron/react        │        │ @clerk/electron              │
│  ClerkProvider + components  │        │  createClerkBridge()         │
└──────────────┬───────────────┘        │  token + OAuth IPC handlers  │
               │                        └──────────────┬───────────────┘
               │ preload bridge                        │
┌──────────────▼───────────────┐        ┌──────────────▼───────────────┐
│ @clerk/electron/preload      │        │ clerk://app protocol handler │
│  exposeClerkBridge()         │        │  Vite/static renderer        │
└──────────────────────────────┘        └──────────────────────────────┘
```

## Key Files

| File                                                   | Purpose                                                                    |
| ------------------------------------------------------ | -------------------------------------------------------------------------- |
| [`src/main/index.ts`](src/main/index.ts)               | Calls `createClerkBridge`, configures `clerk://app`, and creates the BrowserWindow |
| [`src/preload/index.ts`](src/preload/index.ts)         | Calls `exposeClerkBridge` and exposes the demo Electron Toolkit bridge     |
| [`src/renderer/src/App.tsx`](src/renderer/src/App.tsx) | Uses `@clerk/electron/react` with React Router navigation callbacks        |

## How It Works

### Native token flow

`@clerk/electron/react` creates the Clerk instance with Electron defaults. `@clerk/electron/preload` exposes the internal bridge used by Clerk in the renderer. `createClerkBridge` registers IPC handlers for token persistence, backed by `@clerk/electron/storage`.

### OAuth SSO flow

1. User clicks a social button.
2. Clerk asks the Electron OAuth transport for the redirect URL.
3. `createClerkBridge` returns `clerk://app/` and opens the provider URL with Electron's `shell.openExternal`.
4. The OS routes the deep link back to the app.
5. The SDK resolves the OAuth transport with the callback URL and Clerk resumes the sign-in flow.

### Session storage

Tokens are stored on disk using [`electron-store`](https://github.com/sindresorhus/electron-store) encrypted with Electron's [`safeStorage`](https://www.electronjs.org/docs/latest/api/safe-storage) API.

## Build

```bash
npm run build:mac    # macOS
npm run build:win    # Windows
npm run build:linux  # Linux
```
