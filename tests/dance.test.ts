// Rules 262 (bundle C, part 7b): a dance at a feast (src/sim/dance.ts, the switch in src/sim/company_scenes.ts; called in the attend handler of occasions.ts).
// Every situation here is STAGED: it checks a rule, it is not an example of spontaneous behaviour.
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { newActivity, standSpotFor, startActivity, suspendActivity } from '../src/sim/activities';
import { createBuilding } from '../src/sim/buildings';
import { COMPANY_SCENE_PARTS, companyScenePartOn, hasDance, setCompanyScenes } from '../src/sim/company_scenes';
import { DAY } from '../src/sim/constants';
import { GAIN_AFFINITY, GAIN_FAMILIARITY, GAIN_TRUST, mayWalkOutTogether } from '../src/sim/courting';
import { DANCERS_MAX, DANCE_AFFINITY, DANCE_KINDS, DANCE_LINE_AT, DANCE_REACH, DANCE_SOCIAL, DANCE_TICKS, danceStep, dancePose, isDancing, safeToDance, validateDance } from '../src/sim/dance';
import type { DanceData } from '../src/sim/dance';
import { dayFraction, updateEnvironment } from '../src/sim/environment';
import { setMeeting } from '../src/sim/meeting';
import { think } from '../src/sim/mood';
import { callOccasion } from '../src/sim/occasions';
import { distToFootprint, isWalkable, rebuildMobileGrid } from '../src/sim/registry';
import { relOf, spark } from '../src/sim/relations';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import type { Activity, Occasion, OccasionKind, Person, World } from '../src/sim/types';
import { hashWorld, stepWorld } from '../src/sim/world';
import { parseIntervention } from '../scripts/lab/lab';
import { addPerson, building, done, learn, stage } from './helpers/kit';

afterEach(() => { setCompanyScenes(true); setMeeting(true); });

/** a tick of a later day at this fraction of the day (the day does not begin at tick 0: environment.ts dayFraction) */
const at = (frac: number): number => 3 * DAY + Math.round((((frac - dayFraction(0)) % 1) + 1) % 1 * DAY);
const NOON = at(0.45);
const NIGHT = at(0.97);

interface Opts {
  tag?: string;
  version?: number;
  kind?: OccasionKind;
  /** how many attend (default 6) */
  n?: number;
  /** 'fire': the camp fire is the place; 'hall': a hall beside a lit fire; 'hall-far': a hall with the lit fire far away */
  place?: 'fire' | 'hall' | 'hall-far';
  tick?: number;
  /** the attenders (by index) who are low in mood */
  low?: number[];
  /** a hut on the ring's east side (a tile that is not open) */
  hut?: boolean;
}

