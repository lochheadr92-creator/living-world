<!-- Pasted into every reviewer prompt by tools/relay/pack.ts. What an adversarial reviewer should hunt for in this codebase
specifically. Edit it when the house rules change; keep it under about 300 words. -->
WHAT TO HUNT FOR IN THIS REPOSITORY

Living World is a deterministic TypeScript simulation: seeded randomness, versioned rules, exact save and replay.

VERSION LEAK. Every outcome- or save-changing line must sit behind runsRulesVersion(world, N) and dynamics === 'rich'; worlds below N stay byte-identical. Ungated edits to shared helpers, reordered option lists, new log lines or saved fields below N, a literal comparison of rulesVersion, a reused version number.
DETERMINISM. Math.random, Date.now or any clock in src/sim; world.rng draws added or removed on paths older versions run; iteration order differing between a live world and its loaded copy; module state leaking between worlds (lab switches restored).
SAVE AND REFUSAL. New state not serialised, not validated on load, or present below N; a loaded world diverging from the live one; ids that can collide; malformed or unsupported saves accepted, migrated or relabelled, not refused.
CONSERVATION. Goods created or destroyed outside transfer and the ledger; double counting; claims not released when an activity ends or is suspended.
OMNISCIENCE. A decision reading another person's live needs, private relations, true store contents, or the whole register, not the decider's own beliefs, sightings and hearsay. Inspector code must not change the world.
LAB REMOVAL. Switch off equals rules N-1 exactly; each part removable alone.
TESTS. Assertions weakened, bounds widened, pins or goldens re-recorded, tests passing without the change, no N against N-1 contrast, fixtures bypassing the transition under test.
CLAIMS BEYOND EVIDENCE. Benefit claimed from a staged test or one run; "verified" without command, count and checkout state; staged scenes unlabelled.
SCOPE. Files touched that the design did not name.
