import { describe, expect, it } from 'vitest';
import { startActivity } from '../src/sim/activities';
import { DAY } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { weightOf } from '../src/sim/economy';
import { observe } from '../src/sim/knowledge';
import { carryCap } from '../src/sim/people';
import { makeSource } from '../src/sim/sources';
import { addPerson, building, done, give, stage } from './helpers/kit';
import { run } from './helpers/util';

describe('making a tool', () => {
  it('a person whose pack has no room left can still finish a tool: the wood it is made from leaves the pack as the tool is made', () => {
    const s = stage('craft-full-pack');
    // 3 wood, 5 berries and an axe come to nearly all of what an adult can carry: a basket does not fit beside all that wood, but does once the wood is used
    const p = addPerson(s, 'Tomas', 44, 44, { inv: { wood: 3, berries: 5 }, traits: { diligence: 0.9 } });
    const hut = building(s, 'hut', 46, 46, p.hhId);
    for (let i = 0; i < 4; i++) makeSource(s.w, 'tree', 47 + i, 50, 6);
    const w = done(s);
    give(w, p, 'axe');
    w.households.find((h) => h.id === p.hhId)!.homeId = hut.id;
    for (const e of [...w.sources, ...w.buildings]) observe(w, p, e);
    w.tick = DAY * 3;
    p.stats.gathered = 12; // someone who has picked enough to want a basket
    const free = carryCap(w, p) - weightOf(p.inv);
    expect(free).toBeGreaterThanOrEqual(0);
    expect(free).toBeLessThan(1); // no room for a basket (weight 1) on top of what is carried
    const craft = generateOptions(w, p).options.find((o) => o.kind === 'craft' && o.key === 'craft:basket' && o.make);
    expect(craft, 'an option to make a basket').toBeTruthy();
    startActivity(w, p, craft!.make!()!);
    run(w, 400);
    expect(p.inv.basket ?? 0).toBe(1);
    expect(p.inv.wood ?? 0).toBe(0);
    expect(p.lastResult?.detail ?? '').not.toMatch(/no room/);
    expect(weightOf(p.inv)).toBeLessThanOrEqual(carryCap(w, p));
  });
});
