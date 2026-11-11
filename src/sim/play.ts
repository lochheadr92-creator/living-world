// Rules 211: more ways to play. Phase 2 of the childhood plan (docs/CHILDHOOD_AND_PLAY_PLAN.md), two separately switched parts after the
// rules-162 pattern, on the owner's instruction of 11 November 2026 ("Do 1 then 2").
//
// What stood before (childhood.ts, rules 120): one game, a guessing game between two children, once a day for each of them. Measured
// in ordinary worlds (the child's-day probe, twelve seeds, 25 days): about 64 games asked a settlement, 36 percent refused because the
// child who was asked "had already had that time today"; a child finishes a game on 0.18 of their days and spends 0.7 of an hour a day
// at it, against four to five hours gathering food. Alone, a child has the grown person's spare-time walk and nothing else.
//
// games  Three more games between two children, beside the guessing game: chase, hide and seek, and playing house. Each is the same
//        paid, agreed time together as the guessing game (the same conversation, the same mood and company), with its own words and
//        its own once-a-day limit for each child, so a child who has had one game may still be asked for another. The child who asks
//        proposes the first game, in an order that turns with the day, that they have not themselves played today; the one asked
//        declines only if they have played THAT game today. After any game a child waits GAME_PAUSE before asking for the next.
// solo   Three things a child does alone at a place they know, each once a day: skipping stones at the water's edge, watching bugs
//        among bushes or trees, building with sticks near home. Each is the ordinary spare-time activity ('wander') with a name, a
//        fixed length, a small lift of mood when it is finished, and a small seed of a skill it resembles (fishing, foraging,
//        building: SOLO_SEED each time). Offered only when nothing presses, by day, with no danger about, as childhood time is. A
//        finished play counts as having been at that place lately, as a spare-time walk there does (leisure.ts): children now go
//        to the water and the bushes to play, where before they went on the grown person's walk.
//
// Not in this version: a game joined by a third or fourth child (a game here is between two), toys, and anything for grown people.
// No work is taken from children by this version; that is phase 3 and has its own measurement.
//
// Rules 210 and earlier, authored worlds and a part switched off keep the old behaviour.
import { newActivity } from './activities';
import { DAY, SKILL_MAX } from './constants';
import { noteHaunt } from './leisure';
import { think } from './mood';
import { Scorer, addOption, beliefsByKind, dangerAt, eta, pen } from './optutil';
import type { Ctx } from './optutil';
import { hashUnit } from './rng';
import { runsRulesVersion } from './rulesversion';
import { T } from './types';
import type { BeliefKind, Person, SkillKey, World } from './types';
import { hyp } from './util';

const on = { games: true, solo: true };
export type PlayPart = keyof typeof on;
export const PLAY_PARTS = Object.keys(on) as PlayPart[];
/** Lab switches (never saved or hashed): one part, or with no part both. */
export const playPartOn = (part: PlayPart): boolean => on[part];
export function setPlay(enabled: boolean, part?: PlayPart): void {
  if (part) on[part] = enabled;
  else for (const k of PLAY_PARTS) on[k] = enabled;
}
const rich211 = (w: World): boolean => w.settings.dynamics === 'rich' && runsRulesVersion(w, 211);
export const hasGames = (w: World): boolean => on.games && rich211(w);
export const hasSoloPlay = (w: World): boolean => on.solo && rich211(w);

// ───────────────────────── games between two children ─────────────────────────
export const GAMES = ['guess', 'chase', 'hide', 'house'] as const;
export type Game = typeof GAMES[number];
export const isGame = (g: unknown): g is Game => typeof g === 'string' && (GAMES as readonly string[]).includes(g);
/** How long a child waits after a game before asking for the next. */
export const GAME_PAUSE = DAY / 8;
export const gameName = (g: Game): string => (g === 'chase' ? 'A game of chase' : g === 'hide' ? 'Hide and seek' : g === 'house' ? 'Playing house' : 'A guessing game');
export const gameQuestion = (g: Game): string =>
  g === 'chase' ? 'Will you play chase with me? You run first.' : g === 'hide' ? 'Will you play hide and seek with me? I will count.' : g === 'house' ? 'Will you play house with me? We can take it in turns to cook.' : 'Will you play a guessing game with me? We can take turns.';
export const gameAccept = (g: Game): string =>
  g === 'chase' ? 'Yes. Count to five, then come after me.' : g === 'hide' ? 'Yes. Close your eyes and count, and I will hide.' : g === 'house' ? 'Yes. This is our door, and that is where the fire goes.' : 'Yes. You choose something you can see, and I will guess. Then we swap.';
/** The line said at each turn of a game; `asker` is whose turn it is. */
export const gameTurn = (g: Game, asker: boolean): string =>
  g === 'chase' ? (asker ? 'Caught you. Now you chase me.' : 'You cannot catch me.') : g === 'hide' ? (asker ? 'Found you. My turn to hide.' : 'Ready or not, here I come.') : g === 'house' ? (asker ? 'You fetch the water, and I will cook.' : 'Supper is ready. Sit down.') : asker ? 'Your turn to choose. I will guess.' : 'My turn to guess. Is it something near us?';
const gameKey = (g: Game): string => 'game:' + g;
export const playedToday = (w: World, p: Person, g: Game): boolean => (p.cooldowns[gameKey(g)] ?? 0) > w.tick;
/** The game this child would ask for now: the first, in an order that turns with the day and the child, they have not played today. */
export function nextGame(w: World, p: Person): Game | null {
  const start = (p.id + Math.floor(w.tick / DAY)) % GAMES.length;
  for (let i = 0; i < GAMES.length; i++) {
    const g = GAMES[(start + i) % GAMES.length];
    if (!playedToday(w, p, g)) return g;
  }
  return null;
}
/** A game is over: each player has had that game for today and waits a little before asking for another. */
export function notePlayed(w: World, p: Person, g: Game): void {
  p.cooldowns[gameKey(g)] = w.tick + DAY;
  p.cooldowns['child:play_together'] = w.tick + GAME_PAUSE;
}

