// The iron-chain fix (rules version 8): an ore hunt must reach ore.
//
// The stall, measured: a 160-day ordinary run of `meadow` builds a kiln (day 8), a bakery (day 15) and a timber yard
// (day 6) but never starts a smithy and never smelts - its iron batch count is zero. The reason in code: the smithy
// want needs oreKnown (production.ts), the ore hunt fires only with a worn tool and a kiln belief, and once it fires,
// exploration samples radius 11 -> 24 + 10*curiosity, while ore veins sit 24 -> 46 tiles out on stony ground. The
// hunt never reaches its quarry. These tests pin the fixed behaviour: an ore hunt visits the ore band and comes home
// with a belief.
import { describe, expect, it } from 'vitest';
import { DAY } from '../src/sim/constants';
import { createBuilding } from '../src/sim/buildings';
import { RNG } from '../src/sim/rng';
import { testKit } from '../src/sim/scenes';
import { makeSource } from '../src/sim/sources';
import { mintTool } from '../src/sim/tools';
import { T } from '../src/sim/types';
import type { Person, World } from '../src/sim/types';
import { stepWorld } from '../src/sim/world';
import { settingsFor } from './helpers/util';
import { observe } from '../src/sim/knowledge';

/** Veins on the four diagonals, 45 tiles out from the camp (43.5, 43.5): beyond idle reach (38), inside the ore hunt's band (24-47). */
const VEINS: [number, number][] = [[75, 75], [11, 75], [75, 11], [11, 11]];
const IDLE_REACH = 34; // rMax 24 + 10*curiosity(0.5) = 29, plus sense radius 9, minus the walk's margin

function oreHuntWorld(seed: string, nHunters = 3, withKiln = true): { w: World; hunters: Person[] } {
  const w = testKit.flatWorld(settingsFor(seed));
  const rng = new RNG(seed.length + 1);
  const hunters: Person[] = [];
  const spots: [number, number][] = [[42.5, 41.5], [44.5, 40.5], [41.5, 44.5]];
  for (let i = 0; i < nHunters; i++) {
    const h = testKit.addPerson(w, rng, { name: 'Hunt' + i, x: spots[i][0], y: spots[i][1], hunger: 92, thirst: 92, energy: 92, traits: { curiosity: 0.5 } });
    const tool = mintTool(w, 'axe', 0, h.hhId, h.id, h.inv, h.id, 'test equipment');
    tool.wear = 40;
    hunters.push(h);
  }
  for (const [vx, vy] of VEINS) {
    makeSource(w, 'ore_vein', vx, vy, 14);
    for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) w.terrain[(vy + v) * w.W + (vx + u)] = T.STONY;
  }
  // The ore hunt's gates (production.ts depositLead) are a known kiln, a worn tool, three known trees, and a household
  // that is not short of food. flatWorld has neither trees nor food sources, so without staging no hunt could ever
  // start: the hunters would neither know three trees nor be fed (they starve within two days of the barren map).
  const kiln = createBuilding(w, 'kiln', 43, 46, 0);
  const trees: [number, number][] = [[34, 42], [36, 45], [38, 41], [49, 45], [51, 42]];
  const treeSrcs = trees.map(([tx, ty]) => makeSource(w, 'tree', tx, ty, 0));
  // a rich, watched berry patch keeps each household fed, and with food in hand their shortage stays below 0.45
  const bushSpots: [number, number][] = [[46, 41], [47, 43], [44, 44]];
  const bushSrcs = bushSpots.map(([bx, by]) => {
    const b = makeSource(w, 'berry_bush', bx, by, 4);
    b.regrowTimer = 0;
    return b;
  });
  for (let i = 0; i < nHunters; i++) {
    const h = hunters[i];
    if (withKiln) observe(w, h, kiln);
    for (const s of treeSrcs) observe(w, h, s);
    for (const b of bushSrcs) observe(w, h, b);
    // a lean-to of their own anchors the exploration rings at home
    const home = createBuilding(w, 'lean_to', spots[i][0] + 3, spots[i][1], h.hhId);
    observe(w, h, home);
  }
  testKit.finish(w, 'natural');
  return { w, hunters };
}

describe('the ore hunt reaches ore (rules version 8)', () => {
  it('adults who know a kiln and hold a worn tool come home with an ore belief', () => {
    const { w, hunters } = oreHuntWorld('ore-reach');
    let oreSeen = false;
    for (let t = 0; t < DAY * 8 && !oreSeen; t++) {
      stepWorld(w);
      for (const h of hunters) if (Object.values(h.beliefs).some((b) => b?.kind === 'ore_vein')) oreSeen = true;
    }
    expect(oreSeen, 'an ore hunt must reach a vein, which idle wandering cannot (idle reach ' + IDLE_REACH + ', veins ' + VEINS.length + ' tiles out)').toBe(true);
  }, 120_000);

  it('without a kiln belief and without a worn tool there is no ore hunt, and no ore is met', () => {
    const { w, hunters } = oreHuntWorld('ore-reason', 3, false);
    for (const h of hunters) {
      const t = w.tools.find((q) => q.holder === h.id);
      if (t) t.wear = 0;
    }
    let oreSeen = false;
    for (let i = 0; i < DAY * 8; i++) {
      stepWorld(w);
      for (const h of hunters) if (Object.values(h.beliefs).some((b) => b?.kind === 'ore_vein')) oreSeen = true;
      // stop early once idle exploration has had more than enough time to reach the band
      if (i > DAY * 3 && oreSeen) break;
    }
    expect(oreSeen, 'idle exploration must not reach a vein (' + IDLE_REACH + ' reach, ore further out)').toBe(false);
  }, 120_000);
});
