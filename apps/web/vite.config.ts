import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const apiPort = Number(process.env.API_PORT ?? 3001)
const webPort = Number(process.env.WEB_PORT ?? 3000)
const webHost = process.env.WEB_HOST ?? 'localhost'
const apiTarget = `http://127.0.0.1:${apiPort}`

export default defineConfig({
  envDir: '../..',
  resolve: {
    alias: {
      '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
      '@libs': fileURLToPath(new URL('./src/libs', import.meta.url)),
      '@web': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: webHost,
    port: webPort,
    strictPort: true,
    proxy: {
      '/api': apiTarget,
      '/health': apiTarget,
    },
  },
  plugins: [tailwindcss(), tanstackStart(), react()],
})
