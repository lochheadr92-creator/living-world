<!-- Pasted into every writer prompt by tools/relay/pack.ts. The writer cannot see the repository, so every word here must be
true of it today and worth the tokens. Edit it when the house rules change; keep it under about 450 words. -->
THE RULES OF THIS REPOSITORY

Living World is a deterministic TypeScript simulation (strict tsc, vitest, extensionless relative imports). You cannot see the
repository: use only this message, and change only what the work order names.

DETERMINISM (WORKFLOW.md:30; src/sim/rng.ts:1). Nothing under src/sim calls Math.random, Date.now or any clock. Randomness is world.rng.next() (one seeded stream; an extra draw shifts everything after) or the pure hashes hashString, hash3, hashUnit, which draw nothing. No network code under src/sim or src/agent (scripts/inhabit/openai.ts:1).

RULES VERSION (docs/DEVELOPMENT_POLICY.md "Changing behaviour from here on"; src/sim/rulesversion.ts:361). Anything that can alter outcomes or saved bytes, bug fixes included, belongs to version N from the design. Gate it where it is decided with runsRulesVersion(world, N) and keep the old branch for earlier worlds. Never compare rulesVersion with a literal (tests/rules_version.test.ts:225).

MODULE SHAPE (src/sim/bread_feeds.ts). One new file src/sim/<name>.ts owns the rule: a header comment (rule number, what changes, what is saved); switch state, default on, with exported setX(enabled, part?) and xPartOn(part), documented "Lab switch (never saved or hashed)"; export const hasX = (world) => world.settings.dynamics === 'rich' && runsRulesVersion(world, N). Call sites ask this module. Below N, in non-rich worlds, or switched off, behaviour equals rules N-1 exactly.

ORCHESTRATOR'S FILES (docs/HANDOFF_20261114.md "How to work"). Do not edit src/sim/rulesversion.ts, scripts/lab/lab.ts or docs/RULES_RANGES.md unless the design says otherwise; the orchestrator adds the version and the lab arm `rich-no-<name>`.

SAVES (docs/DEVELOPMENT_POLICY.md "Saves and historical behavior"). Prefer saving nothing. A new saved field is absent below N and validated on load; a world saved and loaded continues identically to one that was not. Never change the save format, migrate or relabel a save.

RESOURCES (src/sim/economy.ts). Goods move through the existing transfer and ledger paths; conservationReport(world).ok stays true.

KNOWLEDGE (CLAUDE.md, rules 164 to 184). A person decides from their own beliefs, sightings and what they were told, never from another person's live private state or the world's true contents.

NEVER EDIT TO MAKE A CHECK PASS (WORKFLOW.md:31; docs/DEVELOPMENT_POLICY.md:176): tests/v*_continuation.*, tests/helpers/v*ref.ts, tests/golden.expected.json, tests/zz_review_*, any existing assertion, evidence folders, package.json, package-lock.json. A failing pin means your gate leaked.

TESTS (tests/bread_feeds.test.ts; tests/helpers/kit.ts). New file tests/<name>.test.ts importing { afterEach, describe, expect, it } from 'vitest'. Header comment names rule and module; "STAGED:" for a hand-built world. Build with stage, addPerson, building, done; set w.settings.dynamics = 'rich' and w.settings.rulesVersion = version. afterEach restores the switch. First test: SUPPORTED_RULES_VERSIONS contains N and parseIntervention('rich-no-<name>').spec matches. Every behaviour test contrasts N with N-1; one removes each part; assert conservation.

STYLE (observed in src/sim and the git log, not a written rule). British spelling, plain concrete sentences, no em dashes or emojis.

CLAIMS (docs/DEVELOPMENT_POLICY.md "Matching evidence to the claim"). Claim no benefit. List each existing module touched and why, and what you did not check.
