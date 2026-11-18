// Rules 256: the weather, arrivals, spoilage, tree seeding and wild grain draw from keys and not from the shared stream (src/sim/keyed_draws.ts).
// Tests that name a rules-255 contrast fail if the rule is taken out. The twin at the length the brief asks for (day 5 and day 25, three seeds)
// is scripts/keyed_twin.ts, run as a gate and recorded in review_evidence/stage1c-20261118/; the one here is short.
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { updateEnvironment } from '../src/sim/environment';
import { createWorld } from '../src/sim/factory';
import {
  KEYED_DRAWS_FROM,
  KEYED_DRAWS_PARTS,
  grainSeedRoll,
  keyAt,
  keyMix,
  keyUnit,
  keyedDrawsPartOn,
  keyedOn,
  setKeyedDraws,
  spoilPrefix,
  SPOIL_STORE,
} from '../src/sim/keyed_draws';
import type { KeyedDrawsPart } from '../src/sim/keyed_draws';
import { immigrationTick } from '../src/sim/lifecycle';
import { currentWorldSettings } from '../src/sim/profiles';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { makeSource, updateSources } from '../src/sim/sources';
import { hashWorld, spoilGoods, stepWorld } from '../src/sim/world';
import { parseIntervention } from '../scripts/lab/lab';
import { addPerson, building, done, stage } from './helpers/kit';
import type { World } from '../src/sim/types';

afterEach(() => setKeyedDraws(true));

function scene(rules: number, name = 'keyed-scene') {
  const s = stage(name);
  s.w.settings.dynamics = 'rich';
  s.w.settings.rulesVersion = rules;
  return s;
}

describe('rules 256: version and switches', () => {
  it('is a supported, current version', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(256);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(256);
    expect(KEYED_DRAWS_FROM).toBe(256);
  });
  it('is on from 256 in rich worlds and nowhere else', () => {
    for (const part of KEYED_DRAWS_PARTS) {
      expect(keyedOn(scene(256).w, part)).toBe(true);
      expect(keyedOn(scene(255).w, part)).toBe(false);
      const authored = scene(256).w;
      authored.settings.dynamics = 'authored';
      expect(keyedOn(authored, part)).toBe(false);
    }
  });
  it('the lab switch turns every part off, or one, and puts them back', () => {
    const w = scene(256).w;
    const all = parseIntervention('rich-no-keyed-draws');
    expect(all.summary).toMatch(/256/);
    const undo = all.install!();
    for (const part of KEYED_DRAWS_PARTS) expect(keyedOn(w, part)).toBe(false);
    undo();
    for (const part of KEYED_DRAWS_PARTS) expect(keyedOn(w, part)).toBe(true);
    const one = parseIntervention('rich-no-keyed-draws-weather').install!();
    expect(keyedDrawsPartOn('weather')).toBe(false);
    expect(keyedDrawsPartOn('arrivals')).toBe(true);
    one();
    expect(() => parseIntervention('rich-no-keyed-draws-nothing')).toThrow(/no such part/);
  });
});

describe('rules 256: a draw is a function of its key (contract 3)', () => {
  it('the same key gives the same number, whatever the shared stream has done', () => {
    const a = scene(256).w;
    const b = scene(256).w;
    for (let i = 0; i < 50; i++) b.rng.next();
    for (const part of KEYED_DRAWS_PARTS) {
      for (const t of [0, 1, 239, 240, 5011, 115211]) expect(keyAt(a, part, t)).toBe(keyAt(b, part, t));
    }
    expect(keyUnit(keyMix(keyAt(a, 'trees', 480), 17, 2))).toBe(keyUnit(keyMix(keyAt(b, 'trees', 480), 17, 2)));
  });
  it('another seed, system, tick, id or counter gives another number', () => {
    const w = scene(256).w;
    const other = scene(256, 'keyed-other-seed').w;
    const k = keyAt(w, 'weather', 480);
    expect(keyAt(other, 'weather', 480)).not.toBe(k);
    expect(keyAt(w, 'arrivals', 480)).not.toBe(k);
    expect(keyAt(w, 'weather', 481)).not.toBe(k);
    expect(keyMix(k, 1, 0)).not.toBe(keyMix(k, 2, 0));
    expect(keyMix(k, 1, 0)).not.toBe(keyMix(k, 1, 1));
  });
});

