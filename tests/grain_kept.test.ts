// Rules 243: grain is kept for bread (src/sim/grain_kept.ts; read in economy.ts pickFood and in production.ts).
// STAGED: a flat world, Hana and her home, a plot of her household's, and the timber yard, kiln, granary or bakery each test
// needs, which she has seen. What she wants built and made is the engine's own answer.
import { afterEach, describe, expect, it } from 'vitest';
import { parseIntervention } from '../scripts/lab/lab';
import { generateOptions } from '../src/sim/decision';
import { pickFood } from '../src/sim/economy';
import { createPlot } from '../src/sim/farming';
import { BAKE_WORTH, GRAIN_IN_PACK, GRAIN_KEPT_PARTS, LOAVES_A_HEAD, grainInPack, setGrainKept } from '../src/sim/grain_kept';
import { observe } from '../src/sim/knowledge';
import { demandsOf, facilityWants } from '../src/sim/production';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { makeSource } from '../src/sim/sources';
import type { BuildingType, Entity, Items, Person, World } from '../src/sim/types';
import { addPerson, building, done, stage } from './helpers/kit';

afterEach(() => setGrainKept(true));

/** Hana, grown and fed, her hut holding what is given, trees and a rock she knows, and the shared buildings asked for (staged). */
function fixture(version: number, o: { home?: Items; inv?: Items; plots?: number; has?: BuildingType[]; share?: Items } = {}) {
  const s = stage('grain-kept'), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  w.tick = 1000;
  const p = addPerson(s, 'Hana', 40.5, 40.5, { age: 32, hunger: 100, thirst: 100, energy: 100, traits: { diligence: 0.5, generosity: 0.4, curiosity: 0.2, sociability: 0.5 }, inv: o.inv ?? {} });
  const home = building(s, 'hut', 36, 36, p.hhId, o.home ?? {});
  w.households.find((h) => h.id === p.hhId)!.homeId = home.id;
  const things: Entity[] = [home];
  let x = 46;
  for (const type of o.has ?? []) {
    // a granary holds her household's share where one is asked for (staged: in the bins and in the share book)
    const b = building(s, type, x, 30, 0, type === 'granary' && o.share ? o.share : {});
    if (type === 'granary' && o.share) b.ops!.shares[p.hhId] = { ...o.share };
    things.push(b);
    x += 5;
  }
  for (let i = 0; i < 4; i++) things.push(makeSource(w, 'tree', 30 + i * 2, 48, 8));
  things.push(makeSource(w, 'rock', 34, 44, 8));
  for (let i = 0; i < (o.plots ?? 0); i++) { const pl = createPlot(w, 42 + i * 3, 46, p.hhId); pl.state = 'growing'; things.push(pl); }
  done(s);
  for (const e of things) observe(w, p, e);
  return { s, w, p, home };
}
const ctxOf = (w: World, p: Person) => generateOptions(w, p, true, true);
const wantsBuilt = (w: World, p: Person, type: BuildingType): boolean => facilityWants(ctxOf(w, p)).some((f) => f.type === type);
const breadWant = (w: World, p: Person) => demandsOf(ctxOf(w, p)).find((d) => d.item === 'bread');

