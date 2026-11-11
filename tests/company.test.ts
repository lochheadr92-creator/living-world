// Rules 200: room for company, four separately switched parts (src/sim/company.ts). Every situation here is STAGED: it checks a rule,
// it is not an example of spontaneous behaviour; the ordinary-world origin is docs/MECHANISM_CENSUS_20261111.md. Each check has the
// rules-196 contrast (197 to 199 are unused) so the older behaviour is shown to be kept, and each part has its own switch.
import { afterEach, describe, expect, it } from 'vitest';
import { newActivity, startActivity } from '../src/sim/activities';
import {
  APPROACH_COMMIT_BEFORE, APPROACH_COMMIT_MAX, COMPANY_PARTS, REQUEST_URGENCY, approachCommit, companyUrgency, learningGateOpen, marketMayBeCalled,
  mealWindowOpen, setCompany,
} from '../src/sim/company';
import { DAY } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { dayFraction } from '../src/sim/environment';
import { occasionsTick } from '../src/sim/occasions';
import { relOf } from '../src/sim/relations';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { stepWorld } from '../src/sim/world';
import { addPerson, building, done, learn, pin, stage } from './helpers/kit';
import type { Person, World } from '../src/sim/types';

afterEach(() => setCompany(true));

const BEFORE = 196;
function world(version: number, dynamics: 'rich' | 'authored' = 'rich', tag = '') {
  const s = stage(`company-${version}-${dynamics}-${tag}`);
  s.w.settings = { ...s.w.settings, dynamics, rulesVersion: version };
  return s;
}
/** a tick on day 3 at the given fraction of the day */
function tickAt(frac: number): number {
  for (let t = 3 * DAY; t < 4 * DAY; t++) if (Math.abs(dayFraction(t) - frac) < 0.0005) return t;
  throw new Error('no such time of day');
}

describe('rules 200 is registered', () => {
  it('is registered and supported (the current version may be later), with four parts; 197 to 199 are not versions', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(200);
    expect(SUPPORTED_RULES_VERSIONS).toContain(200);
    for (const v of [197, 198, 199]) expect(SUPPORTED_RULES_VERSIONS).not.toContain(v);
    expect(COMPANY_PARTS).toEqual(['approach', 'learning', 'meal', 'market']);
  });
});

describe('approach: a childhood or learning ask in the stop-and-talk roll', () => {
  it('adds nothing at 196 and a request’s 0.12 at 200; a chat, a request and a warning are unchanged; the switch and an authored world keep 196', () => {
    const old = world(BEFORE).w, now = world(200).w;
    for (const purpose of ['family_time', 'play_together', 'learn_foraging', 'learn_skill', 'learn_technique'] as const) {
      expect(companyUrgency(old, purpose)).toBe(0);
      expect(companyUrgency(now, purpose)).toBe(REQUEST_URGENCY);
    }
    for (const purpose of ['chat', 'request', 'warn', 'offer', 'invite', 'trade'] as const) expect(companyUrgency(now, purpose)).toBe(0);
    setCompany(false, 'approach');
    expect(companyUrgency(now, 'play_together')).toBe(0);
    setCompany(true, 'approach');
    expect(companyUrgency(world(200, 'authored').w, 'play_together')).toBe(0);
  });

  /** A child walks up to an unrelated, unsociable, idle adult to ask for a game, starting at the given tick; did the adult stop for it? */
  function asked(version: number, startTick: number): 'talked' | 'refused' | 'neither' {
    const s = world(version, 'rich', `ask-${startTick}`);
    const kid = addPerson(s, 'Kit', 40.5, 40.5, { age: 8, hunger: 95, thirst: 95, energy: 95 });
    const adult = addPerson(s, 'Ada', 42.5, 40.5, { age: 30, hunger: 95, thirst: 95, energy: 95, traits: { sociability: 0 } });
    const w = done(s);
    w.tick = startTick;
    pin(adult);
    kid.cooldowns.pause = 0;
    startActivity(w, kid, newActivity(w, kid, { kind: 'socialize', label: 'A guessing game with Ada', goal: 'staged ask', targetId: adult.id, targetType: 'person', tx: adult.x, ty: adult.y, spotX: adult.x - 1.3, spotY: adult.y, utility: 100, minCommit: 4000, maxTicks: 300, data: { purpose: 'play_together', conv: {} } }));
    for (let i = 0; i < 120; i++) {
      stepWorld(w);
      if (w.conversations.some((c) => c.purpose === 'play_together')) return 'talked';
      if (kid.lastResult && /too busy to stop/.test(String(kid.lastResult.detail))) return 'refused';
    }
    return 'neither';
  }

  it('the roll itself: over forty staged asks some are refused at 196 and answered at 200, and none the other way round', () => {
    let gained = 0, lost = 0, refusedBefore = 0;
    for (let i = 0; i < 40; i++) {
      const t = 2000 + 16 * i;
      const before = asked(BEFORE, t), after = asked(200, t);
      if (before === 'refused') refusedBefore++;
      if (before === 'refused' && after === 'talked') gained++;
      if (before === 'talked' && after !== 'talked') lost++;
    }
    expect(refusedBefore, 'the staging does refuse some asks at 196').toBeGreaterThan(0);
    expect(gained).toBeGreaterThan(0);
    expect(lost).toBe(0);
  });
});

