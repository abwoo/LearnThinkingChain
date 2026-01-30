import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, '../../src/core'),
      '@infra': path.resolve(__dirname, '../../src/infra'),
      '@ui': path.resolve(__dirname, '../../src/ui'),
      '@shared': path.resolve(__dirname, '../../packages/shared')
    }
  },
  build: {
    outDir: path.resolve(__dirname, '../../dist/extension'),
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'popup.html'),
        content: path.resolve(__dirname, 'content/main.js'),
        background: path.resolve(__dirname, 'background/index.js')
      }
    }
  }
});
