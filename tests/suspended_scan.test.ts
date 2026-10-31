// LW-01 (review 2) ordinary scan: the same unmodified five-day river world in which review 2 found two paused activities (a gather
// at tick 2,959 and a hut build at tick 7,645) vanish with no ending. At rules 116 every paused activity that leaves a person must
// either be resumed, still be paused, or have reached the common ending path. The detection is review 2's own
// (`review_evidence/whole_repo_b2cf812/ordinary_suspension_scan.test.ts`).
import { expect, it } from 'vitest';
import { conservationReport } from '../src/sim/economy';
import { createWorld } from '../src/sim/factory';
import { DAY } from '../src/sim/constants';
import { currentWorldSettings } from '../src/sim/profiles';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { stepWorld } from '../src/sim/world';
import type { Activity } from '../src/sim/types';

it('no paused activity is lost silently in five ordinary river days at the current rules', { timeout: 300000 }, () => {
  const w = createWorld(currentWorldSettings('normal', 'river', { immigration: false }));
  expect(w.settings.rulesVersion).toBe(CURRENT_RULES_VERSION);
  expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(116);
  const ended = new Set<number>();
  w.hooks = { onActivityEnd: (_p, a) => ended.add(a.id) };
  const losses: { tick: number; kind: string; label: string }[] = [];
  for (let n = 0; n < 5 * DAY; n++) {
    const before = new Map<number, Activity>();
    for (const p of w.persons) if (p.suspended) before.set(p.id, p.suspended);
    const tick = w.tick;
    stepWorld(w);
    for (const p of w.persons) {
      const a = before.get(p.id);
      if (!a || p.activity?.id === a.id || p.suspended?.id === a.id || ended.has(a.id)) continue;
      losses.push({ tick, kind: a.kind, label: a.label });
    }
  }
  expect(losses).toEqual([]);
  expect(conservationReport(w).ok).toBe(true);
});