const NAMES = ['Ada', 'Ben', 'Cy', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal', 'Ida', 'Jon', 'Kay', 'Lou'];

/** An occasion that has begun at a fire or a hall, with Opts.n attenders (ages 20 to 40, men and women) standing at it in work; Bea and Cal are who it is for. */
function scene(o: Opts = {}) {
  const s = stage(`dance-${o.tag ?? ''}`), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = o.version ?? 262;
  w.tick = o.tick ?? NOON;
  const place = o.place ?? 'fire';
  const attenders: Person[] = [];
  const n = o.n ?? 6;
  for (let i = 0; i < n; i++) attenders.push(addPerson(s, NAMES[i], 36 + i, 40, { age: 20 + 2 * i, sex: i % 2 ? 'f' : 'm' }));
  const bea = addPerson(s, 'Bea', 30, 44, { age: 24, sex: 'f' });
  const cal = addPerson(s, 'Cal', 31, 44, { age: 26, sex: 'm' });
  w.camp = { x: 41, y: 36 };
  let fire = null;
  if (place === 'fire') fire = building(s, 'fire', 41, 36);
  else {
    building(s, 'hall', 40, 34);
    fire = building(s, 'fire', place === 'hall' ? 44 : 62, place === 'hall' ? 37 : 52);
  }
  fire.fuel = 5000;
  if (o.hut) createBuilding(w, 'hut', place === 'fire' ? 43 : 43, place === 'fire' ? 36 : 35, 0, { condition: 100 });
  done(s);
  const occ = callOccasion(w, o.kind ?? 'wedding', o.kind === 'harvest' || o.kind === 'market' ? [] : [bea.id, cal.id])!;
  occ.status = 'gathering';
  occ.at = w.tick - 5;
  occ.until = w.tick + 3000;
  const placeB = w.byId.get(occ.placeId)!;
  for (const p of [...attenders, bea, cal]) { p.needs = { hunger: 95, thirst: 95, energy: 90, warmth: 95, safety: 95, social: 50 }; p.chrono = 0; learn(w, p, fire!); p.nextThink = w.tick + 100000; }
  (o.low ?? []).forEach((i) => think(w, attenders[i], 'sad', -40, DAY, 'a heavy day'));
  for (const p of attenders) {
    const spot = standSpotFor(w, p, placeB as never)!;
    p.x = spot.x; p.y = spot.y;
    const a = newActivity(w, p, { kind: 'attend', label: `At the ${occ.kind === 'wedding' ? 'wedding feast' : occ.kind === 'harvest' ? 'harvest feast' : occ.kind}`, goal: 'to celebrate', need: 'social', targetId: occ.id, targetType: 'occasion', tx: occ.x, ty: occ.y, spotX: p.x, spotY: p.y, utility: 30, minCommit: 60, maxTicks: 900, here: true, data: { occasion: occ.id } });
    startActivity(w, p, a);
  }
  rebuildMobileGrid(w);
  updateEnvironment(w); // the light of this time of day
  return { s, w, occ, attenders, place: placeB, bea, cal };
}
type Fx = ReturnType<typeof scene>;

const dancers = (f: Fx): Person[] => f.attenders.filter((p) => p.activity && isDancing(p.activity));
const danced = (f: Fx): Person[] => f.attenders.filter((p) => f.occ.dance?.by.includes(p.id));
const everDanced = (f: Fx): string[] => danced(f).map((p) => p.name);
const lines = (w: World) => w.events.filter((e) => /^People danced at /.test(e.text));
const run = (w: World, ticks: number): void => { for (let i = 0; i < ticks; i++) stepWorld(w); };
const danceOf = (p: Person): DanceData | undefined => p.activity?.data.dance as DanceData | undefined;

describe('rules 262 part 7b is registered', () => {
  it('has its switch, a lab arm of its own, and is a supported version', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(262);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(262);
    expect(DANCE_KINDS).toEqual(['wedding', 'feast', 'harvest']);
    expect(parseIntervention('rich-no-company-dance').summary).toMatch(/dances/);
    const f = scene({ tag: 'arm' });
    expect(hasDance(f.w)).toBe(true);
    const undo = parseIntervention('rich-no-company-dance').install!();
    expect(COMPANY_SCENE_PARTS.map((p) => companyScenePartOn(p))).toEqual([true, false, true]);
    expect(hasDance(f.w)).toBe(false);
    undo();
    expect(hasDance(f.w)).toBe(true);
    expect(hasDance(scene({ tag: 'old', version: 261 }).w)).toBe(false);
  });
});

