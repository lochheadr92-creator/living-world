import { defineConfig } from 'vite';
import { inhabitDevServer } from './scripts/inhabit/devserver';
import { pinFiles } from './tests/helpers/archived_pins';
import { EVIDENCE_TESTS } from './tests/helpers/evidence_tests';

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
    // review tests that need evidence kept out of git: npm run test:evidence (tests/helpers/evidence_tests.ts)
    exclude: ['**/node_modules/**', ...pinFiles().archived, ...EVIDENCE_TESTS],
    // Limits are there to catch a hang, not to time a test: the suite keeps every core busy, and a long test then runs two to three times slower than alone.
    testTimeout: 900_000,
    hookTimeout: 120_000,
  },
} as any);
