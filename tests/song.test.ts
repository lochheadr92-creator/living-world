// Rules 262 (bundle C, part 7a): a song at the fire (src/sim/song.ts, the switch in src/sim/company_scenes.ts; called in act_misc.ts at the half-way point of an evening
// sitting, after a thanks and a story). Every situation here is STAGED: it checks a rule, it is not an example of spontaneous behaviour.
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { newActivity, startActivity } from '../src/sim/activities';
import { createBuilding } from '../src/sim/buildings';
import { COMPANY_FROM, COMPANY_SCENE_PARTS, companyScenePartOn, hasSong, setCompanyScenes } from '../src/sim/company_scenes';
import { DAY } from '../src/sim/constants';
import { FIRE_TICKS } from '../src/sim/evening_fire';
import { think } from '../src/sim/mood';
import { relOf } from '../src/sim/relations';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { SONG_AFFINITY, SONG_CHANCE, SONG_JOINS, SONG_QUIET, SONG_SOCIAL, SONG_STARTS, fireSings, songAtFire, validateSong } from '../src/sim/song';
import { thankRescuer } from '../src/sim/praise';
import type { Activity, Building, Person, World } from '../src/sim/types';
import { hashWorld, stepWorld } from '../src/sim/world';
import { parseIntervention } from '../scripts/lab/lab';
import { addPerson, building, done, learn, stage } from './helpers/kit';

afterEach(() => setCompanyScenes(true));

const HALF = Math.floor(FIRE_TICKS / 2);
const EVENING = DAY + Math.round(0.36 * DAY);
const NAMES = ['Quinn', 'Pat', 'Ola', 'Max', 'Ivy', 'Dov', 'Eve', 'Kit'];
const songs = (w: World) => w.events.filter((e) => / started a song at the fire /.test(e.text));

interface Opts {
  /** how many sit there (default 4) */
  n?: number;
  /** does the hash give this fire a song on the evening chosen (default yes) */
  sings?: boolean;
  /** each sitter's sociability, in order; default 0.9 for the first and 0.6 for the rest */
  soc?: number[];
  /** ages, in order (default 30 and then 20 + 5 each) */
  ages?: number[];
  /** the sitters who are low in mood (by index) */
  low?: number[];
}
interface Fire { w: World; fire: Building; sit: Person[]; seat: (x: Person, progress?: number) => Activity }

/** A lit fire and Opts.n people at it, all fed, watered and in good spirits unless said otherwise. The tick is an evening on which the fire's hash says what Opts.sings says. */
function fireScene(version: number, tag: string, o: Opts = {}): Fire {
  const s = stage(`song-${tag}`), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  const n = o.n ?? 4;
  const sit: Person[] = [];
  for (let i = 0; i < n; i++) sit.push(addPerson(s, NAMES[i], 44 + i, 33, { age: o.ages?.[i] ?? (i === 0 ? 30 : 20 + 5 * i), sex: i % 2 ? 'f' : 'm', traits: { sociability: o.soc?.[i] ?? (i === 0 ? 0.9 : 0.6) } }));
  const fire = building(s, 'fire', 46, 28);
  fire.fuel = 80;
  done(s);
  const want = o.sings ?? true;
  let k = 0;
  for (w.tick = EVENING; fireSings(w, fire.id) !== want && k < 60; k++) w.tick += DAY;
  for (const x of sit) { x.needs = { hunger: 95, thirst: 95, energy: 90, warmth: 95, safety: 95, social: 50 }; x.chrono = 0; learn(w, x, fire); x.nextThink = w.tick + 100000; }
  (o.low ?? []).forEach((i) => think(w, sit[i], 'sad', -40, DAY, 'a heavy day'));
  const seat = (x: Person, progress = 10): Activity => {
    x.x = fire.x + 1.0 + (x.id % 3) * 0.6;
    x.y = fire.y + 1.8 + (x.id % 2) * 0.6;
    const a = newActivity(w, x, { kind: 'wander', label: 'Sitting by the fire', goal: 'to sit in company', spotX: x.x, spotY: x.y, tx: x.x, ty: x.y, utility: 20, minCommit: 90, maxTicks: 600, here: true });
    a.data.evening = 'fire';
    a.data.fireId = fire.id;
    startActivity(w, x, a);
    a.duration = FIRE_TICKS;
    a.progress = progress;
    return a;
  };
  return { w, fire, sit, seat };
}
/** everybody seated, one of them a tick short of their half-way point (the next tick of work brings them to it) */
function seated(f: Fire, halfFor = 0): Activity {
  let mine: Activity | null = null;
  f.sit.forEach((x, i) => { const a = f.seat(x, i === halfFor ? HALF - 1 : 10); if (i === halfFor) mine = a; });
  return mine!;
}

