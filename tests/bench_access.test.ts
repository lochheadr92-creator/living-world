// Rules 257, design A of the Stage 2 trips bundle (src/sim/bench_access.ts; read in site_supply.ts benchStock and recorded in facilities.ts
// facilitySnapshot): a workshop's goods count for a person only if they may take them. Every situation is STAGED: one grown woman, a
// timber yard holding four planks, a granary site that waits for planks, a hut and a storehouse. Nobody here is set to want anything:
// the granary site is what makes the planks wanted. The transfer rules (facilities.ts withdrawAllowance and usableUnits) are not
// touched, and one test says so.
import { afterEach, describe, expect, it } from 'vitest';
import { parseIntervention } from '../scripts/lab/lab';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { BENCH_ACCESS_FROM, benchAccessOn, setBenchAccess } from '../src/sim/bench_access';
import { generateOptions } from '../src/sim/decision';
import { addEarmark, usableUnits, withdrawAllowance } from '../src/sim/facilities';
import { observe } from '../src/sim/knowledge';
import { perceive } from '../src/sim/perception';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { stepWorld } from '../src/sim/world';
import { addPerson, building, done, pin, site, stage } from './helpers/kit';

afterEach(() => { setBenchAccess(true); });

interface Staged { yard?: 'communal' | 'own' | 'other'; earmark?: 'ben' | 'hana' | null; planks?: number; term?: number }
function fixture(version: number, o: Staged = {}) {
  const s = stage('bench-access'), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  w.tick = 1000;
  const p = addPerson(s, 'Hana', 40.5, 40.5, { age: 32, hunger: 100, thirst: 100, energy: 100, traits: { diligence: 1, generosity: 0.5, sociability: 0.5 }, inv: { bread: 1 } });
  const ben = addPerson(s, 'Ben', 75.5, 70.5, { age: 30, hunger: 100, thirst: 100, energy: 100 });
  pin(ben);
  const home = building(s, 'hut', 36, 36, p.hhId, { grain: 8 });
  w.households.find((h) => h.id === p.hhId)!.homeId = home.id;
  const planks = o.planks ?? 4;
  const yardHh = o.yard === 'own' ? p.hhId : o.yard === 'other' ? ben.hhId : 0;
  const yard = building(s, 'timber_yard', 50, 36, yardHh, { planks });
  const store = building(s, 'storehouse', 54, 36, 0);
  const granary = site(s, 'granary', 62, 36, 0, p.id, { wood: 6, stone: 4 }); // waits for eight planks
  done(s);
  if (o.earmark) addEarmark(w, yard, { kind: 'out', item: 'planks', n: planks, owner: o.earmark === 'ben' ? ben.id : p.id, reason: 'their batch', ...(o.term ? { term: o.term } : {}) });
  for (const e of [home, yard, store, granary]) observe(w, p, e);
  perceive(w, p);
  pin(p);
  p.cooldowns.trade = 1e12;
  return { s, w, p, ben, home, yard, store, granary };
}
type Fx = ReturnType<typeof fixture>;
const collect = (f: Fx) => generateOptions(f.w, f.p, true, true).options.find((o) => o.key === `collect:${f.yard.id}:planks`);
const keys = (f: Fx) => generateOptions(f.w, f.p, true, true).options.map((o) => o.key).sort();

