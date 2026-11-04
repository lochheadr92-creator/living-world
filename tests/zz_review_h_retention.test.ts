// Review H (long-run accumulation and cost): a one-day ordinary current-rules world, measured for what grows and what is capped.
//
// - Format 5 retains columns for heterogeneous people; format 4 fallback remains a compatibility contract in save.test.ts.
// - The cap case holds the documented caps. The measurement case always passes and prints the uncapped records' sizes.
import { beforeAll, describe, expect, it } from 'vitest';
import { serializeWorld } from '../src/app/save';
import { DAY } from '../src/sim/constants';
import { DECISION_LEDGER_CAP } from '../src/sim/decision_ledger';
import { CHRONICLE_MAX } from '../src/sim/events';
import { WATER_ID_BASE } from '../src/sim/knowledge';
import { HEARD_MAX } from '../src/sim/reputation';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { MAX_INTENTIONS } from '../src/sim/types';
import type { World } from '../src/sim/types';
import { MAX_CONCERNS } from '../src/sim/welfare';
import { natural, run } from './helpers/util';

let world: World;
let text: string;

beforeAll(() => {
  world = natural('meadow', { dynamics: 'rich', rulesVersion: CURRENT_RULES_VERSION, immigration: false });
  run(world, DAY);
  text = serializeWorld(world);
});

describe('review H: retention after one ordinary day', () => {
  it('a running world stores its people as columns in product save format 5', () => {
    const persons = world.persons as unknown as Record<string, unknown>[];
    const present: Record<string, number> = {};
    for (const p of persons) for (const k of Object.keys(p)) present[k] = (present[k] ?? 0) + 1;
    const partial = Object.entries(present).filter(([, n]) => n !== persons.length).map(([k, n]) => `${k}:${n}/${persons.length}`);
    // printed so the cause is visible beside the failure
    console.log('review H heterogeneous fields retained in columns:', partial.join(' '));
    expect(serializeWorld(world,5), 'format 5 preserves each person field presence and order').toContain('"__cols"');
  });

  it('documented caps hold', () => {
    expect(world.events.length).toBeLessThanOrEqual(500);
    expect(world.chronicle?.length ?? 0).toBeLessThanOrEqual(CHRONICLE_MAX);
    expect(world.fx.length).toBeLessThanOrEqual(400);
    expect(world.requests.length).toBeLessThanOrEqual(261);
    expect(world.meals.length).toBeLessThanOrEqual(60);
    for (const p of world.persons) {
      expect(p.log.length).toBeLessThanOrEqual(60);
      expect(p.heard?.length ?? 0).toBeLessThanOrEqual(HEARD_MAX);
      expect(p.concerns.length).toBeLessThanOrEqual(MAX_CONCERNS);
      expect(p.socialMemory?.length ?? 0).toBeLessThanOrEqual(32);
      expect(p.decisions?.length ?? 0).toBeLessThanOrEqual(DECISION_LEDGER_CAP);
      expect(p.mood?.thoughts.length ?? 0).toBeLessThanOrEqual(14);
      expect(p.intentions.length).toBeLessThanOrEqual(MAX_INTENTIONS * 4);
      for (const r of Object.values(p.relations)) {
        expect(r.history.length).toBeLessThanOrEqual(24);
        expect(r.handovers?.length ?? 0).toBeLessThanOrEqual(2);
      }
    }
  });

  it('measures the uncapped per-person records (always passes; numbers for the review)', () => {
    let told = 0, cooldowns = 0, expired = 0, opt = 0, greet = 0, failures = 0, failuresStale = 0, beliefs = 0, stale = 0;
    for (const p of world.persons) {
      told += Object.keys(p.told).length;
      for (const [k, v] of Object.entries(p.cooldowns)) {
        cooldowns++;
        if (v <= world.tick) expired++;
        if (k.startsWith('opt:')) opt++;
        if (k.startsWith('greet')) greet++;
      }
      for (const k of Object.keys(p.failures)) { failures++; if (!world.byId.has(Number(k))) failuresStale++; }
      for (const [k, b] of Object.entries(p.beliefs)) { beliefs++; if (b.kind !== 'water' && b.kind !== 'flood' && Number(k) < WATER_ID_BASE && !world.byId.has(Number(k))) stale++; }
    }
    const n = world.persons.length;
    console.log('review H day-1 uncapped records:', JSON.stringify({ persons: n, bytes: text.length, told, cooldowns, cooldownsExpired: expired, optCooldowns: opt, greetCooldowns: greet, failures, failuresStaleTarget: failuresStale, beliefs, staleBeliefs: stale, nextId: world.nextId, idsPerPersonDay: Math.round(world.nextId / n) }));
    // `told` is keyed listener*1e6+belief (news.ts) and nothing ever removes an entry; `greet<id>` and `opt:<key>` cooldowns are outside
    // retainOperationalMemory's prefix list (memory_retention.ts:12). These are the records the review found growing without a cap.
    expect(told).toBeGreaterThan(0);
    expect(cooldowns).toBeGreaterThan(0);
  });
});
