// `npm run test:quick` is for use while working: it leaves out the slow files (tests/helpers/slow_tests.ts).
// `npm test` is the full suite and is what must pass before anything lands on main.
import { defineConfig } from 'vite';
import { pinFiles } from './tests/helpers/archived_pins';
import { slowFiles } from './tests/helpers/slow_tests';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', ...pinFiles().archived, ...slowFiles()],
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
} as any);
