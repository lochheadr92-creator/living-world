// Rules 211: more ways to play (src/sim/play.ts; childhood.ts, the childhood ask in options_social.ts, the idle option in
// options_work.ts, the wander handler in act_misc.ts). Every situation here is STAGED: it checks a rule, it is not an example of
// spontaneous behaviour. The ordinary-world origin is the child's-day probe (a game finished on 0.18 of a child's days; 36 percent of
// games refused because the child asked "had already had that time today"; nothing for a child to do alone but the grown person's
// spare-time walk). Each check has the rules-210 contrast.
import { afterEach, describe, expect, it } from 'vitest';
import { startActivity } from '../src/sim/activities';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { DAY } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { conservationReport } from '../src/sim/economy';
import { observe } from '../src/sim/knowledge';
import { perceive } from '../src/sim/perception';
import { GAMES, GAME_PAUSE, PLAY_PARTS, SOLO_SEED, SOLO_TICKS, gameName, gameTurn, nextGame, notePlayed, playedToday, setPlay } from '../src/sim/play';
import type { Game } from '../src/sim/play';
import { newRelation } from '../src/sim/relations';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { makeSource } from '../src/sim/sources';
import { stepWorld } from '../src/sim/world';
import { addPerson, building, done, learn, pin, stage } from './helpers/kit';
import type { Person, World } from '../src/sim/types';

afterEach(() => setPlay(true));

/** Talia, eight, beside Wes, ten, who is not of her family. `played` are the games she has already had today. */
function pair(version: number, opts: { played?: Game[]; tag?: string } = {}) {
  const s = stage(`play-pair-${version}-${(opts.played ?? []).join('+')}-${opts.tag ?? ''}`), w = s.w;
  w.settings.dynamics = 'rich'; w.settings.rulesVersion = version; w.tick = DAY;
  const p = addPerson(s, 'Talia', 40, 40, { age: 8, traits: { sociability: 0.9, curiosity: 0.9 } });
  const q = addPerson(s, 'Wes', 41.5, 40, { age: 10, traits: { sociability: 0.9 } });
  done(s);
  for (const x of [p, q]) x.needs = { hunger: 95, thirst: 95, energy: 95, warmth: 95, safety: 95, social: 90 };
  p.relations[q.id] = { ...newRelation(), affinity: 60, trust: 40, familiarity: 5 };
  q.relations[p.id] = { ...newRelation(), affinity: 60, trust: 40, familiarity: 5 };
  for (const g of opts.played ?? []) p.cooldowns['game:' + g] = w.tick + DAY;
  pin(q); perceive(w, p);
  const offer = () => generateOptions(w, p, true, true).options.find((o) => o.key === `socialize:${q.id}:play_together`);
  const reach = () => { const o = offer(); expect(o, 'play is on offer').toBeTruthy(); startActivity(w, p, o!.make!()!); for (let i = 0; i < 200 && !w.conversations[0]?.childhood; i++) stepWorld(w); return w.conversations[0]; };
  const finish = () => { for (let n = 0; n < 300 && p.convId; n++) stepWorld(w); };
  return { w, p, q, offer, reach, finish };
}
// she has had the guessing game, chase and hide and seek today: playing house is what is left to ask for
const ONLY_HOUSE: Game[] = ['guess', 'chase', 'hide'];

describe('rules 211 is registered', () => {
  it('is registered and supported (the current version may be later), with two parts', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(211);
    expect(SUPPORTED_RULES_VERSIONS).toContain(211);
    expect(PLAY_PARTS).toEqual(['games', 'solo']);
    expect(GAMES).toEqual(['guess', 'chase', 'hide', 'house']);
  });
});

