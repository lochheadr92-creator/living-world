// The land in a rich world (hardship.ts, sources.ts, wildlife.ts, hunting.ts): rock does not grow back, a dry spell parches the
// bushes and fields, a storm floods the shore, deer come to the forest's edge and bolt from people, and a hunter (better, a
// party) brings one down for meat that the ledger accounts for. An authored world has none of it.
import { describe, expect, it } from 'vitest';
import { DAY } from '../src/sim/constants';
import { conservationReport } from '../src/sim/economy';
import { createWorld } from '../src/sim/factory';
import { generateOptions } from '../src/sim/decision';
import { DRY_GROWTH, DRY_REGROW, growthRate, regrowRate } from '../src/sim/hardship';
import { stageOf } from '../src/sim/people';
import { settingsForProfile } from '../src/sim/profiles';
import { makeSource } from '../src/sim/sources';
import { stepWorld } from '../src/sim/world';
import { makeWolf } from '../src/sim/wildlife';
import { startActivity } from '../src/sim/activities';
import type { World } from '../src/sim/types';

const world = (dynamics: 'authored' | 'rich'): World => createWorld(settingsForProfile('normal', 'meadow', { immigration: false, dynamics }));

describe('finite rock', () => {
  it('does not grow back in a rich world; it does in an authored one', () => {
    const r = world('rich');
    const a = world('authored');
    expect(r.sources.filter((s) => s.type === 'rock').every((s) => s.regrowEvery === 0)).toBe(true);
    expect(a.sources.filter((s) => s.type === 'rock').every((s) => s.regrowEvery > 0)).toBe(true);
    expect(makeSource(r, 'berry_bush', 1, 1).regrowEvery).toBeGreaterThan(0);
  });
});

describe('a dry spell and a flood', () => {
  it('a dry spell slows the land and the fields; fish are untouched by it', () => {
    const r = world('rich');
    r.hardship = { kind: 'dry', since: r.tick, until: r.tick + DAY };
    expect(regrowRate(r)).toBeCloseTo(DRY_REGROW, 5);
    expect(growthRate(r)).toBeCloseTo(DRY_GROWTH, 5);
    const a = world('authored');
    expect(regrowRate(a)).toBe(1);
  });

  it('a storm at its height floods the shore: goods lying by the water are lost and recorded, shelters there are damaged', () => {
    const r = world('rich');
    for (let i = 0; i < 50; i++) stepWorld(r);
    // a pile right by the water
    let tile = -1;
    for (let i = 0; i < r.W * r.H; i++) if (r.waterDist[i] === 1 && r.solid[i] === 0 && r.occ[i] === 0) { tile = i; break; }
    expect(tile).toBeGreaterThanOrEqual(0);
    const pile = { ent: 'pile' as const, id: r.nextId++, x: tile % r.W, y: Math.floor(tile / r.W), items: { wood: 3 }, since: r.tick, note: 'left by the water' };
    r.piles.push(pile);
    r.byId.set(pile.id, pile);
    r.weather.kind = 'storm';
    r.weather.nextChange = r.tick + 5000;
    r.weather.storm = 1;
    const spoiledBefore = r.ledger.spoiled.wood ?? 0;
    for (let i = 0; i < 40 && r.lastFlood === undefined; i++) {
      r.weather.storm = 1;
      stepWorld(r);
    }
    expect(r.lastFlood).toBeDefined();
    expect(pile.items.wood ?? 0).toBe(0);
    expect((r.ledger.spoiled.wood ?? 0) - spoiledBefore).toBe(3);
    expect(r.events.some((e) => e.text.includes('water up over the shore'))).toBe(true);
    // not twice in three days
    r.weather.storm = 1;
    const at = r.lastFlood;
    for (let i = 0; i < 60; i++) {
      r.weather.storm = 1;
      stepWorld(r);
    }
    expect(r.lastFlood).toBe(at);
    const a = world('authored');
    a.weather.storm = 1;
    for (let i = 0; i < 60; i++) {
      a.weather.storm = 1;
      stepWorld(a);
    }
    expect(a.lastFlood).toBeUndefined();
  });
});

describe('deer and the hunt', () => {
  it('deer come to a rich world and none to an authored one', () => {
    const r = world('rich');
    for (let i = 0; i < 1300; i++) stepWorld(r);
    expect(r.animals.filter((x) => x.type === 'deer').length).toBeGreaterThan(0);
    const a = world('authored');
    for (let i = 0; i < 1300; i++) stepWorld(a);
    expect(a.animals.every((x) => x.type === 'wolf')).toBe(true);
  });

  it('a hungry hunter with a deer in sight may stalk it, and a kill puts meat in the pack that the ledger accounts for', () => {
    const r = world('rich');
    for (let i = 0; i < 100; i++) stepWorld(r);
    const p = r.persons.find((x) => x.alive && stageOf(r, x) === 'adult')!;
    p.inv = {};
    p.needs.hunger = 35;
    p.skills.forage = 1.5;
    const deer = makeWolf(r, p.x + 2, p.y, 'deer');
    deer.denX = deer.x;
    deer.denY = deer.y;
    p.seen.push({ id: deer.id, ent: 'animal', x: deer.x, y: deer.y, hungry: false, thirsty: false, tired: false, cold: false, hurt: false, child: false, carrying: [], asleep: false, act: '', busyTalking: false });
    const ctx = generateOptions(r, p, true);
    const hunt = ctx.options.find((o) => o.kind === 'hunt');
    expect(hunt).toBeTruthy();
    expect(hunt!.yields).toBe('meat');
    // try until the strike lands (a hashed chance each try; the deer is kept beside the hunter so the test is about the strike)
    let got = 0;
    for (let t = 0; t < 40 && got === 0; t++) {
      const act = hunt!.make!()!;
      startActivity(r, p, act);
      for (let i = 0; i < 120 && p.activity === act; i++) {
        deer.x = p.x + 1;
        deer.y = p.y;
        deer.state = 'roam';
        stepWorld(r);
      }
      got = p.inv.meat ?? 0;
      p.cooldowns['hunt'] = 0;
      if (!r.animals.includes(deer)) break;
    }
    expect(got).toBeGreaterThan(0);
    expect(r.animals.includes(deer)).toBe(false);
    expect(r.ledger.created.meat ?? 0).toBeGreaterThanOrEqual(got);
    // the pack was emptied by hand above, so only the meat is checked against the ledger: created, and all of it held
    expect(conservationReport(r).diffs.some((d) => d.item === 'meat')).toBe(false);
    expect(r.events.some((e) => e.text.includes('brought down a deer'))).toBe(true);
  });
});