describe('rules 262 part 7a is registered', () => {
  it('has its switch, a lab arm of its own, and is a supported version', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(262);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(262);
    expect(COMPANY_FROM).toBe(262);
    expect(COMPANY_SCENE_PARTS).toEqual(['song', 'dance', 'reunion']);
    expect(parseIntervention('rich-no-company-song').summary).toMatch(/song/);
    // the arms of rules 200's room for company are not these, and still parse as they did
    expect(parseIntervention('rich-no-company').summary).toMatch(/rules-200/);
    const f = fireScene(262, 'arm');
    expect(hasSong(f.w)).toBe(true);
    const undo = parseIntervention('rich-no-company-song').install!();
    expect(COMPANY_SCENE_PARTS.map((p) => companyScenePartOn(p))).toEqual([false, true, true]);
    expect(hasSong(f.w)).toBe(false);
    undo();
    expect(hasSong(f.w)).toBe(true);
    parseIntervention('rich-no-company-scenes').install!();
    expect(COMPANY_SCENE_PARTS.map((p) => companyScenePartOn(p))).toEqual([false, false, false]);
    setCompanyScenes(true);
  });

  it('is not there at rules 261 or in an authored world', () => {
    expect(hasSong(fireScene(261, 'old').w)).toBe(false);
    const g = fireScene(262, 'authored');
    g.w.settings.dynamics = 'authored';
    expect(hasSong(g.w)).toBe(false);
  });
});