describe("rules 257: a workshop's goods count only for who may take them", () => {
  it('is a supported version at or below the current one, claims 257, and has its lab arm', () => {
    expect(BENCH_ACCESS_FROM).toBe(257);
    expect(SUPPORTED_RULES_VERSIONS).toContain(257);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(257);
    expect(parseIntervention('rich-no-bench-access').spec).toBe('rich-no-bench-access');
  });

  it('planks earmarked to somebody else are not offered at 257, and are at 256; the same planks earmarked to her are offered at both', () => {
    expect(collect(fixture(256, { earmark: 'ben' }))).toBeDefined();
    expect(collect(fixture(257, { earmark: 'ben' }))).toBeUndefined();
    expect(collect(fixture(256, { earmark: 'hana' }))).toBeDefined();
    expect(collect(fixture(257, { earmark: 'hana' }))?.label).toBe('Collect 4 planks from the timber yard');
    // nothing earmarked at a communal yard: open to her at either version
    expect(collect(fixture(257, { earmark: null }))).toBeDefined();
  });

  it('records what was earmarked at the sight, and only at 257 and above', () => {
    const now = fixture(257, { earmark: 'ben' }), old = fixture(256, { earmark: 'ben' });
    const held = now.p.beliefs[now.yard.id].ops?.held;
    expect(held).toEqual([{ owner: now.ben.id, item: 'planks', n: 4, until: expect.any(Number) }]);
    expect(old.p.beliefs[old.yard.id].ops?.held).toBeUndefined();
    const free = fixture(257, { earmark: null });
    expect(free.p.beliefs[free.yard.id].ops?.held ?? []).toEqual([]);
  });

  it('the lab arm restores the old count', () => {
    const f = fixture(257, { earmark: 'ben' });
    expect(collect(f)).toBeUndefined();
    const undo = parseIntervention('rich-no-bench-access').install!();
    expect(benchAccessOn()).toBe(false);
    expect(collect(f)).toBeDefined();
    undo();
    expect(benchAccessOn()).toBe(true);
    expect(collect(f)).toBeUndefined();
  });

  it('an earmark that lapses stops counting without a new sight, and a new sight forgets it', () => {
    const f = fixture(257, { earmark: 'ben', term: 50 });
    expect(collect(f)).toBeUndefined();
    f.w.tick += 100; // the earmark ran out at 1050; she has not looked again
    expect(collect(f)).toBeDefined();
    const g = fixture(257, { earmark: 'ben', term: 50 });
    g.w.tick += 100;
    observe(g.w, g.p, g.yard);
    expect(g.p.beliefs[g.yard.id].ops?.held).toEqual([]);
    expect(collect(g)).toBeDefined();
  });

  it("a guest at another household's yard is offered no unearmarked planks; a member of the household and a communal yard are", () => {
    expect(collect(fixture(256, { yard: 'other' }))).toBeDefined(); // rules 207: a guest, and the planner took the stock to be hers
    expect(collect(fixture(257, { yard: 'other' }))).toBeUndefined();
    expect(collect(fixture(257, { yard: 'own' }))).toBeDefined();
    expect(collect(fixture(257, { yard: 'communal' }))).toBeDefined();
    // a guest is still offered what is earmarked to her
    expect(collect(fixture(257, { yard: 'other', earmark: 'hana' }))).toBeDefined();
  });

  it('a household that did a fifth of the building may take the free stock', () => {
    const f = fixture(257, { yard: 'other' });
    expect(collect(f)).toBeUndefined();
    f.yard.ops!.builders[f.p.hhId] = 0.3;
    expect(collect(f)).toBeDefined();
  });

  it('a belief with no record of earmarks plans as before', () => {
    const f = fixture(257, { earmark: 'ben' });
    delete f.p.beliefs[f.yard.id].ops!.held;
    expect(collect(f)).toBeDefined();
  });

  it('keeps held through a save, and refuses a held that is not a list of whole earmarks', () => {
    const f = fixture(257, { earmark: 'ben' });
    const back = deserializeWorld(serializeWorld(f.w));
    const p = back.persons.find((q) => q.id === f.p.id)!;
    expect(p.beliefs[f.yard.id].ops?.held).toEqual(f.p.beliefs[f.yard.id].ops?.held);
    const bad = (mut: (h: any[]) => void) => {
      const g = fixture(257, { earmark: 'ben' });
      mut(g.p.beliefs[g.yard.id].ops!.held as any[]);
      return () => deserializeWorld(serializeWorld(g.w));
    };
    expect(bad((h) => { h[0].n = 1.5; })).toThrow();
    expect(bad((h) => { h[0].item = 'not_a_thing'; })).toThrow();
    expect(bad((h) => { h[0].owner = 'x'; })).toThrow();
    const old = fixture(256, { earmark: 'ben' });
    old.p.beliefs[old.yard.id].ops!.held = [];
    expect(() => deserializeWorld(serializeWorld(old.w))).toThrow(); // a record the rules do not run
  });

  it('does not touch the transfer: what she may take is the same at 256 and 257', () => {
    for (const o of [{ earmark: 'ben' as const }, { earmark: 'hana' as const }, { earmark: null }, { yard: 'other' as const }, { yard: 'own' as const, earmark: 'ben' as const }]) {
      const a = fixture(256, o), b = fixture(257, o);
      expect(usableUnits(b.w, b.yard, b.p, 'planks')).toBe(usableUnits(a.w, a.yard, a.p, 'planks'));
      expect(withdrawAllowance(b.w, b.yard, b.p, 'planks', 4)).toBe(withdrawAllowance(a.w, a.yard, a.p, 'planks', 4));
    }
  });

  it("with the part off the options equal rules 256's, and two 257 worlds step identically", () => {
    for (const o of [{ earmark: 'ben' as const }, { yard: 'other' as const }, { earmark: null }]) {
      const a = fixture(256, o), b = fixture(257, o);
      setBenchAccess(false);
      expect(keys(b)).toEqual(keys(a));
      setBenchAccess(true);
    }
    const x = fixture(257, { earmark: 'ben' }), y = fixture(257, { earmark: 'ben' });
    for (let i = 0; i < 150; i++) { stepWorld(x.w); stepWorld(y.w); }
    expect(serializeWorld(x.w)).toBe(serializeWorld(y.w));
  });
});
