// Review tests that read evidence kept out of git (autonomy_evidence/ is gitignored). On a clean checkout they fail (zz_review_e_famine_trace) or
// skip (zz_review_main_mature_large), so they are left out of `npm test` and `npm run test:quick` and kept runnable with `npm run test:evidence`
// on a machine that holds the evidence. Ryan, 28 November 2026: "remove the repeated failing tests and the skipped one". Moved, not deleted
// (archive, never delete). Read by vite.config.ts, vitest.quick.config.ts and vitest.evidence.config.ts.
export const EVIDENCE_TESTS: readonly string[] = ['tests/zz_review_e_famine_trace.test.ts', 'tests/zz_review_main_mature_large.test.ts'];
