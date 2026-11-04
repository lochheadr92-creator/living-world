import { expect, it } from 'vitest';
import { conservationReport } from '../../src/sim/economy';
import { createWorld } from '../../src/sim/factory';
import { DAY } from '../../src/sim/constants';
import { currentWorldSettings } from '../../src/sim/profiles';
import { stepWorld } from '../../src/sim/world';
import type { Activity } from '../../src/sim/types';

it('scans one ordinary current-rules world for unrecorded suspended-activity loss', { timeout: 120000 }, () => {
  const w = createWorld(currentWorldSettings('normal', 'river', { immigration: false }));
  const ended = new Set<number>();
  w.hooks = { onActivityEnd: (_p, a) => ended.add(a.id) };
  const losses: Record<string, unknown>[] = [];
  for (let n = 0; n < 5 * DAY; n++) {
    const before = new Map<number, { a: Activity; targetExisted: boolean }>();
    for (const p of w.persons) if (p.suspended) before.set(p.id, { a: p.suspended, targetExisted: !!p.suspended.targetId && w.byId.has(p.suspended.targetId) });
    const tick = w.tick;
    stepWorld(w);
    for (const p of w.persons) {
      const prior = before.get(p.id);
      const a = prior?.a;
      if (!a || p.activity?.id === a.id || p.suspended?.id === a.id || ended.has(a.id)) continue;
      losses.push({
        tick,
        personId: p.id,
        activityId: a.id,
        kind: a.kind,
        label: a.label,
        targetType: a.targetType,
        commitmentId: a.data.commitmentId ?? null,
        expired: tick > a.expire,
        targetExistedBefore: prior.targetExisted,
        targetMissing: !!a.targetId && a.targetType !== 'person' && a.targetType !== 'tile' && !w.byId.has(a.targetId),
        decisionStillOpen: p.decisions?.some((d) => d.activityId === a.id && d.outcome === undefined) ?? false,
        lastResult: p.lastResult ?? null,
        logAtLoss: p.log.filter((l) => l.tick === tick || l.tick === tick + 1),
      });
    }
  }
  const summary = {
    seed: 'river', rulesVersion: w.settings.rulesVersion, ticks: 5 * DAY,
    population: w.persons.length, losses: losses.length, examples: losses.slice(0, 12),
    conservation: conservationReport(w).ok,
  };
  console.log('ORDINARY_SUSPENSION_SCAN ' + JSON.stringify(summary));
  expect(conservationReport(w).ok).toBe(true);
});