describe('approach: committed for the walk', () => {
  it('the commitment is 40 ticks at 196 whatever the walk; at 200 the walk plus 20, between 40 and 240', () => {
    const old = world(BEFORE).w, now = world(200).w;
    for (const walk of [0, 30, 90, 500]) expect(approachCommit(old, walk)).toBe(APPROACH_COMMIT_BEFORE);
    expect(approachCommit(now, 0)).toBe(40);
    expect(approachCommit(now, 30)).toBe(50);
    expect(approachCommit(now, 90)).toBe(110);
    expect(approachCommit(now, 500)).toBe(APPROACH_COMMIT_MAX);
    setCompany(false, 'approach');
    expect(approachCommit(now, 90)).toBe(40);
  });

  /** Bea, short of company, sees her friend Cal eight tiles off: the approach she would make, as an activity. */
  function approach(version: number): { w: World; commit: number } | null {
    const s = world(version, 'rich', 'walk');
    const bea = addPerson(s, 'Bea', 40.5, 40.5, { age: 30, hunger: 95, thirst: 95, energy: 95, traits: { sociability: 0.9 } });
    const cal = addPerson(s, 'Cal', 48.5, 40.5, { age: 30, hunger: 95, thirst: 95, energy: 95 });
    const w = done(s);
    w.tick = tickAt(0.45);
    pin(cal);
    bea.needs.social = 10; bea.needs.warmth = 95; bea.needs.safety = 95;
    relOf(bea, cal.id).affinity = 30; relOf(bea, cal.id).familiarity = 30;
    learn(w, bea, cal);
    const o = generateOptions(w, bea, true, true).options.find((x) => x.kind === 'socialize' && x.key.startsWith(`socialize:${cal.id}:`) && x.make);
    const a = o?.make?.();
    return a ? { w, commit: a.minCommit - w.tick } : null;
  }

  it('an approach to somebody eight tiles off is committed for 40 ticks at 196 and for its walk at 200', () => {
    const before = approach(BEFORE), after = approach(200);
    expect(before, 'the staging offers an approach').toBeTruthy();
    expect(after).toBeTruthy();
    expect(before!.commit).toBe(40);
    expect(after!.commit).toBeGreaterThan(40);
    expect(after!.commit).toBeLessThanOrEqual(APPROACH_COMMIT_MAX);
  });
});

describe('learning gate: the coaching ask', () => {
  const none = { hunger: 0, thirst: 0, energy: 0 };
  it('all above 65 is open at both versions; fed but under 65 is open only at 200; a pressing drive closes it at both', () => {
    const old = world(BEFORE).w, now = world(200).w;
    expect(learningGateOpen(old, { hunger: 70, thirst: 70, energy: 70 }, none)).toBe(true);
    expect(learningGateOpen(now, { hunger: 70, thirst: 70, energy: 70 }, none)).toBe(true);
    expect(learningGateOpen(old, { hunger: 63, thirst: 67, energy: 50 }, none)).toBe(false);
    expect(learningGateOpen(now, { hunger: 63, thirst: 67, energy: 50 }, none)).toBe(true);
    expect(learningGateOpen(now, { hunger: 60, thirst: 67, energy: 50 }, { hunger: 5, thirst: 0, energy: 0 })).toBe(false);
    setCompany(false, 'learning');
    expect(learningGateOpen(now, { hunger: 63, thirst: 67, energy: 50 }, none)).toBe(false);
    setCompany(true, 'learning');
    expect(learningGateOpen(world(200, 'authored').w, { hunger: 63, thirst: 67, energy: 50 }, none)).toBe(false);
  });
});

