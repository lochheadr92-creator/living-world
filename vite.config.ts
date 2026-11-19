import { defineConfig } from 'vite';
import { inhabitDevServer } from './scripts/inhabit/devserver';
import { pinFiles } from './tests/helpers/archived_pins';

export default defineConfig({
  base: './',
  plugins: [inhabitDevServer()],
  server: { port: 5273, strictPort: true, host: '127.0.0.1' },
  // Production artifacts must not ship source maps (they embed the original source); opt in per build with --sourcemap.
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 900 },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Continuation pins below the rules support floor (src/sim/support_floor.ts) are kept but not run here: npm run test:archive.
    exclude: ['**/node_modules/**', ...pinFiles().archived],
    testTimeout: 120_000,
  },
} as any);
