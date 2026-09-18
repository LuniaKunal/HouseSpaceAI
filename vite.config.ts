import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), {
    name: 'local-photo-api-only',
    configureServer(server) {
      server.middlewares.use('/api/photo-design', (req, res, next) => {
        if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress || '')) {
          res.statusCode = 403; res.end('Photo generation is available on this computer only.'); return;
        }
        next();
      });
    }
  }],
  server: {
    port: 4173,
    strictPort: true,
    proxy: { '/api/photo-design': { target: 'http://127.0.0.1:4174', changeOrigin: false } },
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
