import { defineConfig } from 'vite';

export default defineConfig({
  // Use relative base so assets work on GitHub Pages (/repo/) and Vercel (/)
  base: './',
  server: {
    port: 3000,
    open: true,
    host: true // Allow external connections for VR testing
  },
  build: {
    outDir: 'dist',
    assetsDir: '',
    sourcemap: true
  },
  optimizeDeps: {
    include: ['aframe']
  }
});
