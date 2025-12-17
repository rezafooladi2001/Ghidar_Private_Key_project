import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: '../assets/ghidar',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'index.js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
  // Use root path in dev mode for easier local development
  // Use production path in build mode
  base: mode === 'development' ? '/' : '/RockyTap/assets/ghidar/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    // Proxy API requests to backend if needed
    // For local dev, API calls use relative paths which should work
    // if backend is running on the same server
  },
}));

