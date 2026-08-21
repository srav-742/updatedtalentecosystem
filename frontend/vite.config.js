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
    target: 'es2020',
    cssCodeSplit: true,
    cssMinify: 'lightningcss',   // ~3x faster CSS minification than default
    chunkSizeWarningLimit: 1200,
    sourcemap: false,
    rollupOptions: {
      output: {
        // Granular chunk splitting for faster page loads
        // React core + React DOM must stay together to avoid initialization order issues
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          // TensorFlow + object-detection — only loaded on proctoring page
          if (
            id.includes('@tensorflow') ||
            id.includes('coco-ssd') ||
            id.includes('face-api') ||
            id.includes('onnxruntime-web')
          ) {
            return 'chunk-tensorflow';
          }

          // Firebase — authentication, Firestore, Storage
          if (id.includes('firebase')) {
            return 'chunk-firebase';
          }

          // TipTap rich-text editor — only loaded on blog editor page
          if (id.includes('@tiptap') || id.includes('prosemirror')) {
            return 'chunk-editor';
          }

          // React core — loaded on every page (must stay together)
          if (
            id.includes('react-dom') ||
            id.includes('/react/') ||
            id.includes('react-router') ||
            id.includes('scheduler') ||
            id.includes('react-helmet')
          ) {
            return 'chunk-react';
          }

          // UI animation + icons — loaded on pages with visual elements
          if (
            id.includes('framer-motion') ||
            id.includes('lucide-react')
          ) {
            return 'chunk-ui';
          }

          // Data fetching layer — loaded on pages that make API calls
          if (
            id.includes('@tanstack') ||
            id.includes('axios')
          ) {
            return 'chunk-data';
          }

          // Everything else (clsx, tailwind-merge, phone input, webcam, etc.)
          return 'chunk-vendor';
        },
      },
    },
  },

  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'framer-motion',
      'lucide-react',
      'axios',
      'firebase/app',
      'firebase/auth',
      '@tensorflow/tfjs',
      '@tensorflow-models/coco-ssd',
      'face-api.js',
      'onnxruntime-web'
    ]
  }
}))
