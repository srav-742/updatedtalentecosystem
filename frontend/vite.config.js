import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { compression } from 'vite-plugin-compression2'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),

    // Gzip compression for all text-based assets
    compression({
      algorithm: 'gzip',
      exclude: [/\.(png|jpe?g|gif|webp|svg|ico|woff2?)$/i],
      threshold: 1024, // only compress files > 1KB
    }),

    // Brotli compression (best compression ratio — ~70% smaller than raw)
    compression({
      algorithm: 'brotliCompress',
      exclude: [/\.(png|jpe?g|gif|webp|svg|ico|woff2?)$/i],
      threshold: 1024,
    }),

    // Bundle visualizer — only generated during 'analyze' mode
    mode === 'analyze' &&
      visualizer({
        open: true,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
        template: 'treemap',
      }),
  ].filter(Boolean),

  build: {
    // Use terser for maximum dead-code elimination and minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,      // strip all console.log in production
        drop_debugger: true,
        pure_funcs: ['console.info', 'console.debug', 'console.warn'],
      },
    },
    chunkSizeWarningLimit: 1000, // suppress warnings for large (but expected) chunks
    sourcemap: false,             // no source maps in production (smaller bundles)
    rollupOptions: {
      output: {
        // Fine-grained chunk splitting — each group is cached independently
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          // TensorFlow + object-detection — only loaded on proctoring page
          if (id.includes('@tensorflow') || id.includes('coco-ssd') || id.includes('face-api')) {
            return 'chunk-tensorflow';
          }

          // Firebase — authentication, Firestore, Storage
          if (id.includes('firebase')) {
            return 'chunk-firebase';
          }

          // Framer Motion animations
          if (id.includes('framer-motion')) {
            return 'chunk-motion';
          }

          // React Query — data fetching layer
          if (id.includes('@tanstack')) {
            return 'chunk-query';
          }

          // React core + router
          if (
            id.includes('react-dom') ||
            id.includes('react-router') ||
            id.includes('scheduler')
          ) {
            return 'chunk-react';
          }

          // React itself (tiny, separate for maximum caching)
          if (id.includes('/react/')) {
            return 'chunk-react-core';
          }

          // Lucide icons
          if (id.includes('lucide')) {
            return 'chunk-icons';
          }

          // Everything else (axios, clsx, etc.)
          return 'chunk-vendor';
        },
      },
    },
  },

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
}))