describe('rules 256: the draws are uniform enough (contract 4)', () => {
  const N = 100000;
  /** five standard errors of a share p over N draws */
  const tol = (p: number): number => 5 * Math.sqrt((p * (1 - p)) / N);
  const shapes: Record<string, (w: World, part: KeyedDrawsPart, i: number) => number> = {
    'one key per tick': (w, part, i) => keyUnit(keyAt(w, part, i)),
    'one id per tick': (w, part, i) => keyUnit(keyMix(keyAt(w, part, 6000), i, 0)),
    'one counter on one key': (w, part, i) => keyUnit(keyMix(keyAt(w, part, 6000), 77, i)),
    'one unit of a heap': (w, part, i) => keyUnit(keyMix(spoilPrefix(keyAt(w, part, 6000), SPOIL_STORE, 41, 'berries'), i)),
  };
  for (const part of KEYED_DRAWS_PARTS) {
    for (const [shape, draw] of Object.entries(shapes)) {
      it(`${part}, ${shape}: the share below each intended chance is within five standard errors, and ten bins are even`, () => {
        const w = scene(256).w;
        const bins = new Array<number>(10).fill(0);
        const below = new Map<number, number>([[0.011, 0], [0.04, 0], [0.2, 0], [0.35, 0]]);
        let lo = 1;
        let hi = 0;
        for (let i = 0; i < N; i++) {
          const u = draw(w, part, i);
          if (u < lo) lo = u;
          if (u > hi) hi = u;
          bins[Math.floor(u * 10)]++;
          for (const p of below.keys()) if (u < p) below.set(p, below.get(p)! + 1);
        }
        expect(lo).toBeGreaterThanOrEqual(0);
        expect(hi).toBeLessThan(1);
        for (const [p, n] of below) expect(Math.abs(n / N - p)).toBeLessThan(tol(p));
        const chi = bins.reduce((s, c) => s + (c - N / 10) ** 2 / (N / 10), 0);
        expect(chi).toBeLessThan(35); // 9 degrees of freedom: the 0.0001 point is about 33
      });
    }
  }
});