describe('a song at the half-way point', () => {
  it('the most sociable sitter starts it, the others in good spirits join with a line of their own: the line, the speech, the eased want, the closeness, the glad thought', () => {
    const f = fireScene(262, 'song', { soc: [0.7, 0.95, 0.6, 0.6] });
    const { w, sit, fire } = f;
    const [quinn, pat, ola, max] = sit;
    seated(f, 0); // it is Quinn's half-way point, and Pat is the most sociable
    const social0 = sit.map((x) => x.needs.social);
    const aff0 = (a: Person, b: Person) => relOf(a, b.id).affinity;
    const before = { pq: aff0(pat, quinn), qo: aff0(quinn, ola), om: aff0(ola, max) };
    stepWorld(w);
    expect(quinn.activity?.progress).toBe(HALF);
    const ev = songs(w);
    expect(ev.map((e) => e.text)).toEqual(['Pat started a song at the fire and 3 joined in.']);
    expect(ev[0].kind).toBe('social');
    expect(new Set(ev[0].ids)).toEqual(new Set(sit.map((x) => x.id)));
    expect(SONG_STARTS).toContain(pat.speech?.text);
    for (const x of [quinn, ola, max]) expect(SONG_JOINS, x.name).toContain(x.speech?.text);
    sit.forEach((x, i) => expect(x.needs.social - social0[i], x.name).toBeCloseTo(SONG_SOCIAL, 0));
    expect(aff0(pat, quinn) - before.pq).toBeCloseTo(SONG_AFFINITY, 5);
    expect(aff0(quinn, ola) - before.qo).toBeCloseTo(SONG_AFFINITY, 5);
    expect(aff0(ola, max) - before.om).toBeCloseTo(SONG_AFFINITY, 5);
    for (const x of sit) expect(x.mood?.thoughts.some((t) => t.kind === 'sang'), x.name).toBe(true);
    expect(pat.log.some((l) => /^Started a song at the fire; 3 joined in\.$/.test(l.text))).toBe(true);
    expect(quinn.log.some((l) => /^Joined Pat's song at the fire\.$/.test(l.text))).toBe(true);
    expect(fire.sung).toBe(w.tick - 1);
  });

  it('a child may join in; a child, or anybody not sociable, does not start it', () => {
    const f = fireScene(262, 'child', { n: 3, ages: [30, 9, 8], soc: [0.2, 1, 1] });
    const [, kid] = f.sit;
    seated(f, 0);
    stepWorld(f.w);
    // the grown one is not sociable and the children are not grown: nobody starts it
    expect(songs(f.w)).toEqual([]);
    expect(kid.needs.social).toBeLessThan(60);
    const g = fireScene(262, 'child-join', { n: 3, ages: [30, 9, 8], soc: [0.8, 1, 1] });
    seated(g, 0);
    stepWorld(g.w);
    expect(songs(g.w).map((e) => e.text)).toEqual(['Quinn started a song at the fire and 2 joined in.']);
    expect(SONG_JOINS).toContain(g.sit[1].speech?.text);
  });

  it('on a tie in sociability the lowest id starts it', () => {
    const f = fireScene(262, 'tie', { soc: [0.8, 0.8, 0.8, 0.8] });
    seated(f, 2);
    stepWorld(f.w);
    expect(songs(f.w).map((e) => e.text)).toEqual(['Quinn started a song at the fire and 3 joined in.']);
  });

  it('those who are low in mood neither start nor join: the song is the others', () => {
    const f = fireScene(262, 'low', { low: [0, 3], soc: [0.95, 0.6, 0.6, 0.6] });
    const [quinn, pat, ola, max] = f.sit;
    seated(f, 1);
    const maxSocial = max.needs.social;
    stepWorld(f.w);
    // Quinn is the most sociable but is low: Pat starts it, Ola joins, Max (low) does not
    expect(songs(f.w).map((e) => e.text)).toEqual(['Pat started a song at the fire and 1 joined in.']);
    expect(ola.speech?.text).toBeTruthy();
    expect(quinn.speech).toBeNull();
    expect(max.speech).toBeNull();
    expect(max.needs.social).toBeLessThanOrEqual(maxSocial);
    expect(max.mood?.thoughts.some((t) => t.kind === 'sang')).toBe(false);
    expect(pat.activity).toBeTruthy();
  });
});

describe('when nothing happens, and nothing is written', () => {
  const stepOnce = (f: Fire, half = 0): number => { seated(f, half); stepWorld(f.w); return songs(f.w).length; };

  it('with the control, a song; and not with too few sitters, nobody to join, nobody sociable or in the mood to start it, the wrong half, or a fire the hash gives no song', () => {
    expect(stepOnce(fireScene(262, 'control'))).toBe(1);
    expect(stepOnce(fireScene(262, 'two', { n: 2 })), 'two is too few').toBe(0);
    expect(stepOnce(fireScene(262, 'alone-in-mood', { low: [1, 2, 3] })), 'nobody to join').toBe(0);
    expect(stepOnce(fireScene(262, 'shy', { soc: [0.4, 0.4, 0.4, 0.4] })), 'nobody sociable').toBe(0);
    expect(stepOnce(fireScene(262, 'low-all', { low: [0, 1, 2, 3] })), 'nobody in the mood').toBe(0);
    expect(stepOnce(fireScene(262, 'no-hash', { sings: false })), 'the hash gives this fire no song this evening').toBe(0);
    const f = fireScene(262, 'not-half');
    f.sit.forEach((x) => f.seat(x, 10));
    f.w.tick++;
    f.sit[0].activity!.progress = HALF;
    stepWorld(f.w);
    expect(songs(f.w)).toEqual([]);
    for (const x of fireScene(262, 'quiet', { n: 2 }).sit) expect(x.speech).toBeNull();
  });

  it('nothing is changed for those who sat and did not sing, and no fire is marked', () => {
    const f = fireScene(262, 'shy-state', { soc: [0.4, 0.4, 0.4, 0.4] });
    seated(f, 0);
    const social0 = f.sit.map((x) => x.needs.social);
    stepWorld(f.w);
    expect(f.fire.sung).toBeUndefined();
    f.sit.forEach((x, i) => expect(x.needs.social, x.name).toBeLessThanOrEqual(social0[i] + 0.0001));
    expect(f.sit.every((x) => !x.mood?.thoughts.some((t) => t.kind === 'sang'))).toBe(true);
  });
});

describe('the caps: one song a fire an evening, one evening in three', () => {
  it('a second sitter reaching their half-way point at the same fire the same evening starts nothing; the fire is quiet for half a day', () => {
    const f = fireScene(262, 'one-per-evening');
    seated(f, 0);
    stepWorld(f.w);
    expect(songs(f.w)).toHaveLength(1);
    const first = f.fire.sung!;
    // another sitter, a few ticks later, reaches their half-way point: no second song
    f.sit[1].activity!.progress = HALF - 1;
    for (let i = 0; i < 5; i++) stepWorld(f.w);
    expect(songs(f.w)).toHaveLength(1);
    expect(f.fire.sung).toBe(first);
    // called directly, as the act_misc.ts half-way call does it, with the quiet time not yet over
    f.sit[2].activity!.progress = Math.floor(f.sit[2].activity!.duration / 2);
    expect(songAtFire(f.w, f.sit[2], f.sit[2].activity!)).toBe(false);
    // half a day later the fire is quiet no longer (the next evening's hash says whether it sings then)
    f.w.tick = first + SONG_QUIET;
    f.sit[2].activity!.progress = Math.floor(f.sit[2].activity!.duration / 2);
    expect(f.w.tick - f.fire.sung!).toBeGreaterThanOrEqual(SONG_QUIET);
    expect(songAtFire(f.w, f.sit[2], f.sit[2].activity!), 'quiet time over, but a day has gone by and the hash decides').toBe(fireSings(f.w, f.fire.id));
  });

  it('the hash gives about one evening in three, and gives it to a fire and a day, not to a person', () => {
    const w = fireScene(262, 'hash').w;
    let n = 0, total = 0;
    for (let id = 1000; id < 1040; id++) for (let day = 1; day <= 25; day++) { w.tick = day * DAY + 1200; if (fireSings(w, id)) n++; total++; }
    expect(n / total).toBeGreaterThan(SONG_CHANCE - 0.06);
    expect(n / total).toBeLessThan(SONG_CHANCE + 0.06);
    // the same fire and day always say the same
    w.tick = 7 * DAY + 1200;
    expect(fireSings(w, 1001)).toBe(fireSings(w, 1001));
  });

  it('an evening that the hash gives no song to stays without one however the sitters are', () => {
    const f = fireScene(262, 'no-song-evening', { sings: false, soc: [1, 1, 1, 1] });
    expect(stepOnceCount(f)).toBe(0);
  });
});
function stepOnceCount(f: Fire): number {
  seated(f, 0);
  stepWorld(f.w);
  return songs(f.w).length;
}

describe('the order at the half-way point: a thanks, then a story, then the song', () => {
  /** Quinn (30) is sat with three others; the chronicle holds a tale, so a story can be told; and a thanks owed to Pat if `owes` */
  const sitting = (tag: string, o: { owes?: boolean; tale?: boolean }) => {
    const f = fireScene(262, tag, { soc: [0.95, 0.7, 0.6, 0.6] });
    const [quinn, pat] = f.sit;
    if (o.tale) (f.w.chronicle ??= []).push({ id: 9001, tick: f.w.tick - 4 * DAY, kind: 'social', text: 'Ulric pulled a child out of the river.', ids: [9999], x: 0, y: 0 });
    if (o.owes) thankRescuer(f.w, pat, quinn, false);
    seated(f, 0);
    stepWorld(f.w);
    return f.w.events.map((e) => e.text);
  };

  it('with a story to tell Quinn tells it, and there is no song at that sitting', () => {
    const t = sitting('story', { tale: true });
    expect(t.some((x) => /^Quinn told a story at the fire/.test(x))).toBe(true);
    expect(t.some((x) => / started a song at the fire /.test(x))).toBe(false);
  });

  it('with a thanks owed Quinn speaks it, and there is no story and no song', () => {
    const t = sitting('thanks', { tale: true, owes: true });
    expect(t.some((x) => /^At the fire Quinn thanked Pat/.test(x))).toBe(true);
    expect(t.some((x) => / started a song at the fire /.test(x) || /told a story/.test(x))).toBe(false);
  });

  it('with neither a thanks nor a story, the song', () => {
    const t = sitting('song', {});
    expect(t.some((x) => / started a song at the fire /.test(x))).toBe(true);
    expect(t.some((x) => /told a story/.test(x))).toBe(false);
  });
});

describe('the part off, and rules 261: the sitting is as it was', () => {
  const summary = (f: Fire) => ({
    events: f.w.events.map((e) => e.text),
    needs: f.sit.map((x) => [x.name, x.needs.social, x.speech?.text ?? null]),
    rel: f.sit.map((x) => Object.entries(x.relations).map(([id, r]) => [id, r.affinity, r.familiarity])),
    thoughts: f.sit.map((x) => (x.mood?.thoughts ?? []).map((t) => t.kind)),
    sung: f.fire.sung,
  });
  it('with the part off, and at rules 261, nothing is sung and nothing differs from a sitting without a song, and the shared stream is where it was', () => {
    const run = (version: number, tag: string, off: boolean) => {
      setCompanyScenes(!off, 'song');
      const f = fireScene(version, tag);
      seated(f, 0);
      for (let i = 0; i < 4; i++) stepWorld(f.w);
      const out = { s: summary(f), rng: [f.w.rng.a, f.w.rng.b, f.w.rng.c, f.w.rng.d] };
      setCompanyScenes(true);
      return out;
    };
    const on = run(262, 'twin', false);
    const off = run(262, 'twin', true);
    const old = run(261, 'twin', false);
    expect(on.s.events.some((e) => / started a song /.test(e))).toBe(true);
    expect(off.s.events.some((e) => / started a song /.test(e))).toBe(false);
    expect(off.s.sung).toBeUndefined();
    expect(old.s.sung).toBeUndefined();
    // the world draws the same numbers whether or not the song is sung
    expect(on.rng).toEqual(off.rng);
    expect(old.rng).toEqual(off.rng);
    // and with the song off the sitting is what rules 261 made of it, event for event
    expect(off.s.events).toEqual(old.s.events);
    expect(off.s.thoughts).toEqual(old.s.thoughts);
    expect(off.s.rel).toEqual(old.s.rel);
    expect(off.s.needs).toEqual(old.s.needs);
  });
});

describe('save, load, continue, and the saved state', () => {
  it('a world saved in the middle of a sitting, a tick before the half-way point, continues exactly: the same song, the same fire marked, the same world', () => {
    const f = fireScene(262, 'save');
    seated(f, 0);
    f.sit[0].activity!.progress = HALF - 2;
    stepWorld(f.w);
    const copy = deserializeWorld(serializeWorld(f.w));
    for (let i = 0; i < 40; i++) { stepWorld(f.w); stepWorld(copy); }
    expect(songs(copy).map((e) => e.text)).toEqual(songs(f.w).map((e) => e.text));
    expect(songs(f.w)).toHaveLength(1);
    expect(copy.buildings.find((b) => b.id === f.fire.id)!.sung).toBe(f.fire.sung);
    expect(serializeWorld(copy)).toBe(serializeWorld(f.w));
    expect(hashWorld(copy)).toBe(hashWorld(f.w));
  });

  it('a song that has been sung is in the world fingerprint', () => {
    const f = fireScene(262, 'hash');
    const h0 = hashWorld(f.w);
    f.fire.sung = f.w.tick - 5;
    expect(hashWorld(f.w)).not.toBe(h0);
  });

  it('a save with a song record that cannot be is refused on loading', () => {
    const f = fireScene(262, 'refuse');
    expect(() => validateSong(f.w)).not.toThrow();
    f.fire.sung = f.w.tick - 10;
    expect(() => validateSong(f.w)).not.toThrow();
    f.fire.sung = f.w.tick + 5;
    expect(() => validateSong(f.w), 'a song in the future').toThrow(/song/i);
    f.fire.sung = -1;
    expect(() => validateSong(f.w)).toThrow(/song/i);
    f.fire.sung = 12.5;
    expect(() => validateSong(f.w)).toThrow(/song/i);
    f.fire.sung = f.w.tick - 10;
    f.w.settings.rulesVersion = 261;
    expect(() => validateSong(f.w), 'a song in a world of rules 261').toThrow(/song/i);
    f.w.settings.rulesVersion = 262;
    const kiln = createBuilding(f.w, 'kiln', 60, 40, 0, { condition: 100 });
    kiln.sung = 0;
    expect(() => validateSong(f.w), 'a song at something that is not a fire').toThrow(/song/i);
  });
});
