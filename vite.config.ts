import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4173,
    host: true,
    headers: {
      'Permissions-Policy': 'tools=(self)',
      'Origin-Agent-Cluster': '?1',
      'X-Content-Type-Options': 'nosniff'
    }
  },
  preview: {
    port: 4173,
    host: true,
    headers: {
      'Permissions-Policy': 'tools=(self)',
      'Origin-Agent-Cluster': '?1',
      'X-Content-Type-Options': 'nosniff'
    }
  }
})
