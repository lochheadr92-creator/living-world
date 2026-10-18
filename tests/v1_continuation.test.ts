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
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import type { V1File } from './helpers/v1ref';

const want = JSON.parse(readFileSync(new URL('./v1_continuation.expected.json', import.meta.url), 'utf8')) as V1File;

describe('a world on an older rules version continues on that version', () => {
  for (const c of V1_CASES) {
    it(
      `${c.name}: a version-${c.version} world saved at ${c.saveAt}, read back and run on, is unchanged`,
      () => {
        const got = computeV1Case(c);
        for (const t of c.ticks) {
          const a = got[String(t)];
          const b = want.cases[c.name][String(t)];
          // the counts first: they say WHAT moved, and a failure that only prints two hashes is not actionable
          expect(a.plans, `${c.name} @${t}: the plans people are carrying`).toEqual(b.plans);
          expect(a.wolfStates, `${c.name} @${t}: what the wolves are doing`).toEqual(b.wolfStates);
          expect({ alive: a.alive, homeFood: a.homeFood, storedFood: a.storedFood, spears: a.spears, droveOff: a.droveOff }, `${c.name} @${t}`).toEqual({
            alive: b.alive,
            homeFood: b.homeFood,
            storedFood: b.storedFood,
            spears: b.spears,
            droveOff: b.droveOff,
          });
          expect(a.hash, `${c.name} @${t}: state hash`).toBe(b.hash);
          expect(a.deep, `${c.name} @${t}: deep hash`).toBe(b.deep);
        }
      },
      120_000,
    );
  }

  it('no version-1 case carries a plan of a kind that did not exist in version 1', () => {
    const kinds = new Set<string>();
    for (const c of V1_CASES.filter((x) => x.version === 1)) for (const pt of Object.values(want.cases[c.name])) for (const k of Object.keys(pt.plans)) kinds.add(k);
    expect([...kinds].sort(), 'the food reserve of version 2 must never appear in a version-1 world').toEqual(['night', 'repair', 'tool']);
  });

  it('no case below version 3 has a spear in it, or a wolf that was driven off', () => {
    const below = V1_CASES.filter((c) => c.version < 3);
    expect(below.length, 'there are cases to check').toBeGreaterThan(0);
    for (const c of below) {
      for (const [t, pt] of Object.entries(want.cases[c.name])) {
        expect(pt.spears, `${c.name} @${t}: spears are a version-3 thing`).toBe(0);
        expect(pt.droveOff, `${c.name} @${t}: being driven off is a version-3 thing`).toBe(0);
      }
    }
  });

  it('the version-2 cases really do have wolves in them, so the check is not vacuous', () => {
    const states = new Set<string>();
    for (const c of V1_CASES.filter((x) => x.version === 2)) for (const pt of Object.values(want.cases[c.name])) for (const k of Object.keys(pt.wolfStates)) states.add(k);
    expect([...states].sort()).toContain('roam');
  });

  it('every supported version below the current one has a case', () => {
    const covered = new Set(V1_CASES.map((c) => c.version));
    for (const v of SUPPORTED_RULES_VERSIONS) {
      if (v >= CURRENT_RULES_VERSION) continue;
      expect(covered.has(v), `version ${v} is supported but has no continuation reference`).toBe(true);
    }
  });
});
