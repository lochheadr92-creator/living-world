// `npm run test:evidence`: the review tests that need evidence kept out of git (tests/helpers/evidence_tests.ts). Left out of `npm test`.
import { defineConfig } from 'vite';
import { EVIDENCE_TESTS } from './tests/helpers/evidence_tests';

export default defineConfig({
  test: {
    environment: 'node',
    include: [...EVIDENCE_TESTS],
    testTimeout: 900_000,
  },
} as any);
