import { defineConfig } from 'vite'
import path from 'path'

// VITE_API_TARGET: use VPS (e.g. http://91.99.61.232:3000) or keep default localhost:3001
const apiTarget = process.env.VITE_API_TARGET || 'http://127.0.0.1:3001'

export default defineConfig({
  appType: 'spa', // Ensure SPA fallback: serve index.html for all non-file routes (e.g. /admin)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            console.error('[Vite proxy error]', err.message)
          })
        },
      },
      '/blog': {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
      },
      '/prix-marche': {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
      },
      '/sitemap.xml': {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
      }
    }
  },
  // Add history API fallback for routing
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
})
