import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    // Expose VITE_-prefixed vars (the publishable key) to the main process so it can derive
    // the Clerk Frontend API host for the request interceptor.
    envPrefix: ['VITE_']
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})