describe('meal window: when an invitation to eat together may be made', () => {
  it('0.40 of the day is outside the window at 196 and inside at 200; 0.60 is inside at both; 0.30 and 0.70 outside at both', () => {
    const old = world(BEFORE).w, now = world(200).w;
    expect(mealWindowOpen(old, 0.4)).toBe(false);
    expect(mealWindowOpen(now, 0.4)).toBe(true);
    for (const w of [old, now]) {
      expect(mealWindowOpen(w, 0.6)).toBe(true);
      expect(mealWindowOpen(w, 0.3)).toBe(false);
      expect(mealWindowOpen(w, 0.7)).toBe(false);
    }
    setCompany(false, 'meal');
    expect(mealWindowOpen(now, 0.4)).toBe(false);
  });

  /** Dee, sociable and generous, six berries in her pack, her friend Eli beside her and a lit fire she knows: is the invitation on offer? */
  function invitation(version: number, frac: number): boolean {
    const s = world(version, 'rich', `meal-${frac}`);
    const dee = addPerson(s, 'Dee', 40.5, 40.5, { age: 30, hunger: 98, thirst: 98, energy: 95, inv: { berries: 6 }, traits: { sociability: 1, generosity: 1 } });
    const eli = addPerson(s, 'Eli', 42.5, 40.5, { age: 30, hunger: 95, thirst: 95, energy: 95 });
    const fire = building(s, 'fire', 44, 44);
    fire.fuel = 900;
    const w = done(s);
    w.tick = tickAt(frac);
    pin(eli);
    dee.needs.warmth = 95; dee.needs.safety = 95;
    relOf(dee, eli.id).affinity = 30;
    learn(w, dee, fire, eli);
    return generateOptions(w, dee, true, true).options.some((o) => o.key === `socialize:${eli.id}:invite`);
  }

  it('the invitation itself: on offer at 0.60 at both versions, at 0.40 only at 200', () => {
    expect(invitation(BEFORE, 0.6), 'the staging offers the invitation inside the old window').toBe(true);
    expect(invitation(200, 0.6)).toBe(true);
    expect(invitation(BEFORE, 0.4)).toBe(false);
    expect(invitation(200, 0.4)).toBe(true);
  });
});

describe('market at the fire', () => {
  it('with a sound hall the market may always be called; without one only at 200, with four households, from day 6', () => {
    const mk = (version: number, households: number, dynamics: 'rich' | 'authored' = 'rich') => {
      const s = world(version, dynamics, `mkt-${households}`);
      for (let i = 0; i < households; i++) addPerson(s, `P${i}`, 40.5 + i, 40.5, { age: 30 });
      return done(s);
    };
    expect(marketMayBeCalled(mk(BEFORE, 4), true, 3)).toBe(true);
    expect(marketMayBeCalled(mk(BEFORE, 4), false, 9)).toBe(false);
    expect(marketMayBeCalled(mk(200, 4), false, 9)).toBe(true);
    expect(marketMayBeCalled(mk(200, 3), false, 9)).toBe(false);
    expect(marketMayBeCalled(mk(200, 4), false, 3)).toBe(false);
    expect(marketMayBeCalled(mk(200, 4, 'authored'), false, 9)).toBe(false);
    const w = mk(200, 4);
    setCompany(false, 'market');
    expect(marketMayBeCalled(w, false, 9)).toBe(false);
  });

  /** A settlement of the given households round a fire, no hall, at the market's tick on day 9. */
  function marketDay(version: number, households: number): World {
    const s = world(version, 'rich', `fire-${households}`);
    const people: Person[] = [];
    for (let i = 0; i < households; i++) people.push(addPerson(s, `Q${i}`, 40.5 + i, 40.5, { age: 30 }));
    building(s, 'fire', 44, 44).fuel = 900;
    const w = done(s);
    for (const p of people) pin(p);
    w.tick = 9 * DAY + 11;
    occasionsTick(w);
    return w;
  }

  it('the call itself: day 9, a fire, four households and no hall give no market at 196 and a market at the fire at 200; three households give none', () => {
    expect((marketDay(BEFORE, 4).occasions ?? []).some((o) => o.kind === 'market')).toBe(false);
    const now = marketDay(200, 4);
    const market = (now.occasions ?? []).find((o) => o.kind === 'market');
    expect(market).toBeTruthy();
    expect(market!.placeName).toBe('the fire');
    expect((marketDay(200, 3).occasions ?? []).some((o) => o.kind === 'market')).toBe(false);
  });
});
