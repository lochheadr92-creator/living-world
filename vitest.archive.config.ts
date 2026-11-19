// `npm run test:archive`: the continuation pins of rules versions below the support floor (src/sim/support_floor.ts).
// They are left out of `npm test` (vite.config.ts) and kept runnable here. Never re-record one to make a change pass.
import { defineConfig } from 'vite';
import { pinFiles } from './tests/helpers/archived_pins';

export default defineConfig({
  test: {
    environment: 'node',
    include: pinFiles().archived,
    testTimeout: 120_000,
  },
} as any);