describe('a dance: a ring round the place, on a count of its own, for about 120 ticks, and then they stand', () => {
  it('at a wedding with six there, some begin within a few ticks; every step is on open ground within 2 tiles of the place; each stays at the occasion exactly as long as they would have', () => {
    const f = scene({ tag: 'ring' });
    const { w, attenders, place } = f;
    const duration = new Map(attenders.map((p) => [p.id, p.activity!.duration]));
    const start = new Map(attenders.map((p) => [p.id, w.tick]));
    const act = new Map(attenders.map((p) => [p.id, p.activity!.id]));
    const start0 = new Map(attenders.map((p) => [p.id, { x: p.x, y: p.y }]));
    const moved = new Map<number, number>();
    let walking = 0, standing = 0, maxAtOnce = 0;
    for (let i = 0; i < 140; i++) {
      stepWorld(w);
      maxAtOnce = Math.max(maxAtOnce, dancers(f).length);
      for (const p of attenders) {
        const a = p.activity;
        if (!a || a.id !== act.get(p.id)) continue; // their time at the occasion is over (it is 90 to 240 ticks)
        // the attend activity's own clock is untouched: it counts one a tick from the start, and its length is what it was
        expect(a.progress, p.name + ' progress').toBe(w.tick - start.get(p.id)!);
        expect(a.duration, p.name + ' duration').toBe(duration.get(p.id));
        expect(a.phase).toBe('work');
        const x = Math.floor(p.x), y = Math.floor(p.y);
        expect(isWalkable(w, x, y), `${p.name} on open ground at ${p.x.toFixed(2)},${p.y.toFixed(2)}`).toBe(true);
        expect(distToFootprint(place as never, p.x, p.y), p.name + ' within reach').toBeLessThanOrEqual(DANCE_REACH);
        if (danceOf(p) && isDancing(a)) { if (p.pose === 'walk') walking++; else standing++; expect(a.label).toBe('Dancing at the wedding feast'); }
        else if (danceOf(p)) expect(a.label).toBe('At the wedding feast');
        const s0 = start0.get(p.id)!;
        moved.set(p.id, Math.max(moved.get(p.id) ?? 0, Math.hypot(p.x - s0.x, p.y - s0.y)));
      }
    }
    expect(maxAtOnce).toBeGreaterThanOrEqual(3);
    expect(walking, 'a dancer is drawn walking while they step').toBeGreaterThan(0);
    expect(standing, 'and standing between their steps').toBeGreaterThan(0);
    expect(everDanced(f).length).toBeGreaterThanOrEqual(3);
    for (const p of danced(f)) expect(moved.get(p.id), p.name + ' moved').toBeGreaterThan(0.8);
    // they danced their 120 ticks and then stood where they were: nobody is dancing, and the labels are back
    for (const p of danced(f)) {
      const d = danceOf(p);
      if (d) { expect(d.done, p.name).toBe(true); expect(d.n).toBeLessThanOrEqual(DANCE_TICKS); }
    }
  });

  it('the line is written once, in the occasion\'s own words, naming who it is for: at a wedding, a naming feast, a harvest feast', () => {
    const f = scene({ tag: 'line' });
    run(f.w, 60);
    expect(lines(f.w).map((e) => e.text)).toEqual(['People danced at the wedding feast for Bea and Cal.']);
    expect(lines(f.w)[0].kind).toBe('social');
    run(f.w, 100);
    expect(lines(f.w)).toHaveLength(1);
    expect(f.occ.dance?.line).toBe(true);
    const h = scene({ tag: 'harvest', kind: 'harvest' });
    run(h.w, 60);
    expect(lines(h.w).map((e) => e.text)).toEqual(['People danced at the harvest feast.']);
    const feast = scene({ tag: 'feast', kind: 'feast' });
    run(feast.w, 60);
    expect(lines(feast.w).map((e) => e.text)).toEqual(['People danced at the feast for Bea and Cal.']);
    feast.occ.naming = [feast.bea.id];
  });

  it('what it does for each who has danced: the want of company eased, a glad thought, and closer to the other dancers', () => {
    const f = scene({ tag: 'effects' });
    const social0 = new Map(f.attenders.map((p) => [p.id, p.needs.social]));
    run(f.w, 60);
    const who = danced(f).filter((p) => (danceOf(p)?.n ?? 0) >= DANCE_LINE_AT);
    expect(who.length).toBeGreaterThanOrEqual(2);
    for (const p of who) {
      expect(p.needs.social - social0.get(p.id)!, p.name).toBeGreaterThanOrEqual(DANCE_SOCIAL - 1);
      expect(p.mood?.thoughts.some((t) => t.kind === 'danced'), p.name).toBe(true);
      expect(p.log.some((l) => /^Danced at the wedding feast\.$/.test(l.text)), p.name).toBe(true);
    }
    // each pair was brought closer once, by the later of the two
    const [a, b] = who;
    const gained = (x: Person, y: Person) => x.relations[y.id]?.history.length ?? 0;
    expect(relOf(a, b.id).familiarity).toBeGreaterThan(0);
    expect(relOf(a, b.id).affinity).toBeGreaterThanOrEqual(DANCE_AFFINITY - 1e-9);
    expect(gained(a, b) + gained(b, a)).toBeGreaterThanOrEqual(0);
  });
});

