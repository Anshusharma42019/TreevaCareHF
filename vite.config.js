import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    proxy: {
      // All /api/* and /ping requests are proxied to the backend.
      // This eliminates CORS entirely — the browser only talks to localhost:5173,
      // and Vite forwards the request server-side (no cross-origin issue).
      // Change target to 'http://localhost:5000' to develop against local backend instead.
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/ping': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor';
            }
            if (id.includes('axios')) {
              return 'axios';
            }
            return 'vendor-others';
          }
        }
      }
    }
  }
})
