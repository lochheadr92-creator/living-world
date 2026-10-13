import { defineConfig } from 'vite';
import { inhabitDevServer } from './scripts/inhabit/devserver';

export default defineConfig({
  base: './',
  plugins: [inhabitDevServer()],
  server: { port: 5273, strictPort: true, host: '127.0.0.1' },
  build: { target: 'es2022', sourcemap: true, chunkSizeWarningLimit: 900 },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 120_000,
  },
} as any);
