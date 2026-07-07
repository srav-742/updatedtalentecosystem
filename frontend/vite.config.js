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
      threshold: 1024,
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
    // esbuild (default) is safe and fast — terser was causing blank page issues
    // due to aggressive code elimination on React initialization code
    minify: 'esbuild',
    chunkSizeWarningLimit: 1200,
    sourcemap: false,
    rollupOptions: {
      output: {
        // Safe chunk splitting — React core + React DOM must stay together
        // to avoid initialization order issues that cause blank pages
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          // TensorFlow + object-detection — only loaded on proctoring page
          if (
            id.includes('@tensorflow') ||
            id.includes('coco-ssd') ||
            id.includes('face-api')
          ) {
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

          // React core + React DOM + Router MUST be in the same chunk
          // Splitting react from react-dom causes blank page due to
          // hook initialization order violations
          if (
            id.includes('/react/') ||
            id.includes('react-dom') ||
            id.includes('react-router') ||
            id.includes('scheduler')
          ) {
            return 'chunk-react';
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
