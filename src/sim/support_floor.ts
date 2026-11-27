/**
 * The oldest rules version the project still keeps (Ryan's decision of 20 November 2026).
 *
 * What it governs: numbered saves below this version are refused on load. Unversioned diagnostic worlds remain distinct and
 * accepted. Continuation pins below the floor stay archived in `tests/` but are no longer runnable against this build.
 *
 * The pins remain out of `npm test`; `npm run test:archive` selects the historical continuations, which now fail at the
 * deliberate load boundary. Removing the old gates from src/sim remains a later step, one subsystem at a time.
 */
export const RULES_SUPPORT_FLOOR = 250;
