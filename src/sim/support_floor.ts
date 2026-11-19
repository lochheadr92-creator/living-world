/**
 * The oldest rules version the project still keeps (Ryan's decision of 20 November 2026).
 *
 * What it governs today: the continuation pins of versions below it are left out of `npm test` and run with
 * `npm run test:archive` (tests/helpers/archived_pins.ts, vite.config.ts, vitest.archive.config.ts).
 *
 * What it does not govern yet: loading. A save below the floor still loads and runs (rulesversion.ts
 * SUPPORTED_RULES_VERSIONS is unchanged). Refusing such a save on load, and removing the gates of the versions
 * below the floor from src/sim, are later steps, each its own change.
 */
export const RULES_SUPPORT_FLOOR = 250;