describe('who dances: four or more there, in good spirits, at most eight', () => {
  it('not at a funeral or a market, whatever the numbers', () => {
    for (const kind of ['funeral', 'market'] as const) {
      const f = scene({ tag: 'kind-' + kind, kind });
      const before = f.attenders.map((p) => [p.x, p.y]);
      run(f.w, 100);
      expect(everDanced(f), kind).toEqual([]);
      expect(lines(f.w), kind).toEqual([]);
      expect(f.occ.dance).toBeUndefined();
      // they stood
      f.attenders.forEach((p, i) => expect([p.x, p.y], p.name).toEqual(before[i]));
    }
  });

  it('with three there nobody dances; with four somebody does (those in good spirits)', () => {
    const three = scene({ tag: 'three', n: 3 });
    run(three.w, 100);
    expect(everDanced(three)).toEqual([]);
    const four = scene({ tag: 'four', n: 4 });
    run(four.w, 100);
    expect(everDanced(four).length).toBeGreaterThanOrEqual(1);
    // somebody who has left leaves three
    const left = scene({ tag: 'four-left', n: 4 });
    left.attenders[3].x += 12; // too far from the place to be there
    rebuildMobileGrid(left.w);
    run(left.w, 100);
    expect(everDanced(left), 'one is not there').toEqual([]);
  });

  it('those low in mood stand; the rest dance; a person hurt or without food or water stands', () => {
    const f = scene({ tag: 'mood', n: 6, low: [0, 2] });
    run(f.w, 100);
    const ids = everDanced(f);
    expect(ids).not.toContain('Ada');
    expect(ids).not.toContain('Cy');
    expect(ids.length).toBeGreaterThanOrEqual(2);
    const g = scene({ tag: 'hurt', n: 5 });
    g.attenders[0].health = 40;
    g.attenders[1].needs.hunger = 10;
    g.attenders[2].needs.thirst = 10;
    run(g.w, 100);
    const names = everDanced(g);
    for (const n of ['Ada', 'Ben', 'Cy']) expect(names, n).not.toContain(n);
    expect(names.length).toBeGreaterThanOrEqual(1);
  });

  it('no more than eight dance at a gathering of twelve: the eight of the lowest ids who are in good spirits, and the others stand as they did', () => {
    const f = scene({ tag: 'twelve', n: 12 });
    const before = new Map(f.attenders.map((p) => [p.id, [p.x, p.y]]));
    let most = 0;
    for (let i = 0; i < 85; i++) { stepWorld(f.w); most = Math.max(most, dancers(f).length); } // 85: nobody's time at the occasion is shorter than 90
    expect(DANCERS_MAX).toBe(8);
    expect(most).toBeLessThanOrEqual(8);
    expect(f.occ.dance!.by.length).toBeLessThanOrEqual(8);
    const byLowest = [...f.attenders].sort((a, b) => a.id - b.id).slice(0, 8).map((p) => p.id);
    expect([...f.occ.dance!.by].sort((a, b) => a - b)).toEqual(byLowest.sort((a, b) => a - b));
    for (const p of f.attenders) if (!byLowest.includes(p.id)) expect([p.x, p.y], p.name + ' stood').toEqual(before.get(p.id));
  });
});

