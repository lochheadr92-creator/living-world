// The stockyard (docs/BUILDINGS.md, stage A): a common stack of raw goods by the houses: what it takes, who draws on it, how it is
// filled, why it is laid out, and ordinary worlds unchanged.
import { describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { newActivity, startActivity } from '../src/sim/activities';
import { siteConflict } from '../src/sim/act_build';
import { completeSite, createBuilding, createSite } from '../src/sim/buildings';
import { DAY } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { buildable } from '../src/sim/expansion';
import { mayDeposit } from '../src/sim/facilities';
import { delBelief, observe, putBelief } from '../src/sim/knowledge';
import { beliefsByKind, makeCtx } from '../src/sim/optutil';
import { materialNeeds } from '../src/sim/options_work';
import { facilityWants } from '../src/sim/production';
import { YARD_FAR, YARD_TARGET } from '../src/sim/stockyard';
import type { Belief, Building, Person, World } from '../src/sim/types';
import { hashWorld } from '../src/sim/world';
import { natural, run } from './helpers/util';

/** a rich world a few days in, one adult with a home, and a yard they have looked at */
function ready(rich: boolean, withYard = true) {
  const w = natural('stockyard', rich ? { dynamics: 'rich' } : {});
  run(w, Math.round(DAY * 6.1));
  const p = w.persons.find((q) => q.alive && !!w.households.find((h) => h.id === q.hhId)?.homeId)!;
  const h = w.byId.get(w.households.find((x) => x.id === p.hhId)!.homeId) as Building;
  const yard = withYard ? createBuilding(w, 'stockyard', Math.floor(h.x) + 5, Math.floor(h.y) + 4, 0) : null;
  if (yard) observe(w, p, yard);
  // (stood by the house, so no walk tips the balance either way)
  p.x = h.x + h.w / 2;
  p.y = h.y + h.h + 0.5;
  p.px = p.x;
  p.py = p.y;
  for (const k of Object.keys(p.needs) as (keyof Person['needs'])[]) p.needs[k] = 100;
  return { w, p, h, yard: yard! };
}

const belief = (w: World, id: number, kind: Belief['kind'], x: number, y: number, amount = 5): Belief => ({ id, kind, x, y, amount, max: amount, seen: w.tick, src: 'seen', from: 0, learned: w.tick });

describe('the stockyard', () => {
  it('takes raw goods only', () => {
    const w = natural('stockyard-accept', { dynamics: 'rich' });
    const yard = createBuilding(w, 'stockyard', 40, 40, 0);
    for (const k of ['wood', 'stone', 'clay', 'ore'] as const) expect(mayDeposit(yard, k), k).toBe(true);
    for (const k of ['planks', 'bricks', 'berries', 'grain', 'axe', 'water'] as const) expect(mayDeposit(yard, k), k).toBe(false);
  });

  it('is everyone\'s: a person who needs wood for a site and knows a stocked yard considers collecting it there', () => {
    const r = ready(true);
    r.yard.store.items = { wood: 12, stone: 6 };
    observe(r.w, r.p, r.yard);
    const site = createSite(r.w, 'hut', Math.floor(r.h.x) + 9, Math.floor(r.h.y) + 1, r.p.hhId, r.p.id);
    observe(r.w, r.p, site);
    r.p.inv = {};
    const ctx = generateOptions(r.w, r.p, true);
    expect(ctx.options.some((o) => o.kind === 'withdraw' && o.targetId === r.yard.id)).toBe(true);
  });

  it('is filled by whoever carries raw goods beyond their own reserve and their own needs: the option is offered, the stacking happens, and nothing is lost', () => {
    const r = ready(true);
    // (what this person carries for sites, repairs and tools of their own is not spare: the pack has to be bigger than that)
    const needWood = materialNeeds(makeCtx(r.w, r.p, false)).filter((n) => n.item === 'wood').reduce((n, x) => n + x.n, 0);
    r.p.inv = { wood: needWood + 7, stone: 3 };
    const ctx = generateOptions(r.w, r.p, true);
    const opt = ctx.options.find((o) => o.key === `deposit:${r.yard.id}:raw`);
    expect(opt).toBeTruthy();
    expect(opt!.label).toMatch(/Stack .* at the stockyard/);
    // and with nothing to spare, no such option
    r.p.inv = { wood: Math.min(2, needWood + 2) };
    expect(generateOptions(r.w, r.p, true).options.some((o) => o.key === `deposit:${r.yard.id}:raw`)).toBe(false);
    // the stacking itself
    r.p.inv = { wood: 7, stone: 3 };
    r.p.x = r.yard.x + 1;
    r.p.y = r.yard.y + 2.5;
    r.p.px = r.p.x;
    r.p.py = r.p.y;
    const act = newActivity(r.w, r.p, { kind: 'deposit', label: 'Stacking', goal: 'test', targetId: r.yard.id, targetType: 'building', tx: r.yard.x, ty: r.yard.y, spotX: r.p.x, spotY: r.p.y, here: true, maxTicks: 600, data: { items: { wood: 5, stone: 2 }, sticky: true } });
    startActivity(r.w, r.p, act);
    run(r.w, 14); // (just past the stacking: a moment later this person, who has needs of their own, may well collect from the yard again)
    // the pack dropped exactly what was stacked
    expect(r.p.inv.wood).toBe(2);
    expect(r.p.inv.stone).toBe(1);
    expect(r.p.log.some((l) => /Put 5 wood, 2 stone into the stockyard/.test(l.text))).toBe(true);
  });

  it('is kept stocked: someone who knows a low yard and knows trees considers fetching wood for it, and not once it is full', () => {
    const r = ready(true);
    r.yard.store.items = {};
    observe(r.w, r.p, r.yard);
    r.p.inv = {};
    r.p.traits.diligence = 0.95;
    for (let i = 0; i < 4; i++) putBelief(r.p, belief(r.w, 920_000 + i, 'tree', r.h.x - 3, r.h.y + i));
    let found = false;
    for (let t = 0; t < 4 && !found; t++) {
      // (who takes a turn at it is spread over the day: look at a few successive spells)
      const ctx = generateOptions(r.w, r.p, true);
      found = ctx.options.some((o) => o.kind === 'gather' && /stockyard/.test(o.goal));
      if (!found) run(r.w, 400);
    }
    expect(found).toBe(true);
    r.yard.store.items = { wood: YARD_TARGET.wood ?? 0, stone: YARD_TARGET.stone ?? 0 };
    observe(r.w, r.p, r.yard);
    // (checked at once: the yard is everyone's, and within a day builders will have drawn on it again)
    expect(generateOptions(r.w, r.p, true).options.some((o) => o.kind === 'gather' && /stockyard/.test(o.goal))).toBe(false);
  });

  it('has no household on its title when finished, whoever laid it out', () => {
    const w = natural('stockyard-title', { dynamics: 'rich' });
    const p = w.persons.find((q) => q.alive)!;
    const site = createSite(w, 'stockyard', 40, 40, p.hhId, p.id);
    site.delivered = { ...site.required };
    const b = completeSite(w, site, p);
    expect(b.type).toBe('stockyard');
    expect(b.hhId).toBe(0);
  });

  it('is one to a settlement and none in an ordinary world', () => {
    const w = natural('stockyard-one', { dynamics: 'rich' });
    createBuilding(w, 'stockyard', 40, 40, 0);
    expect(siteConflict(w, 'stockyard', 1, 0, 0, { x: 41, y: 41 })).toMatch(/already a stockyard/);
    const o = natural('stockyard-off');
    expect(buildable(o, 'stockyard')).toBe(false);
    expect(siteConflict(o, 'stockyard', 1, 0, 0, { x: 10, y: 10 })).toMatch(/not something this world builds/);
  });

  it('is saved and loaded with its stacks and carries on identically', () => {
    const r = ready(true);
    r.yard.store.items = { wood: 9, ore: 2 };
    run(r.w, 100);
    const c = deserializeWorld(serializeWorld(r.w));
    expect(hashWorld(c)).toBe(hashWorld(r.w));
    run(r.w, 300);
    run(c, 300);
    expect(serializeWorld(c)).toBe(serializeWorld(r.w));
  });
});

describe('the demand for a stockyard', () => {
  function looking(rich: boolean, treeDist: number) {
    const r = ready(rich, false);
    // the wood this person gets is at a set distance from home; a site of theirs wants wood; a yard is known so the settlement builds
    for (const b of beliefsByKind(r.p, ['tree'])) delBelief(r.p, b.id);
    for (let i = 0; i < 6; i++) putBelief(r.p, belief(r.w, 930_000 + i, 'tree', r.h.x + treeDist, r.h.y - 3 + i));
    putBelief(r.p, belief(r.w, 930_050, 'rock', r.h.x - 4, r.h.y));
    const yard = createBuilding(r.w, 'timber_yard', Math.floor(r.h.x) + 6, Math.floor(r.h.y) + 6, 0);
    observe(r.w, r.p, yard);
    const site = createSite(r.w, 'hut', Math.floor(r.h.x) + 9, Math.floor(r.h.y) + 1, r.p.hhId, r.p.id);
    observe(r.w, r.p, site);
    return r;
  }

  it('arises when the wood a person fetches is a long walk from the camp, not when it is close, not in an ordinary world, and not once a yard is known', () => {
    const far = looking(true, YARD_FAR + 12);
    expect(facilityWants(makeCtx(far.w, far.p, false)).some((x) => x.type === 'stockyard')).toBe(true);
    const near = looking(true, 3);
    expect(facilityWants(makeCtx(near.w, near.p, false)).some((x) => x.type === 'stockyard')).toBe(false);
    const plain = looking(false, YARD_FAR + 12);
    expect(facilityWants(makeCtx(plain.w, plain.p, false)).some((x) => x.type === 'stockyard')).toBe(false);
    const real = createBuilding(far.w, 'stockyard', Math.floor(far.h.x) + 3, Math.floor(far.h.y) + 6, 0);
    expect(facilityWants(makeCtx(far.w, far.p, false)).some((x) => x.type === 'stockyard')).toBe(true); // unseen: planning cannot know
    observe(far.w, far.p, real);
    expect(facilityWants(makeCtx(far.w, far.p, false)).some((x) => x.type === 'stockyard')).toBe(false);
  });
});
