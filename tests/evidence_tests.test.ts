// The review tests that need evidence kept out of git are listed once (tests/helpers/evidence_tests.ts), still exist, and are left out of
// `npm test` and `npm run test:quick` (Ryan, 28 November 2026). Moved to `npm run test:evidence`, not deleted.
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EVIDENCE_TESTS } from './helpers/evidence_tests';
import full from '../vite.config';
import quick from '../vitest.quick.config';
import evidence from '../vitest.evidence.config';

const excl = (c: unknown) => ((c as { test: { exclude: string[] } }).test.exclude);
describe('evidence tests', () => {
  it('exist, are run by test:evidence, and are left out of the full and quick suites', () => {
    for (const f of EVIDENCE_TESTS) {
      expect(existsSync(f)).toBe(true);
      expect(excl(full)).toContain(f);
      expect(excl(quick)).toContain(f);
    }
    expect((evidence as unknown as { test: { include: string[] } }).test.include).toEqual([...EVIDENCE_TESTS]);
  });
});