describe('rules 243: grain is kept for bread', () => {
  it('is a supported version, and its removal and each part are lab arms', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(243);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(243);
    for (const arm of ['rich-no-grain-kept', ...GRAIN_KEPT_PARTS.map((k) => 'rich-no-grain-kept-' + k)]) expect(parseIntervention(arm).spec).toBe(arm);
  });

  it('raw grain is the last thing eaten, where it was the third; with nothing else it is still eaten', () => {
    const now = fixture(243).w, before = fixture(242).w;
    expect(pickFood({ grain: 3, fish: 2 }, 78, before), 'before, grain fits a hunger of 22 best').toBe('grain');
    expect(pickFood({ grain: 3, fish: 2 }, 78, now)).toBe('fish');
    expect(pickFood({ grain: 3, berries: 2 }, 30, now)).toBe('berries');
    expect(pickFood({ grain: 3, bread: 1 }, 30, now)).toBe('bread');
    expect(pickFood({ grain: 3 }, 30, now), 'somebody with nothing but grain eats it').toBe('grain');
    expect(pickFood({ grain: 3, wood: 5 } as Items, 30, now), 'things that are not food are nothing else to eat').toBe('grain');
  });

  it('one grain is kept from the bins for the day, where three or four were', () => {
    const now = fixture(243).w, before = fixture(242).w;
    expect(grainInPack(now, 4)).toBe(GRAIN_IN_PACK);
    expect(grainInPack(now, 3)).toBe(1);
    expect(grainInPack(before, 4)).toBe(4);
    expect(grainInPack(before, 2)).toBe(2);
  });

  it('a household that works a plot wants a granary though it holds no grain; before, it did not', () => {
    const now = fixture(243, { plots: 1, has: ['timber_yard'] });
    expect(wantsBuilt(now.w, now.p, 'granary')).toBe(true);
    const before = fixture(242, { plots: 1, has: ['timber_yard'] });
    expect(wantsBuilt(before.w, before.p, 'granary')).toBe(false);
    const noPlot = fixture(243, { has: ['timber_yard'] });
    expect(wantsBuilt(noPlot.w, noPlot.p, 'granary'), 'no plot, no granary').toBe(false);
    const noYard = fixture(243, { plots: 1 });
    expect(wantsBuilt(noYard.w, noYard.p, 'granary'), 'and it still waits for a timber yard, for the planks').toBe(false);
  });

  it('and wants a bakery once a kiln stands, for the plot or for a granary it knows', () => {
    const plot = fixture(243, { plots: 1, has: ['timber_yard', 'kiln'] });
    expect(wantsBuilt(plot.w, plot.p, 'bakery')).toBe(true);
    const granary = fixture(243, { has: ['timber_yard', 'kiln', 'granary'] });
    expect(wantsBuilt(granary.w, granary.p, 'bakery')).toBe(true);
    const before = fixture(242, { plots: 1, has: ['timber_yard', 'kiln'] });
    expect(wantsBuilt(before.w, before.p, 'bakery')).toBe(false);
    const noKiln = fixture(243, { plots: 1, has: ['timber_yard'] });
    expect(wantsBuilt(noKiln.w, noKiln.p, 'bakery'), 'it still waits for a kiln, for the bricks').toBe(false);
    const built = fixture(243, { plots: 1, has: ['timber_yard', 'kiln', 'granary', 'bakery'] });
    expect(wantsBuilt(built.w, built.p, 'granary'), 'one that stands is not wanted again').toBe(false);
    expect(wantsBuilt(built.w, built.p, 'bakery')).toBe(false);
  });

  it('a household with four grain in the bins wants bread though it is short of food; before, bread waited for plenty', () => {
    const now = fixture(243, { share: { grain: 5 }, has: ['bakery', 'granary'] });
    const want = breadWant(now.w, now.p);
    expect(want, 'five grain and nothing else is far short of what a household needs').toBeTruthy();
    expect(want!.qty).toBe(LOAVES_A_HEAD);
    expect(want!.base).toBeGreaterThanOrEqual(BAKE_WORTH * 0.5);
    const before = fixture(242, { share: { grain: 5 }, has: ['bakery', 'granary'] });
    expect(breadWant(before.w, before.p)).toBeUndefined();
    const carried = fixture(243, { inv: { grain: 5 }, has: ['bakery'] });
    expect(breadWant(carried.w, carried.p), 'grain in the pack counts as well').toBeTruthy();
    const little = fixture(243, { share: { grain: 3 }, has: ['bakery', 'granary'] });
    expect(breadWant(little.w, little.p), 'under four grain there is nothing to bake').toBeUndefined();
    const noBakery = fixture(243, { share: { grain: 5 }, has: ['granary'] });
    expect(breadWant(noBakery.w, noBakery.p), 'and nowhere to bake it').toBeUndefined();
    const enough = fixture(243, { share: { grain: 5, bread: LOAVES_A_HEAD }, has: ['bakery', 'granary'] });
    expect(breadWant(enough.w, enough.p), 'three loaves a head is enough').toBeUndefined();
  });

  it('grain glanced at in her own home counts as one at most, whatever is there (rules 169): the bins are where grain is counted', () => {
    const home = fixture(243, { home: { grain: 9 }, has: ['bakery'] });
    expect(home.p.beliefs[home.home.id].items?.grain ?? 0, 'what she remembers of nine grain at home is one at most').toBeLessThanOrEqual(1);
    expect(breadWant(home.w, home.p)).toBeUndefined();
  });

  it('each part can be removed', () => {
    setGrainKept(false, 'spare');
    const w = fixture(243).w;
    expect(pickFood({ grain: 3, fish: 2 }, 78, w)).toBe('grain');
    setGrainKept(true);
    setGrainKept(false, 'bins');
    expect(grainInPack(w, 4)).toBe(4);
    setGrainKept(true);
    setGrainKept(false, 'want');
    const plot = fixture(243, { plots: 1, has: ['timber_yard', 'kiln'] });
    expect(wantsBuilt(plot.w, plot.p, 'granary')).toBe(false);
    expect(wantsBuilt(plot.w, plot.p, 'bakery')).toBe(false);
    setGrainKept(true);
    setGrainKept(false, 'bake');
    const short = fixture(243, { share: { grain: 5 }, has: ['bakery', 'granary'] });
    expect(breadWant(short.w, short.p)).toBeUndefined();
  });
});
