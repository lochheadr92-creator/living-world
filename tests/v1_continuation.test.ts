// Does a world that is still running RULES VERSION 1 carry on exactly as it did before version 2 was written?
//
// The reference in `tests/v1_continuation.expected.json` was recorded from the revision at which version 1 was the whole of
// the behaviour, and it is a continuation: the world is saved and read back through the real save path before the checkpoints
// are taken, because that is what an existing player's world is.
//
// This is deliberately not a check of the version LABEL. A gate that leaked would keep the label and change the world, and
// only comparing the state can see that. If this fails after a behavioural change, the gate is wrong - re-recording the
// reference would delete the only evidence of it.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { V1_CASES, computeV1Case } from './helpers/v1ref';
import type { V1File } from './helpers/v1ref';

const want = JSON.parse(readFileSync(new URL('./v1_continuation.expected.json', import.meta.url), 'utf8')) as V1File;

describe('a version-1 world continues as version 1', () => {
  for (const c of V1_CASES) {
    it(
      `${c.name}: saved at ${c.saveAt}, read back and run on, is unchanged`,
      () => {
        const got = computeV1Case(c);
        for (const t of c.ticks) {
          const a = got[String(t)];
          const b = want.cases[c.name][String(t)];
          // the counts first: they say WHAT moved, and a failure that only prints two hashes is not actionable
          expect(a.plans, `${c.name} @${t}: the plans people are carrying`).toEqual(b.plans);
          expect({ alive: a.alive, homeFood: a.homeFood, storedFood: a.storedFood }, `${c.name} @${t}`).toEqual({
            alive: b.alive,
            homeFood: b.homeFood,
            storedFood: b.storedFood,
          });
          expect(a.hash, `${c.name} @${t}: state hash`).toBe(b.hash);
          expect(a.deep, `${c.name} @${t}: deep hash`).toBe(b.deep);
        }
      },
      120_000,
    );
  }

  it('no case carries a plan of a kind that did not exist in version 1', () => {
    const kinds = new Set<string>();
    for (const c of Object.values(want.cases)) for (const pt of Object.values(c)) for (const k of Object.keys(pt.plans)) kinds.add(k);
    expect([...kinds].sort()).toEqual(['night', 'repair', 'tool']);
  });
});