// ───────────────────────── play alone at a place ─────────────────────────
export const SOLO = ['stones', 'bugs', 'sticks'] as const;
export type SoloPlay = typeof SOLO[number];
export const isSoloPlay = (k: unknown): k is SoloPlay => typeof k === 'string' && (SOLO as readonly string[]).includes(k);
/** How long a child stays at it, what it is worth before the walk, how far from home they go for it, and what it adds to a skill. */
export const SOLO_TICKS = 100;
export const SOLO_BASE = 12;
export const SOLO_REACH = 14;
export const SOLO_SEED = 0.003;
export const SOLO_LIFT = 3;
/** `haunt` is the spare-time place (leisure.ts) a finished play counts as having been at. */
const SOLO_DEF: Record<SoloPlay, { label: string; doing: string; places: BeliefKind[] | null; skill: SkillKey; word: string; haunt: string }> = {
  stones: { label: "Skip stones at the water's edge", doing: 'Skipping stones', places: ['water'], skill: 'fish', word: 'skipping stones', haunt: 'water' },
  bugs: { label: 'Watch the bugs among the leaves', doing: 'Watching bugs', places: ['berry_bush', 'fruit_tree', 'tree'], skill: 'forage', word: 'watching bugs', haunt: 'trees' },
  sticks: { label: 'Build something with sticks near home', doing: 'Building with sticks', places: null, skill: 'build', word: 'building with sticks', haunt: 'home' },
};
export const soloDoing = (k: SoloPlay): string => SOLO_DEF[k].doing;
export const soloSkill = (k: SoloPlay): SkillKey => SOLO_DEF[k].skill;

/** A walkable spot a step or two from a place, chosen without a random draw. */
function spotBy(ctx: Ctx, x: number, y: number): { x: number; y: number } | null {
  const { world: w, p } = ctx;
  for (let i = 0; i < 8; i++) {
    const ang = hashUnit(p.id, w.tick, i) * Math.PI * 2, r = 1.5 + hashUnit(p.id, w.tick, i + 11) * 1.5;
    const sx = x + Math.cos(ang) * r, sy = y + Math.sin(ang) * r, tx = Math.floor(sx), ty = Math.floor(sy);
    if (tx > 1 && ty > 1 && tx < w.W - 1 && ty < w.H - 1 && !w.solid[ty * w.W + tx] && w.terrain[ty * w.W + tx] !== T.DEEP && w.terrain[ty * w.W + tx] !== T.SHALLOW) return { x: sx, y: sy };
  }
  return null;
}

/** What a child with nothing pressing may do alone. Derivation is pure; the activity is only built if the option is chosen. */
export function soloPlayOptions(ctx: Ctx): void {
  const { world: w, p } = ctx;
  if (!hasSoloPlay(w) || ctx.stage !== 'child' || ctx.critical || ctx.night || ctx.dangers.length) return;
  if (Math.min(p.needs.hunger, p.needs.thirst, p.needs.energy) <= 42) return;
  const homeX = ctx.home ? ctx.home.doorX + 0.5 : p.x, homeY = ctx.home ? ctx.home.doorY + 0.5 : p.y;
  for (const k of SOLO) {
    if ((p.cooldowns['play:' + k] ?? 0) > w.tick) continue;
    const def = SOLO_DEF[k];
    let place: { x: number; y: number } | null = def.places ? null : { x: homeX, y: homeY };
    if (def.places) {
      let bd = 1e9;
      for (const b of beliefsByKind(p, def.places)) {
        const d = hyp(b.x - homeX, b.y - homeY);
        if (d > SOLO_REACH || d >= bd || dangerAt(ctx, b.x, b.y, 12) > 0) continue;
        bd = d;
        place = { x: b.x + 0.5, y: b.y + 0.5 };
      }
    }
    if (!place) continue;
    const spot = spotBy(ctx, place.x, place.y);
    if (!spot) continue;
    const walk = eta(ctx, spot.x, spot.y);
    const sc = new Scorer().add('something to do', SOLO_BASE + 4 * p.traits.curiosity).add('walking', -pen(walk) * 0.5);
    if (sc.total < 6) continue;
    addOption(ctx, {
      kind: 'wander', label: def.label, goal: 'to play for a while', need: null, util: sc.total, parts: sc.parts, eta: walk + SOLO_TICKS, key: `play:${k}`, targetId: 0, tag: 'play',
      make: () => {
        const a = newActivity(w, p, { kind: 'wander', label: def.doing, goal: 'to play for a while', spotX: spot.x, spotY: spot.y, tx: spot.x, ty: spot.y, utility: sc.total, minCommit: 40, maxTicks: 400 });
        if (a) a.data.play = k;
        return a;
      },
    });
  }
}

/** A child finished playing alone: that play is had for today, their mood lifts a little, and the skill it resembles gains a seed. */
export function finishSoloPlay(w: World, p: Person, k: SoloPlay): void {
  const def = SOLO_DEF[k];
  p.cooldowns['play:' + k] = w.tick + DAY;
  p.skills[def.skill] = Math.min(SKILL_MAX, p.skills[def.skill] + SOLO_SEED);
  think(w, p, 'play:' + k, SOLO_LIFT, DAY / 2, `an hour ${def.word}`);
  // the place counts as somewhere they have been lately, as it does after a spare-time walk there (leisure.ts)
  noteHaunt(w, p, def.haunt);
}