describe('the rules themselves', () => {
  it('the game a child asks for is one they have not played today; with all four played there is none', () => {
    const f = pair(211, { played: ONLY_HOUSE });
    expect(nextGame(f.w, f.p)).toBe('house');
    expect(playedToday(f.w, f.p, 'chase')).toBe(true);
    expect(playedToday(f.w, f.p, 'house')).toBe(false);
    notePlayed(f.w, f.p, 'house');
    expect(nextGame(f.w, f.p)).toBeNull();
    expect(f.p.cooldowns['child:play_together']).toBe(f.w.tick + GAME_PAUSE);
    const fresh = pair(211);
    expect(GAMES).toContain(nextGame(fresh.w, fresh.p));
    expect(gameName('chase')).toBe('A game of chase');
    expect(gameTurn('hide', true)).not.toBe(gameTurn('hide', false));
  });
});

describe('games: a child who has had three games today', () => {
  it('at 210 the one game is the guessing game; at 211 she asks for playing house, it is paid as before and continues exactly through a save and load', () => {
    const old = pair(210, { played: ONLY_HOUSE });
    expect(old.offer()?.label).toBe('A guessing game with Wes');
    const now = pair(211, { played: ONLY_HOUSE });
    expect(now.offer()?.label).toBe('Playing house with Wes');
    const c = now.reach();
    expect(c?.childhood?.outcome).toBe('sharing');
    expect(c?.childhood?.game).toBe('house');
    expect(now.p.activity?.label).toBe('Playing house with Wes');
    const copy = deserializeWorld(serializeWorld(now.w));
    expect(serializeWorld(copy)).toBe(serializeWorld(now.w));
    for (let n = 0; n < 300 && now.p.convId; n++) { stepWorld(now.w); stepWorld(copy); }
    expect(serializeWorld(copy)).toBe(serializeWorld(now.w));
    expect(now.p.lastInteraction?.outcome).toBe('Playing house completed');
    for (const x of [now.p, now.q]) {
      expect(playedToday(now.w, x, 'house')).toBe(true);
      expect(x.cooldowns['child:play_together']).toBeGreaterThan(now.w.tick);
      expect(x.cooldowns['child:play_together']).toBeLessThanOrEqual(now.w.tick + GAME_PAUSE);
    }
    expect(now.p.relations[now.q.id].childhood?.[0].kind).toBe('play_together');
    expect(playedToday(now.w, now.q, 'chase'), 'he has only had this one game').toBe(false);
    expect(now.offer(), 'she has now had all four').toBeUndefined();
    expect(conservationReport(now.w).ok).toBe(true);
  });

  it('the guessing game is still a game: asked for when it is the one left, with no game written on the session', () => {
    const f = pair(211, { played: ['chase', 'hide', 'house'] });
    expect(f.offer()?.label).toBe('A guessing game with Wes');
    const c = f.reach();
    expect(c?.childhood?.game).toBeUndefined();
    f.finish();
    expect(f.p.lastInteraction?.outcome).toBe('A guessing game completed');
    expect(playedToday(f.w, f.p, 'guess')).toBe(true);
  });

  it('the one asked declines only a game he has played today', () => {
    // at 210 a child who has had his play for the day declines any game
    const old = pair(210, { tag: 'had-play' });
    old.q.cooldowns['child:play_together'] = old.w.tick + DAY;
    expect(old.reach()?.childhood?.outcome).toBe('declined');
    // at 211 the same memory does not refuse a game he has not played
    const other = pair(211, { played: ONLY_HOUSE, tag: 'other-game' });
    other.q.cooldowns['child:play_together'] = other.w.tick + DAY;
    other.q.cooldowns['game:chase'] = other.w.tick + DAY;
    expect(other.reach()?.childhood?.outcome).toBe('sharing');
    // and he does decline the game he has had
    const same = pair(211, { played: ONLY_HOUSE, tag: 'same-game' });
    same.q.cooldowns['game:house'] = same.w.tick + DAY;
    const c = same.reach();
    expect(c?.childhood?.outcome).toBe('declined');
    expect(c?.childhood?.reason).toContain('already had that time');
  });

  it('with the part off there is one game and one daily limit, as at 210', () => {
    setPlay(false, 'games');
    const f = pair(211, { played: ONLY_HOUSE, tag: 'off' });
    expect(f.offer()?.label).toBe('A guessing game with Wes');
    f.q.cooldowns['child:play_together'] = f.w.tick + DAY;
    expect(f.reach()?.childhood?.outcome).toBe('declined');
  });
});

