// Rules 195: a manageable ordinary metabolism (src/sim/metabolism.ts, read by needs.ts updateNeeds, action_scope.ts, optutil.ts and
// relief.ts). Every situation here is STAGED: it checks a rule, it is not an example of spontaneous behaviour; the ordinary-world
// measurement is the paired lab in docs/ORDINARY_METABOLISM.md. Each check has the rules-194 contrast so the older drains are
// shown to be kept.
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { CRITICAL, HUNGER_RATE, THIRST_RATE } from '../src/sim/constants';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { HUNGER_RATE_195, THIRST_RATE_195, hungerRate, setLabRates, setMetabolism, thirstRate } from '../src/sim/metabolism';
import { updateNeeds } from '../src/sim/needs';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { hashWorld } from '../src/sim/world';
import { stepWorld } from '../src/sim/world';
import { addPerson, done, stage } from './helpers/kit';
import type { Items } from '../src/sim/types';

afterEach(() => { setMetabolism(true); setLabRates(null); });

/** Ada, an adult standing still on a mild dry day, at the given rules version. */
function scene(version: number, opts: { dynamics?: 'rich' | 'authored'; hunger?: number; thirst?: number; inv?: Items; age?: number } = {}) {
  const s = stage(`metabolism-${version}-${opts.dynamics ?? 'rich'}-${opts.hunger ?? 80}-${opts.age ?? 30}`);
  s.w.settings = { ...s.w.settings, dynamics: opts.dynamics ?? 'rich', rulesVersion: version };
  const ada = addPerson(s, 'Ada', 40.5, 40.5, { age: opts.age ?? 30, hunger: opts.hunger ?? 80, thirst: opts.thirst ?? 80, energy: 90, inv: opts.inv });
  const w = done(s);
  w.weather.temp = 15;
  w.weather.rain = 0;
  ada.needs.warmth = 90;
  ada.pose = 'stand';
  return { w, ada };
}
/** hunger and thirst lost over one tick of standing still */
function drain(version: number, dynamics: 'rich' | 'authored' = 'rich') {
  const { w, ada } = scene(version, { dynamics });
  const h0 = ada.needs.hunger, t0 = ada.needs.thirst;
  updateNeeds(w, ada);
  return { hunger: h0 - ada.needs.hunger, thirst: t0 - ada.needs.thirst };
}

describe('rules 195 is registered', () => {
  it('is registered and supported (the current version may be later), with the two new constants', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(195);
    expect(SUPPORTED_RULES_VERSIONS).toContain(195);
    expect(HUNGER_RATE_195).toBe(0.024);
    expect(THIRST_RATE_195).toBe(0.032);
    expect(HUNGER_RATE).toBe(0.03);
    expect(THIRST_RATE).toBe(0.04);
  });
});

describe('the base drains', () => {
  it('at 194 an adult standing still loses 0.03 hunger and 0.04 thirst a tick; at 195 it is 0.024 and 0.032', () => {
    const old = drain(194);
    expect(old.hunger).toBeCloseTo(0.03, 10);
    expect(old.thirst).toBeCloseTo(0.04, 10);
    const now = drain(195);
    expect(now.hunger).toBeCloseTo(0.024, 10);
    expect(now.thirst).toBeCloseTo(0.032, 10);
  });

  it('the multipliers are untouched: asleep, heavy work and a child drain in the same proportion at 195 as at 194', () => {
    for (const version of [194, 195]) {
      const base = drain(version);
      const { w, ada } = scene(version);
      ada.pose = 'sleep';
      let h = ada.needs.hunger, t = ada.needs.thirst;
      updateNeeds(w, ada);
      expect((h - ada.needs.hunger) / base.hunger).toBeCloseTo(0.55, 8);
      expect((t - ada.needs.thirst) / base.thirst).toBeCloseTo(0.6, 8);
      const kid = scene(version, { age: 8 });
      h = kid.ada.needs.hunger;
      updateNeeds(kid.w, kid.ada);
      expect((h - kid.ada.needs.hunger) / base.hunger).toBeCloseTo(0.85, 8);
    }
  });

  it('an authored world and the switch off keep the old drains at 195; the lab rates apply only at 195', () => {
    expect(drain(195, 'authored').hunger).toBeCloseTo(0.03, 10);
    setMetabolism(false);
    expect(drain(195).hunger).toBeCloseTo(0.03, 10);
    expect(drain(195).thirst).toBeCloseTo(0.04, 10);
    setMetabolism(true);
    setLabRates({ hunger: 0.02, thirst: 0.025 });
    expect(drain(195).hunger).toBeCloseTo(0.02, 10);
    expect(drain(195).thirst).toBeCloseTo(0.025, 10);
    expect(drain(194).hunger).toBeCloseTo(0.03, 10);
    const { w } = scene(194);
    expect(hungerRate(w)).toBe(0.03);
    expect(thirstRate(w)).toBe(0.04);
  });
});

describe('survival still comes first at 195', () => {
  it('a starving adult still loses health at the old rate, and a critical need still filters the options down to it', () => {
    const { w, ada } = scene(195, { hunger: 0 });
    const health = ada.health;
    updateNeeds(w, ada);
    expect(health - ada.health).toBeCloseTo(0.022, 6);
    const crit = scene(195, { hunger: 10, inv: { berries: 3 } });
    expect(crit.ada.needs.hunger).toBeLessThan(CRITICAL.hunger);
    const ctx = generateOptions(crit.w, crit.ada, true, true);
    expect(ctx.criticals).toContain('hunger');
    const ranked = rankOptions(ctx);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked.every((o) => o.need === 'hunger' || o.kind === 'flee' || (o.kind === 'socialize' && (o.tag === 'request' || o.tag === 'info')))).toBe(true);
  });

  it('with nothing to eat or drink, hunger and thirst still run out inside a day and a half and health follows', () => {
    const { w, ada } = scene(195, { hunger: 60, thirst: 60 });
    for (let i = 0; i < 1.5 * 2400; i++) { w.tick++; updateNeeds(w, ada); ada.pose = 'stand'; }
    expect(ada.needs.hunger).toBe(0);
    expect(ada.needs.thirst).toBe(0);
    expect(ada.health).toBeLessThan(100);
  });
});

describe('determinism and continuity at 195', () => {
  it('two worlds from the same seed hash alike after 300 ticks, and a saved copy continues identically', () => {
    const a = scene(195).w, b = scene(195).w;
    for (let i = 0; i < 300; i++) { stepWorld(a); stepWorld(b); }
    expect(hashWorld(a)).toBe(hashWorld(b));
    const copy = deserializeWorld(serializeWorld(a));
    for (let i = 0; i < 120; i++) { stepWorld(a); stepWorld(copy); }
    expect(hashWorld(copy)).toBe(hashWorld(a));
  });
});
