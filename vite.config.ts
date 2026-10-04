import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 5273, strictPort: true, host: '127.0.0.1' },
  build: { target: 'es2022', sourcemap: true, chunkSizeWarningLimit: 900 },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 120_000,
  },
} as any);