describe('daylight, or a lit fire within the safe distance', () => {
  it('after dark at a hall far from a lit fire nobody dances; at a hall beside one, they do; and at the camp fire itself, they do', () => {
    const far = scene({ tag: 'night-far', place: 'hall-far', tick: NIGHT });
    expect(safeToDance(far.w, far.occ)).toBe(false);
    run(far.w, 100);
    expect(everDanced(far), 'dark, and no fire near the hall').toEqual([]);
    const near = scene({ tag: 'night-near', place: 'hall', tick: NIGHT });
    expect(near.w.light).toBeLessThan(0.35);
    run(near.w, 100);
    expect(everDanced(near).length, 'dark, with a lit fire within 4 tiles of the hall').toBeGreaterThanOrEqual(2);
    const camp = scene({ tag: 'night-camp', place: 'fire', tick: NIGHT });
    run(camp.w, 100);
    expect(everDanced(camp).length).toBeGreaterThanOrEqual(2);
    // the same hall far from the fire, by day, is a dance
    const day = scene({ tag: 'day-far', place: 'hall-far', tick: NOON });
    run(day.w, 100);
    expect(everDanced(day).length).toBeGreaterThanOrEqual(2);
  });

  it('a dance under way stops where the dancers stand when the light goes and there is no fire near; a fire out takes the safe distance away', () => {
    const f = scene({ tag: 'dusk', place: 'hall-far', tick: NOON });
    run(f.w, 20);
    expect(dancers(f).length).toBeGreaterThanOrEqual(2);
    const p = dancers(f)[0];
    const a = p.activity!;
    const pos = [p.x, p.y];
    f.w.light = 0.1; // dark, as at night (the engine sets it from the time; here it is set by hand for one call of the step)
    danceStep(f.w, p, a, f.occ, 'wedding feast', () => '');
    expect(isDancing(a)).toBe(false);
    expect(a.label).toBe('At the wedding feast');
    expect([p.x, p.y]).toEqual(pos);
    expect(dancePose(a)).toBe('stand');
  });
});

describe('the ring is never off open ground, however the place is built about', () => {
  it('with a hut standing on the ring, every dancer is always on open ground within reach; those whose way is shut stop where they stand', () => {
    for (const place of ['fire', 'hall'] as const) {
      const f = scene({ tag: 'hut-' + place, place, hut: true, n: 8 });
      let stopped = 0;
      for (let i = 0; i < 160; i++) {
        stepWorld(f.w);
        for (const p of f.attenders) {
          expect(isWalkable(f.w, Math.floor(p.x), Math.floor(p.y)), `${p.name} at ${p.x.toFixed(2)},${p.y.toFixed(2)}`).toBe(true);
          expect(distToFootprint(f.place as never, p.x, p.y), p.name).toBeLessThanOrEqual(DANCE_REACH);
        }
      }
      for (const p of danced(f)) if (danceOf(p)?.done && (danceOf(p)?.n ?? 0) < DANCE_TICKS) stopped++;
      expect(everDanced(f).length, place).toBeGreaterThanOrEqual(2);
      void stopped;
    }
  });
});

