// REVIEW-ONLY measurement (adversarial review, 2026-11-01). Not a product test. Safe to delete.
// Question: do ordinary current-rules worlds adopt hand-tool plans whose recipe inputs cannot physically fit in the
// planner's pack (craft requires every input carried at once: act_build.ts craft.begin), and what becomes of them?
import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import { carryCap, stageOf } from '../src/sim/people';
import { TOOL_RECIPE, WEIGHT } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import type { Intention, Person, ToolKind, World } from '../src/sim/types';

interface Life { id: number; who: string; stage: string; cap: number; tool: string; need: number; feasible: boolean; since: number; until: number; status: string; reason: string; wantsHeld: string }

function recipeWeight(tool: ToolKind): number {
  const r = TOOL_RECIPE[tool];
  return r.wood * WEIGHT.wood + r.stone * WEIGHT.stone;
}

function measure(seed: string, ticks: number) {
  const w: World = createWorld(currentWorldSettings('normal', seed, { immigration: false }));
  const lives = new Map<number, Life>();
  let snapshot: unknown = null;
  for (let t = 0; t < ticks; t++) {
    stepWorld(w);
    if (t % 50 !== 0) continue;
    for (const p of w.persons) {
      if (!p.alive) continue;
      for (const i of p.intentions) {
        if (i.kind !== 'tool') continue;
        const capNoBasket = carryCap(w, p) - ((p.inv.basket ?? 0) > 0 ? 6 : 0);
        const need = recipeWeight(i.makes as ToolKind);
        const hasBasket = (p.inv.basket ?? 0) > 0;
        const feasible = need <= capNoBasket + (hasBasket ? 6 : 0);
        const cur = lives.get(i.id);
        const rec: Life = { id: i.id, who: `${p.name}#${p.id}`, stage: stageOf(w, p), cap: carryCap(w, p), tool: i.makes, need, feasible, since: i.since, until: i.until, status: i.status, reason: i.reason, wantsHeld: JSON.stringify({ wood: p.inv.wood ?? 0, stone: p.inv.stone ?? 0 }) };
        if (!cur || cur.status !== i.status) lives.set(i.id, rec);
        // one pure observer snapshot of the first infeasible active plan: what is on offer / blocked for it
        if (!snapshot && !feasible && i.status === 'active' && t > 600) {
          const ctx = generateOptions(w, p, true, true);
          snapshot = {
            tick: w.tick, who: rec.who, stage: rec.stage, cap: rec.cap, tool: i.makes, need, inv: { ...p.inv }, step: i.step, stepKey: i.stepKey, blocked: i.blocked, wants: i.wants,
            craftOffered: ctx.options.filter((o) => o.kind === 'craft').map((o) => ({ key: o.key, util: Math.round(o.util) })),
            blockedForPlan: ctx.blocked.filter((o) => /to make|craft/.test(o.label + (o.tag ?? ''))).map((o) => ({ label: o.label, blocked: o.blocked })),
          };
        }
      }
    }
  }
  // final sweep of still-listed plans (dropped ones stay in the list for a while)
  for (const p of w.persons) for (const i of p.intentions) if (i.kind === 'tool' && lives.has(i.id)) { const l = lives.get(i.id)!; l.status = i.status; l.reason = i.reason; }
  const all = [...lives.values()];
  const summary = {
    seed, ticks, alive: w.persons.filter((p) => p.alive).length,
    toolPlans: all.length,
    infeasible: all.filter((l) => !l.feasible).length,
    byStage: all.reduce((m, l) => ((m[l.stage + (l.feasible ? ':feasible' : ':INFEASIBLE')] = (m[l.stage + (l.feasible ? ':feasible' : ':INFEASIBLE')] ?? 0) + 1), m), {} as Record<string, number>),
    outcomes: all.reduce((m, l) => { const k = `${l.feasible ? 'feasible' : 'INFEASIBLE'}:${l.status}:${l.reason.replace(/\d+/g, '#').slice(0, 60)}`; m[k] = (m[k] ?? 0) + 1; return m; }, {} as Record<string, number>),
    infeasibleList: all.filter((l) => !l.feasible),
    snapshot,
  };
  return summary;
}

describe('REVIEW: hand-tool plans whose inputs cannot fit the planner’s pack', () => {
  for (const seed of ['forest', 'river', 'meadow']) {
    it(`ordinary Normal ${seed} at current rules, 12,000 ticks`, () => {
      const s = measure(seed, 12_000);
      writeFileSync(`C:/Users/RJLoc/AppData/Local/Temp/claude/C--dev-Claude-Experiment/3c06e039-d739-4179-9940-8bfc089f1edb/scratchpad/review/tool_capacity-${seed}.json`, JSON.stringify(s, null, 1));
      expect(s.toolPlans).toBeGreaterThanOrEqual(0);
    });
  }
});
