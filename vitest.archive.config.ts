// Historical continuation pins below the support floor stay in tests/ but their numbered saves are intentionally no longer
// loadable by the current build. This config preserves an explicit way to select them for archival inspection; they fail at
// that support boundary by design. They are not a current-runtime verification suite. Never re-record one to make a change pass.
import { defineConfig } from 'vite';
import { pinFiles } from './tests/helpers/archived_pins';

export default defineConfig({
  test: {
    environment: 'node',
    include: pinFiles().archived,
    testTimeout: 120_000,
  },
} as any);
