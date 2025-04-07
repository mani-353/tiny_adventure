import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // This is required for Anchor to work
    'process.env': {},
    'global': {},
  },
  resolve: {
    alias: {
      // Node.js polyfills
      stream: 'stream-browserify',
      crypto: 'crypto-browserify',
      assert: 'assert',
      os: 'os-browserify',
      util: 'util',
      // Add any other Node.js built-ins that need to be polyfilled
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis',
      },
    },
    exclude: ['lucide-react'],
  },
});
