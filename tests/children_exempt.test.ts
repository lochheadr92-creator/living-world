// Rules 208: children are exempt from the ration (src/sim/light_pack.ts rationApplies; optDepositFood in options_work.ts, optEat in
// options_survival.ts, the eat_store handler in act_resource.ts). Every situation here is STAGED: it checks a rule, it is not an example
// of spontaneous behaviour. The ordinary-world origin is the child's-day probe read at rules 206 against its rules-203 run
// (docs/CARRYING.md: under-twelves carried food home more than twice as often under the ration) and the owner's instruction of
// 11 November 2026. Each check has the rules-207 contrast.
import { afterEach, describe, expect, it } from 'vitest';
import { generateOptions } from '../src/sim/decision';
import { observe } from '../src/sim/knowledge';
import { RATION_WEIGHT, mealLeaves, rationApplies, setChildrenExempt } from '../src/sim/light_pack';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { addPerson, building, done, stage } from './helpers/kit';
import type { Items, Person, World } from '../src/sim/types';

afterEach(() => setChildrenExempt(true));

const RATION_TEXT = 'more food than I need to carry';
const HELD_TEXT = 'keeping my ration for the road; there is food at home';
/** Somebody of the given age lives in a hut they have looked into from its door. `stock` is what the hut holds. */
function scene(version: number, age: number, opts: { inv?: Items; stock?: Items; hunger?: number; tag?: string } = {}) {
  const s = stage(`children-exempt-${version}-${age}-${JSON.stringify(opts.inv ?? {})}-${JSON.stringify(opts.stock ?? {})}-${opts.hunger ?? 95}-${opts.tag ?? ''}`);
  s.w.settings = { ...s.w.settings, dynamics: 'rich', rulesVersion: version };
  const who = addPerson(s, age < 12 ? 'Mona' : 'Ada', 40.5, 27.5, { age, hunger: opts.hunger ?? 95, thirst: 95, energy: 95, inv: opts.inv ?? {} });
  const home = building(s, 'hut', 40, 24, who.hhId, opts.stock ?? {});
  s.w.households.find((h) => h.id === who.hhId)!.homeId = home.id;
  const w = done(s);
  w.tick = 600;
  // rules 184: the contents of a home are learned from inside or at the door, so they look from the door and come back
  const at = { x: who.x, y: who.y };
  who.x = home.doorX + 0.5; who.y = home.doorY + 0.5;
  observe(w, who, home);
  who.x = at.x; who.y = at.y;
  return { w, who, home };
}
const ctxOf = (w: World, p: Person) => generateOptions(w, p, true, true);
const foodHome = (w: World, p: Person, homeId: number) => ctxOf(w, p).options.find((o) => o.key === `deposit:${homeId}:food`);
const eatCarried = (w: World, p: Person) => ctxOf(w, p).options.find((o) => o.kind === 'eat');
const heldBlock = (w: World, p: Person) => ctxOf(w, p).blocked.some((o) => o.blocked === HELD_TEXT);
const part = (o: { parts: [string, number][] } | undefined, text: string): number | undefined => o?.parts.find(([k]) => k === text)?.[1];

describe('rules 208 is registered', () => {
  it('is registered and supported (the current version may be later)', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(208);
    expect(SUPPORTED_RULES_VERSIONS).toContain(208);
  });
});

describe('whom the ration applies to', () => {
  it('everyone at 207; from 208 not a child; a grown person always; the switch off is rules 207', () => {
    const old = scene(207, 9).w, now = scene(208, 9).w;
    expect(rationApplies(old, true)).toBe(true);
    expect(rationApplies(now, true)).toBe(false);
    expect(rationApplies(now, false)).toBe(true);
    expect(rationApplies(scene(204, 9).w, false)).toBe(false);
    expect(mealLeaves(old, 3, true)).toBe(2);
    expect(mealLeaves(now, 3, true)).toBe(0);
    expect(mealLeaves(now, 3, false)).toBe(2);
    setChildrenExempt(false);
    expect(rationApplies(now, true)).toBe(true);
    expect(mealLeaves(now, 3, true)).toBe(2);
  });
});

describe('a child of nine carrying three portions', () => {
  it('at 207 the trip home carries the ration’s reason and mark; at 208 it is the ordinary trip of a small pack, without them', () => {
    const old = scene(207, 9, { inv: { berries: 3 } }), now = scene(208, 9, { inv: { berries: 3 } });
    const a = foodHome(old.w, old.who, old.home.id), b = foodHome(now.w, now.who, now.home.id);
    expect(a, 'offered at 207').toBeTruthy();
    expect(part(a, RATION_TEXT)).toBe(RATION_WEIGHT);
    expect(a!.make?.()?.data.ration).toBe(true);
    expect(b, 'still offered at 208: a child brings a small surplus home as before 205').toBeTruthy();
    expect(part(b, RATION_TEXT)).toBeUndefined();
    expect(b!.make?.()?.data.ration).toBeUndefined();
    expect(b!.util).toBeLessThan(a!.util);
    setChildrenExempt(false);
    expect(part(foodHome(now.w, now.who, now.home.id), RATION_TEXT)).toBe(RATION_WEIGHT);
  });
});

describe('a hungry child near a stocked home with one portion', () => {
  const HUNGRY = { inv: { berries: 1 } as Items, stock: { berries: 6 } as Items, hunger: 50 };
  it('at 207 the portion is held for the road; at 208 she may eat it', () => {
    const old = scene(207, 9, HUNGRY), now = scene(208, 9, HUNGRY);
    expect(eatCarried(old.w, old.who)).toBeUndefined();
    expect(heldBlock(old.w, old.who)).toBe(true);
    expect(eatCarried(now.w, now.who), 'offered at 208').toBeTruthy();
    expect(heldBlock(now.w, now.who)).toBe(false);
    setChildrenExempt(false);
    expect(eatCarried(now.w, now.who)).toBeUndefined();
  });

  it('a grown person in the same place is still held to the ration at 208', () => {
    const adult = scene(208, 30, HUNGRY);
    expect(eatCarried(adult.w, adult.who)).toBeUndefined();
    expect(heldBlock(adult.w, adult.who)).toBe(true);
  });
});
