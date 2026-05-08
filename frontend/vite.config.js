import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return;
          }

          if (id.includes('@tensorflow') || id.includes('coco-ssd')) {
            return 'tf-vendor';
          }

          if (id.includes('firebase')) {
            return 'firebase-vendor';
          }

          if (id.includes('framer-motion')) {
            return 'motion-vendor';
          }

          if (
            id.includes('react') ||
            id.includes('scheduler') ||
            id.includes('react-router')
          ) {
            return 'react-vendor';
          }

          return 'vendor';
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // change port if yours is different
        changeOrigin: true,
        secure: false,
      }
    }

  }
})