/** Mona, nine, alone near her home, fed and rested by day, knowing a berry bush close by. */
function alone(version: number, opts: { age?: number; hunger?: number; tag?: string } = {}) {
  const s = stage(`play-alone-${version}-${opts.age ?? 9}-${opts.hunger ?? 95}-${opts.tag ?? ''}`), w = s.w;
  w.settings.dynamics = 'rich'; w.settings.rulesVersion = version;
  const p = addPerson(s, 'Mona', 40.5, 27.5, { age: opts.age ?? 9, hunger: opts.hunger ?? 95, thirst: 95, energy: 95, traits: { curiosity: 0.8 } });
  const home = building(s, 'hut', 40, 24, p.hhId);
  w.households.find((h) => h.id === p.hhId)!.homeId = home.id;
  const bush = makeSource(w, 'berry_bush', 46, 30, 6);
  done(s);
  w.tick = 600;
  observe(w, p, home);
  learn(w, p, bush);
  const play = (k: string) => generateOptions(w, p, true, true).options.find((o) => o.key === `play:${k}`);
  return { w, p, home, play };
}
const stepUntilIdle = (w: World, p: Person, limit = 600) => { for (let i = 0; i < limit && p.activity; i++) stepWorld(w); };

describe('solo: a child with nothing pressing', () => {
  it('at 210 has nothing of her own to do; at 211 may build with sticks near home and watch bugs at a bush she knows', () => {
    const old = alone(210);
    expect(old.play('sticks')).toBeUndefined();
    expect(old.play('bugs')).toBeUndefined();
    const now = alone(211);
    expect(now.play('sticks')?.kind).toBe('wander');
    expect(now.play('sticks')?.label).toBe('Build something with sticks near home');
    expect(now.play('bugs')?.label).toBe('Watch the bugs among the leaves');
    setPlay(false, 'solo');
    expect(now.play('sticks')).toBeUndefined();
  });

  it('through to the ground: she builds with sticks for a set while, her mood lifts, building gains a seed, and that is it for today', () => {
    const f = alone(211, { tag: 'ground' });
    const before = f.p.skills.build;
    const a = f.play('sticks')!.make!()!;
    expect(a.data.play).toBe('sticks');
    a.minCommit = f.w.tick + 2000; // staged: she sees it through
    startActivity(f.w, f.p, a);
    for (let i = 0; i < 200 && f.p.activity?.progress === 0; i++) stepWorld(f.w);
    expect(f.p.activity?.duration).toBe(SOLO_TICKS);
    stepUntilIdle(f.w, f.p);
    expect(f.p.skills.build).toBeCloseTo(before + SOLO_SEED, 6);
    expect(f.p.cooldowns['play:sticks']).toBeGreaterThan(f.w.tick);
    expect((f.p.mood?.thoughts ?? []).some((t) => t.kind === 'play:sticks' && t.value > 0)).toBe(true);
    expect(f.play('sticks')).toBeUndefined();
    expect(f.play('bugs'), 'another play is still open to her').toBeTruthy();
    expect(conservationReport(f.w).ok).toBe(true);
  });

  it('watching bugs seeds foraging', () => {
    const f = alone(211, { tag: 'bugs' });
    const before = f.p.skills.forage;
    const a = f.play('bugs')!.make!()!;
    a.minCommit = f.w.tick + 2000;
    startActivity(f.w, f.p, a);
    stepUntilIdle(f.w, f.p);
    expect(f.p.skills.forage).toBeCloseTo(before + SOLO_SEED, 6);
  });

  it('not for a grown person, and not for a hungry child', () => {
    expect(alone(211, { age: 30 }).play('sticks')).toBeUndefined();
    expect(alone(211, { hunger: 35 }).play('sticks')).toBeUndefined();
  });
});