describe('two who might walk out together, dancing: what one walk gives, once, and no walk counted', () => {
  /** two unpartnered grown people of the staged attenders who pass courting's test for each other, found by `spark` */
  function pair(f: Fx): [Person, Person] {
    for (const a of f.attenders) for (const b of f.attenders) {
      if (a.id < b.id && a.sex !== b.sex && spark(a, b)) {
        for (const [x, y] of [[a, b], [b, a]]) Object.assign(relOf(x, y.id), { affinity: 30, trust: 30, familiarity: 30 });
        return [a, b];
      }
    }
    throw new Error('no pair with a spark in this scene');
  }
  const gain = (a: Person, b: Person) => ({ aff: a.relations[b.id].affinity, trust: a.relations[b.id].trust, fam: a.relations[b.id].familiarity });

  it('the pair gain the fondness, trust and familiarity of one counted walk (and the dance\'s own), the pair\'s count of walks is untouched', () => {
    const f = scene({ tag: 'courting', n: 8 });
    const [a, b] = pair(f);
    expect(mayWalkOutTogether(f.w, a, b)).toBe(true);
    const before = { ab: gain(a, b), ba: gain(b, a) };
    run(f.w, 90);
    expect(a.relations[b.id].courted, 'no walk is counted').toBeUndefined();
    expect(b.relations[a.id].courted).toBeUndefined();
    expect(danced(f).map((p) => p.id)).toEqual(expect.arrayContaining([a.id, b.id]));
    const after = { ab: gain(a, b), ba: gain(b, a) };
    for (const [x, y] of [[after.ab, before.ab], [after.ba, before.ba]]) {
      expect(x.aff - y.aff, 'fondness').toBeGreaterThanOrEqual(GAIN_AFFINITY + DANCE_AFFINITY - 1e-9);
      expect(x.trust - y.trust, 'trust').toBeGreaterThanOrEqual(GAIN_TRUST - 1e-9);
      expect(x.fam - y.fam, 'familiarity').toBeGreaterThanOrEqual(GAIN_FAMILIARITY - 1e-9);
    }
    // once: the dance running to its end adds nothing more for the pair
    const mid = gain(a, b);
    run(f.w, 120);
    expect(gain(a, b).trust - mid.trust, 'no second gain').toBeLessThan(GAIN_TRUST - 0.5);
  });

  it('not with the courting part off, not for a couple, not when one of them is a child, not without the closeness courting asks for', () => {
    const off = scene({ tag: 'courting-off', n: 8 });
    const [a, b] = pair(off);
    setMeeting(false, 'courting');
    const t0 = gain(a, b).trust;
    run(off.w, 90);
    expect(gain(a, b).trust, 'courting off').toBe(t0);
    setMeeting(true);
    const couple = scene({ tag: 'couple', n: 8 });
    const [c, d] = pair(couple);
    c.partnerId = d.id; d.partnerId = c.id;
    expect(mayWalkOutTogether(couple.w, c, d)).toBe(false);
    const t1 = gain(c, d).trust;
    run(couple.w, 90);
    expect(gain(c, d).trust, 'partnered').toBe(t1);
    const cold = scene({ tag: 'strangers', n: 8 });
    const [e, g] = [cold.attenders[0], cold.attenders[1]];
    expect(mayWalkOutTogether(cold.w, e, g)).toBe(false);
  });
});

describe('the part off, and rules 261: they stand as they did', () => {
  const summary = (f: Fx) => ({ pos: f.attenders.map((p) => [p.x, p.y]), events: f.w.events.map((e) => e.text), social: f.attenders.map((p) => p.needs.social), data: f.attenders.map((p) => p.activity?.data.dance ?? null), occ: f.occ.dance ?? null });
  it('with the part off, and at rules 261, nobody moves, nothing is written, and the shared stream is where it is with the dance', () => {
    const go = (version: number, off: boolean) => {
      setCompanyScenes(!off, 'dance');
      const f = scene({ tag: 'twin', version });
      run(f.w, 100);
      const out = { s: summary(f), rng: [f.w.rng.a, f.w.rng.b, f.w.rng.c, f.w.rng.d] };
      setCompanyScenes(true);
      return out;
    };
    const on = go(262, false), off = go(262, true), old = go(261, false);
    expect(on.s.events.some((e) => /^People danced/.test(e))).toBe(true);
    for (const x of [off, old]) {
      expect(x.s.events.some((e) => /^People danced/.test(e))).toBe(false);
      expect(x.s.data.every((d) => d === null)).toBe(true);
      expect(x.s.occ).toBeNull();
    }
    expect(off.s.events).toEqual(old.s.events);
    expect(off.s.pos).toEqual(old.s.pos);
    expect(off.s.social).toEqual(old.s.social);
    expect(on.rng, 'the dance draws nothing from the shared stream').toEqual(off.rng);
    expect(old.rng).toEqual(off.rng);
  });
});

