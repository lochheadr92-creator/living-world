// What a failed trip costs. The path finder floods everything it can reach before it gives up, so a goal that cannot be reached is
// the expensive kind of search (docs/SCALING.md). The ordinary world pays it exactly as it always did; a world on the scaled
// rules (rules.ts: wolfRetryAfterFail, unreachableCooldown) does not repeat it straight away.
import { describe, expect, it } from 'vitest';
import { newActivity, startActivity, stepActivity } from '../src/sim/activities';
import { probe, probeReset, probeSnapshot } from '../src/sim/probe';
import { ORDINARY_RULES, rulesOf, scaledRules } from '../src/sim/rules';
import { T } from '../src/sim/types';
import type { World } from '../src/sim/types';
import { makeWolf, updateWildlife } from '../src/sim/wildlife';
import { natural } from './helpers/util';

/** a one-tile pocket of open ground at (cx, cy) walled in by solid tiles: it can be stood on, and cannot be reached */
function pocket(w: World, cx: number, cy: number): void {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const i = (cy + dy) * w.W + (cx + dx);
      w.terrain[i] = T.GRASS;
      w.solid[i] = dx === 0 && dy === 0 ? 0 : 1;
    }
  }
}

function openGround(w: World): { x: number; y: number } {
  for (let r = 0; r < 40; r++) {
    for (let k = 0; k < 40; k++) {
      const x = Math.floor(w.camp.x) + 10 + r;
      const y = Math.floor(w.camp.y) + k - 20;
      let ok = true;
      for (let dy = -6; dy <= 6 && ok; dy++) for (let dx = -6; dx <= 6 && ok; dx++) if (w.terrain[(y + dy) * w.W + x + dx] === T.DEEP) ok = false;
      if (ok && x < w.W - 20 && y > 8 && y < w.H - 8) return { x, y };
    }
  }
  throw new Error('no open ground');
}

describe('a wolf whose goal cannot be reached', () => {
  function searches(ruleSet: 'ordinary' | 'scaled', ticks: number): { calls: number; expanded: number } {
    const w = natural('pathfail-wolf', { ruleSet });
    w.animals.length = 0;
    const at = openGround(w);
    pocket(w, at.x + 12, at.y);
    const wolf = makeWolf(w, at.x, at.y);
    w.animals.push(wolf);
    wolf.state = 'roam';
    wolf.wanderX = at.x + 12.5;
    wolf.wanderY = at.y + 0.5;
    wolf.until = w.tick + 1_000_000; // keep the goal: the point is what happens while it is unreachable
    probe.on = true;
    probeReset();
    for (let i = 0; i < ticks; i++) {
      w.tick++;
      updateWildlife(w);
      wolf.stuck = 0; // stuck detection would pick another goal: not what is being measured
    }
    const snap = probeSnapshot();
    probe.on = false;
    probeReset();
    return { calls: snap.pathCalls, expanded: snap.pathExpanded };
  }

  it('searches again every tick in the ordinary world (unchanged)', () => {
    expect(searches('ordinary', 60).calls).toBeGreaterThanOrEqual(55);
  });

  it('searches again only after its back-off in a world on the scaled rules', () => {
    const r = searches('scaled', 60);
    const wait = scaledRules(28).wolfRetryAfterFail;
    expect(wait).toBeGreaterThan(0);
    expect(r.calls).toBeLessThanOrEqual(Math.ceil(60 / wait) + 1);
    expect(r.calls).toBeGreaterThanOrEqual(1);
    expect(r.expanded).toBeGreaterThan(0);
  });

  it('moves while it waits exactly as it moves when it searches and finds nothing', () => {
    const trail = (ruleSet: 'ordinary' | 'scaled'): number[] => {
      const w = natural('pathfail-wolf-steer', { ruleSet });
      w.animals.length = 0;
      const at = openGround(w);
      pocket(w, at.x + 12, at.y);
      const wolf = makeWolf(w, at.x, at.y);
      w.animals.push(wolf);
      wolf.state = 'roam';
      wolf.wanderX = at.x + 12.5;
      wolf.wanderY = at.y + 0.5;
      wolf.until = w.tick + 1_000_000;
      const out: number[] = [];
      for (let i = 0; i < 25; i++) {
        w.tick++;
        updateWildlife(w);
        wolf.stuck = 0;
        out.push(wolf.x, wolf.y);
      }
      return out;
    };
    const a = trail('ordinary');
    const b = trail('scaled');
    expect(b).toEqual(a);
    expect(Math.hypot(a[48] - a[0], a[49] - a[1])).toBeGreaterThan(0.5); // and it did go somewhere
  });

  it('still looks again as soon as its goal changes', () => {
    const w = natural('pathfail-wolf-goal', { ruleSet: 'scaled' });
    w.animals.length = 0;
    const at = openGround(w);
    pocket(w, at.x + 12, at.y);
    const wolf = makeWolf(w, at.x, at.y);
    w.animals.push(wolf);
    wolf.state = 'roam';
    wolf.wanderX = at.x + 12.5;
    wolf.wanderY = at.y + 0.5;
    wolf.until = w.tick + 1_000_000;
    probe.on = true;
    probeReset();
    w.tick++;
    updateWildlife(w);
    const first = probeSnapshot().pathCalls;
    w.tick++;
    updateWildlife(w); // same goal, inside the back-off: no new search
    expect(probeSnapshot().pathCalls).toBe(first);
    wolf.wanderX = at.x - 6.5; // a new goal, open ground
    wolf.wanderY = at.y + 0.5;
    w.tick++;
    updateWildlife(w);
    const after = probeSnapshot().pathCalls;
    probe.on = false;
    probeReset();
    expect(after).toBe(first + 1);
  });
});

describe('an option that failed for want of any way there', () => {
  function cooldownAfter(ruleSet: 'ordinary' | 'scaled', how: 'unreachable' | 'other'): number {
    const w = natural('pathfail-cooldown', { ruleSet });
    const p = w.persons[0];
    const at = openGround(w);
    pocket(w, at.x + 10, at.y);
    p.x = at.x + 0.5;
    p.y = at.y + 0.5;
    const goalX = how === 'unreachable' ? at.x + 10.5 : at.x + 3.5;
    const a = newActivity(w, p, { kind: 'wander', label: 'Test trip', goal: 'test', spotX: goalX, spotY: at.y + 0.5, tx: goalX, ty: at.y + 0.5, data: { optKey: 'wander:test' }, maxTicks: 3 });
    startActivity(w, p, a);
    if (how === 'unreachable') stepActivity(w, p); // plans the path, finds none, gives the trip up
    else {
      w.tick += 10; // it simply takes too long
      stepActivity(w, p);
    }
    expect(p.activity).toBeNull();
    return (p.cooldowns['opt:wander:test'] ?? 0) - w.tick;
  }

  it('is left alone for 80 ticks in the ordinary world, as before', () => {
    expect(rulesOf(natural('x')).unreachableCooldown).toBe(ORDINARY_RULES.unreachableCooldown);
    expect(cooldownAfter('ordinary', 'unreachable')).toBe(80);
  });

  it('is left alone for much longer on the scaled rules', () => {
    expect(cooldownAfter('scaled', 'unreachable')).toBe(scaledRules(28).unreachableCooldown);
    expect(scaledRules(28).unreachableCooldown).toBeGreaterThan(80);
  });

  it('is left alone for 80 ticks on the scaled rules when it failed some other way', () => {
    expect(cooldownAfter('scaled', 'other')).toBe(80);
  });
});
