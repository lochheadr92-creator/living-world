// Rules 242: bread feeds far more for its size, and keeps (src/sim/bread_feeds.ts; read wherever a food's worth or its
// spoiling is read).
// STAGED: a flat world, one hungry person with food in the pack, and a storehouse of bread. The eating and the spoiling
// are the engine's.
import { afterEach, describe, expect, it } from 'vitest';
import { parseIntervention } from '../scripts/lab/lab';
import { startActivity, stepActivity } from '../src/sim/activities';
import { BREAD_FEEDS, BREAD_FEEDS_PARTS, BREAD_KEEPS, nutritionOf, perishableOf, setBreadFeeds } from '../src/sim/bread_feeds';
import { DAY, NUTRITION, PERISHABLE } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { conservationReport, pickFood } from '../src/sim/economy';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { stepWorld } from '../src/sim/world';
import type { FoodKind, Items, Person, World } from '../src/sim/types';
import { addPerson, building, done, pin, stage } from './helpers/kit';

afterEach(() => setBreadFeeds(true));

/** Ada alone, with what she is given in her pack and the hunger asked, and a storehouse holding the bread asked (staged). */
function fixture(version: number, o: { inv?: Items; hunger?: number; stored?: number } = {}) {
  const s = stage('bread-feeds'), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  w.tick = 1000;
  const p = addPerson(s, 'Ada', 40.5, 60.5, { age: 30, hunger: o.hunger ?? 30, thirst: 100, energy: 100, inv: o.inv ?? {} });
  const store = building(s, 'storehouse', 44, 58, 0, o.stored ? { bread: o.stored } : {});
  done(s);
  return { s, w, p, store };
}
/** She eats what she carries: the offered option, stepped alone until it ends (staged choice, the engine's eating). */
function eat(w: World, p: Person): void {
  const opt = generateOptions(w, p, true).options.find((o) => o.kind === 'eat');
  if (!opt) throw new Error('eating was not offered');
  const act = opt.make!()!;
  startActivity(w, p, act);
  for (let n = 0; n < 600 && p.activity === act; n++) { w.tick++; stepActivity(w, p); }
}

describe('rules 242: bread feeds far more for its size, and keeps', () => {
  it('is a supported version, and its removal and each part are lab arms', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(242);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(242);
    for (const arm of ['rich-no-bread-feeds', ...BREAD_FEEDS_PARTS.map((k) => 'rich-no-bread-feeds-' + k)]) expect(parseIntervention(arm).spec).toBe(arm);
  });

  it('a loaf is worth 60 from 242 and 30 before; no other food changes', () => {
    const now = fixture(242).w, before = fixture(241).w;
    expect(nutritionOf(now, 'bread')).toBe(BREAD_FEEDS);
    expect(BREAD_FEEDS).toBe(60);
    expect(nutritionOf(before, 'bread')).toBe(NUTRITION.bread);
    expect(NUTRITION.bread).toBe(30);
    for (const k of Object.keys(NUTRITION) as FoodKind[]) if (k !== 'bread') expect(nutritionOf(now, k)).toBe(NUTRITION[k]);
  });

  it('bread goes off slower than grain from 242, and faster before; nothing else changes', () => {
    const now = fixture(242).w, before = fixture(241).w;
    expect(perishableOf(now, 'bread')).toBe(BREAD_KEEPS);
    expect(BREAD_KEEPS).toBeLessThan(PERISHABLE.grain!);
    expect(perishableOf(before, 'bread')).toBe(PERISHABLE.bread);
    expect(perishableOf(now, 'grain')).toBe(PERISHABLE.grain);
    expect(perishableOf(now, 'berries')).toBe(1);
    expect(perishableOf(now, 'wood'), 'a thing not listed is 1, as the callers had it').toBe(1);
  });

  it('somebody who eats a loaf is fed twice as far by it', () => {
    const now = fixture(242, { inv: { bread: 1 }, hunger: 20 });
    eat(now.w, now.p);
    expect(now.p.inv.bread ?? 0).toBe(0);
    const before = fixture(241, { inv: { bread: 1 }, hunger: 20 });
    eat(before.w, before.p);
    expect(before.p.inv.bread ?? 0).toBe(0);
    expect(now.p.needs.hunger - before.p.needs.hunger).toBeGreaterThan(25);
    expect(now.p.needs.hunger).toBeGreaterThan(70);
    expect(conservationReport(now.w).ok).toBe(true);
  });

  it('the small things are eaten first, and bread is what is left to keep', () => {
    const { w } = fixture(242);
    expect(pickFood({ berries: 3, bread: 2 }, 70, w), 'a small hunger takes a berry').toBe('berries');
    expect(pickFood({ berries: 3, bread: 2 }, 20, w), 'a great hunger takes the loaf').toBe('bread');
    const { w: w241 } = fixture(241);
    expect(pickFood({ grain: 3, bread: 2 }, 70, w241)).toBe(pickFood({ grain: 3, bread: 2 }, 70));
  });

  it('a store of bread loses less of it', () => {
    const left = (version: number): number => {
      const { w, p, store } = fixture(version, { stored: 400, hunger: 100 });
      pin(p);
      for (let i = 0; i < 2 * DAY; i++) stepWorld(w);
      return store.store.items.bread ?? 0;
    };
    const now = left(242), before = left(241);
    expect(now).toBeGreaterThan(before);
    expect(400 - now, 'under half of what it lost before').toBeLessThan((400 - before) / 2);
  });

  it('each part can be removed', () => {
    const { w } = fixture(242);
    setBreadFeeds(false, 'feeds');
    expect(nutritionOf(w, 'bread')).toBe(30);
    expect(perishableOf(w, 'bread')).toBe(BREAD_KEEPS);
    setBreadFeeds(true);
    setBreadFeeds(false, 'keeps');
    expect(nutritionOf(w, 'bread')).toBe(60);
    expect(perishableOf(w, 'bread')).toBe(PERISHABLE.bread);
    setBreadFeeds(false);
    expect(nutritionOf(w, 'bread')).toBe(30);
  });
});