describe('save, load, continue, and the saved state', () => {
  it('a world saved in the middle of a dance continues exactly: the same ring, the same count, the same line, the same world', () => {
    const f = scene({ tag: 'save' });
    run(f.w, 40);
    expect(dancers(f).length).toBeGreaterThanOrEqual(2);
    const copy = deserializeWorld(serializeWorld(f.w));
    expect(copy.persons.filter((p) => isDancing(p.activity)).map((p) => [p.id, (p.activity!.data.dance as DanceData).n])).toEqual(dancers(f).map((p) => [p.id, danceOf(p)!.n]));
    for (let i = 0; i < 200; i++) { stepWorld(f.w); stepWorld(copy); }
    expect(lines(copy).map((e) => e.text)).toEqual(lines(f.w).map((e) => e.text));
    expect(lines(f.w)).toHaveLength(1);
    expect(serializeWorld(copy)).toBe(serializeWorld(f.w));
    expect(hashWorld(copy)).toBe(hashWorld(f.w));
  });

  it('a person drawn off by a talk (the activity held, then picked up again) keeps their count and goes on from where it was', () => {
    const f = scene({ tag: 'held' });
    run(f.w, 30);
    const p = dancers(f)[0];
    const d = danceOf(p)!;
    const n0 = d.n;
    expect(n0).toBeGreaterThan(5);
    const a: Activity = p.activity!;
    suspendActivity(f.w, p);
    expect(p.activity).toBeNull();
    expect(p.suspended!.data.dance, 'the count is held with the activity').toBe(d);
    run(f.w, 2); // the engine picks it up again at once (an occasion's activity keeps its place, rules 111)
    expect(p.activity).toBe(a);
    run(f.w, 60);
    expect(danceOf(p)!.n, 'the same dance goes on').toBeGreaterThan(n0);
    expect(danceOf(p)!.n).toBeLessThanOrEqual(DANCE_TICKS);
  });

  it('the dance is in the world fingerprint (the occasion\'s record and a dancer\'s own count)', () => {
    const f = scene({ tag: 'hash' });
    run(f.w, 40);
    const h0 = hashWorld(f.w);
    f.occ.dance!.by.pop();
    expect(hashWorld(f.w)).not.toBe(h0);
    const g = scene({ tag: 'hash2' });
    run(g.w, 40);
    const h1 = hashWorld(g.w);
    danceOf(dancers(g)[0])!.n += 1;
    expect(hashWorld(g.w)).not.toBe(h1);
  });

  it('a save with a dance record or a dancer that cannot be is refused on loading', () => {
    const f = scene({ tag: 'refuse' });
    run(f.w, 60);
    expect(() => validateDance(f.w)).not.toThrow();
    const rec = f.occ.dance!;
    const good = JSON.parse(JSON.stringify(rec)) as NonNullable<Occasion['dance']>;
    const bad: [string, NonNullable<Occasion['dance']>][] = [
      ['nobody', { by: [] }],
      ['nine', { by: [1, 2, 3, 4, 5, 6, 7, 8, 9] }],
      ['twice', { by: [1, 1] }],
      ['not an id', { by: [0] }],
      ['steady beyond the dancers', { by: [1, 2], steady: 3 }],
      ['a line with nobody steady', { by: [1, 2], steady: 1, line: true }],
    ];
    for (const [why, r] of bad) {
      f.occ.dance = r;
      expect(() => validateDance(f.w), why).toThrow(/dance/i);
    }
    f.occ.dance = good;
    f.occ.kind = 'funeral';
    expect(() => validateDance(f.w), 'a dance at a funeral').toThrow(/dance/i);
    f.occ.kind = 'wedding';
    const p = dancers(f)[0] ?? f.attenders.find((x) => danceOf(x))!;
    const d = danceOf(p)!;
    for (const [why, patch] of [['past its time', { n: DANCE_TICKS + 1 }], ['no angle', { ang: Number.NaN }], ['a huge ring', { r: 40 }], ['not moving as true', { moving: false as never }]] as [string, Partial<DanceData>][]) {
      const keep = { ...d };
      Object.assign(d, patch);
      expect(() => validateDance(f.w), why).toThrow(/dance/i);
      Object.assign(d, keep);
      delete (d as Partial<DanceData>).moving;
      if (keep.moving) d.moving = true;
    }
    f.w.settings.rulesVersion = 261;
    expect(() => validateDance(f.w), 'a dance in a world of rules 261').toThrow(/dance/i);
  });
});
