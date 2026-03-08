import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const clientIP = req.socket.remoteAddress;
            if (clientIP) {
              proxyReq.setHeader('X-Forwarded-For', clientIP);
            }
          });
        },
      },
    },
  },
})
