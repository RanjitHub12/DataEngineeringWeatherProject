import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ============================================================================
// Vite Configuration for Weather Dashboard Frontend
// ============================================================================
// Vite is a modern build tool that provides:
//   - Lightning-fast HMR (Hot Module Replacement) in development
//   - Optimized production builds
//   - ES module support
//   - Plugin system for React, TypeScript, etc.
//
// Development: npm run dev
//   - Starts server at http://localhost:5173
//   - Auto-reload on file changes
//
// Production: npm run build
//   - Creates optimized bundle in dist/
//   - Ready for deployment to Vercel, Netlify, etc.
// ============================================================================

export default defineConfig({
  plugins: [react()],
  
  server: {
    // Development server configuration
    port: 5173,
    strictPort: false,  // Use next available port if 5173 is taken
    host: true,        // Listen on all addresses
    
    // Proxy configuration for API calls during development
    // This prevents CORS issues when frontend and backend run on different ports
    proxy: {
      // Route all /api/* requests to localhost:8000
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path,  // Keep /api in the URL
      },
    },
  },
  
  build: {
    // Production build configuration
    outDir: 'dist',           // Output directory for build
    sourcemap: false,         // Set to true for production debugging
    minify: 'esbuild',       // Use esbuild for faster minification
    
    rollupOptions: {
      output: {
        // Code splitting configuration
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'charts': ['recharts'],
        },
      },
    },
  },
  
  // Environment variable prefix
  // Variables starting with VITE_ are exposed to client-side code
  envPrefix: 'VITE_',
})
