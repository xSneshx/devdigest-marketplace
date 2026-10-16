/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { siteHtml } from './build/site-html.ts';

export default defineConfig({
  base: './',
  plugins: [react(), siteHtml()],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: { outDir: 'dist', assetsInlineLimit: 0 },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'indexer/**/*.test.ts', 'build/**/*.test.ts'],
  },
});