describe('rules 256: an extra shared draw moves nothing the five systems draw (contract 1), and does at 255', () => {
  const run = (rules: number, extraDraw: boolean): { weather: string[]; arrivals: string[]; spoilage: string[]; trees: string[]; grain: boolean[] } => {
    const weather: string[] = [];
    for (let j = 0; j < 12; j++) {
      const w = scene(rules).w;
      w.tick = 3000 + 97 * j;
      w.weather.kind = 'clear';
      w.weather.nextChange = w.tick;
      if (extraDraw) w.rng.next();
      updateEnvironment(w);
      weather.push(`${w.weather.kind}/${w.weather.nextChange - w.tick}`);
    }
    const arrivals: string[] = [];
    for (let j = 0; j < 24; j++) {
      const s = scene(rules);
      for (let i = 0; i < 4; i++) addPerson(s, 'P' + i, 20 + i, 20, { inv: { berries: 12 }, age: 25 });
      building(s, 'hut', 24, 22);
      const w = done(s);
      w.settings.immigration = true;
      w.tick = 5000 + 400 * j + 211;
      if (extraDraw) w.rng.next();
      immigrationTick(w);
      arrivals.push(w.persons.slice(4).map((p) => `${p.name}:${p.sex}:${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(';') || '-');
    }
    const spoilage: string[] = [];
    {
      const s = scene(rules);
      const store = building(s, 'storehouse', 20, 20, 0, { fish: 150, berries: 100 });
      const w = done(s);
      if (extraDraw) w.rng.next();
      // the heap is refilled before every call, so each call is a fresh sample; one shared draw moves a long run of single draws by one place and
      // changes a call only where a draw crosses the chance, so this needs many calls to show at 255
      for (let j = 0; j < 150; j++) {
        store.store.items.fish = 150;
        store.store.items.berries = 100;
        w.tick = 59 + 120 * j;
        spoilGoods(w);
        spoilage.push(`${store.store.items.fish ?? 0}/${store.store.items.berries ?? 0}`);
      }
    }
    const trees: string[] = [];
    {
      const s = scene(rules);
      const w = done(s);
      w.stats.trees = 0;
      w.stats.treeCap = 1000;
      for (let i = 0; i < 40; i++) {
        const t = makeSource(w, 'tree', 10 + (i % 8) * 3, 10 + Math.floor(i / 8) * 3, 6, 1);
        t.growth = 1;
        t.amount = Math.max(2, t.max);
      }
      if (extraDraw) w.rng.next();
      for (let j = 0; j < 2400; j++) {
        w.tick = 240 * 20 + j;
        updateSources(w);
      }
      trees.push(String(w.sources.length), ...w.sources.filter((q) => q.type === 'tree' && q.growth < 1).map((q) => `${q.x},${q.y}`));
    }
    const grain: boolean[] = [];
    {
      const w = scene(rules).w;
      if (extraDraw) w.rng.next();
      for (let j = 0; j < 60; j++) {
        w.tick = 100 + j;
        grain.push(grainSeedRoll(w, 7, 9));
      }
    }
    return { weather, arrivals, spoilage, trees, grain };
  };
  const systems = ['weather', 'arrivals', 'spoilage', 'trees', 'grain'] as const;

  it('at 256 the weather, arrivals, spoilage, tree and grain draws are the same with and without an extra shared draw', () => {
    const a = run(256, false);
    const b = run(256, true);
    for (const sys of systems) expect(b[sys], sys).toEqual(a[sys]);
    // not vacuous: the draws did something
    expect(new Set(a.weather).size).toBeGreaterThan(2);
    expect(a.arrivals.filter((x) => x !== '-').length).toBeGreaterThan(2);
    expect(new Set(a.spoilage).size).toBeGreaterThan(5);
    expect(Number(a.trees[0])).toBeGreaterThan(40);
    expect(a.grain.some(Boolean)).toBe(true);
    expect(a.grain.some((x) => !x)).toBe(true);
  });
  it('at 255 each of them changes (this fails if the rule is taken out)', () => {
    const a = run(255, false);
    const b = run(255, true);
    for (const sys of systems) expect(b[sys], sys).not.toEqual(a[sys]);
  });
  it('with a part switched off at 256, that part follows the shared stream again and the others stay keyed', () => {
    setKeyedDraws(false, 'weather');
    const a = run(256, false);
    const b = run(256, true);
    expect(b.weather).not.toEqual(a.weather);
    for (const sys of systems.filter((x) => x !== 'weather')) expect(b[sys], sys).toEqual(a[sys]);
  });
});

describe('rules 256: with every part off a 256 world is a 255 world (contract 2, short)', () => {
  const make = (seed: string, rules: number): World => createWorld({ ...currentWorldSettings('normal', seed, { immigration: true }), rulesVersion: rules });
  // the hash carries the rules version, so the label is made the same before hashing (as scripts/draw_first_diff.ts does)
  const h = (w: World): string => {
    const v = w.settings.rulesVersion;
    w.settings.rulesVersion = 255;
    const x = hashWorld(w);
    w.settings.rulesVersion = v;
    return x;
  };
  for (const seed of ['keyed-twin-a', 'keyed-twin-b', 'keyed-twin-c']) {
    it(`${seed}: the same hash at day 0.5 and day 1.25`, () => {
      setKeyedDraws(false);
      const a = make(seed, 256);
      const b = make(seed, 255);
      for (let t = 0; t < 3000; t++) {
        stepWorld(a);
        stepWorld(b);
        if (t === 1199) expect(h(a)).toBe(h(b));
      }
      expect(h(a)).toBe(h(b));
    }, 120000);
  }
});

describe('rules 256: save in the middle, load, continue (contract 5)', () => {
  it('a keyed world loaded from a save continues exactly as the uninterrupted world does', () => {
    const w = createWorld({ ...currentWorldSettings('normal', 'keyed-save', { immigration: true }), rulesVersion: 256 });
    while (w.tick < 2500) stepWorld(w);
    const copy = deserializeWorld(serializeWorld(w));
    for (let i = 0; i < 400; i++) {
      stepWorld(w);
      stepWorld(copy);
    }
    expect(hashWorld(copy)).toBe(hashWorld(w));
    expect(serializeWorld(copy)).toBe(serializeWorld(w));
  }, 120000);
  it('a 256 world differs from a 255 world in the same seed once a keyed draw has been made', () => {
    const a = createWorld({ ...currentWorldSettings('normal', 'keyed-differs', { immigration: true }), rulesVersion: 256 });
    const b = createWorld({ ...currentWorldSettings('normal', 'keyed-differs', { immigration: true }), rulesVersion: 255 });
    for (let t = 0; t < 3000; t++) {
      stepWorld(a);
      stepWorld(b);
    }
    expect(hashWorld(a)).not.toBe(hashWorld(b));
  }, 120000);
});
