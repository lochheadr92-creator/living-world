import { defineConfig } from 'vite';
import { inhabitDevServer } from './scripts/inhabit/devserver';

export default defineConfig({
  base: './',
  plugins: [inhabitDevServer()],
  server: { port: 5273, strictPort: true, host: '127.0.0.1' },
  // Production artifacts must not ship source maps (they embed the original source); opt in per build with --sourcemap.
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 900 },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 120_000,
  },
} as any);
