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
          
          // Let Rollup handle the rest automatically to prevent initialization order bugs
        },
      },
    },
  },

  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
    },
    warmup: {
      clientFiles: [
        './src/main.jsx',
        './src/App.jsx',
        './src/pages/AssessmentsHome.jsx',
        './src/pages/recruiter/RecruiterLayout.jsx',
        './src/pages/recruiter/RecruiterDashboard.jsx',
        './src/pages/recruiter/Applicants.jsx',
        './src/pages/recruiter/MyJobs.jsx',
        './src/pages/recruiter/PostJob.jsx',
        './src/pages/seeker/SeekerDashboard.jsx',
        './src/components/Skeleton.jsx'
      ]
    },
    fs: {
      cachedChecks: true
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
      'react-dom/client',
      'react-router-dom',
      '@tanstack/react-query',
      'framer-motion',
      'lucide-react',
      'axios',
      'firebase/app',
      'firebase/auth',
      'react-helmet-async'
    ]
  }
}))
