// Spare time (rules version 28, rich only): where a person goes when nothing is pressing.
//
// Before version 28, a person with nothing to do had exactly one fallback: potter about near their own door, at a fixed score
// of 6. Free time was therefore the same few steps from home, every time. From version 28 the same fallback is several
// places a person KNOWS about: their own door, the square, the water's edge, a stand of trees. Each is an ordinary 'wander'
// option, ranked with everything else; nothing is forced and survival, work and plans still outrank all of them.
//
// What tilts the choice, all small and all shown in the inspector as parts of the score:
//  * a change of scene: somewhere they have not been lately scores a little higher, somewhere they were just now a little lower
//    (at most 2 either way, over three quarters of a day)
//  * a favourite spot: a fixed, personal taste for each kind of place, hashed from the world seed and the person (at most 1.5
//    either way). Two people of the same nature still differ here; it is never read by anybody else.
//  * the evening gathering: toward bedtime, a sociable person is drawn a little to the square (at most 2.5). Reserved people
//    are not, and they keep the quiet they already had.
//  * the walk: a place further off costs a little, as any trip does.
//
// It touches only the places someone has actually seen or been told about (their own beliefs), keeps away from anywhere they
// believe to be dangerous, stays near home after dark, and never creates an activity kind: it is the existing 'wander'.
// The only new state is `p.leisure`: the last few places this person spent spare time at, saved with them and in the fingerprint.
// An authored world, and any world below version 28, never creates it, so its saves and hashes are exactly what they were.
import { DAY } from './constants';
import { dayFraction } from './environment';
import { isRich } from './mood';
import { isReserved } from './people';
import { Scorer, beliefsByKind, dangerAt, eta, pen } from './optutil';
import type { Ctx } from './optutil';
import { hashString, hashUnit } from './rng';
import { runsRulesVersion } from './rulesversion';
import { nearestHub } from './settlements';
import type { BeliefKind, Person, World } from './types';
import { hyp } from './util';

export const LEISURE_FROM_VERSION = 28;

/** An experiment switch, kept beside the world like the others: not saved, not hashed, on unless the lab turns it off. */
let leisure = true;
export function setLeisure(on: boolean): void {
  leisure = on;
}
export const leisureOnSwitch = (): boolean => leisure;

/** Does this world spend spare time the version 28 way? Rich, at least version 28, and not switched off by the lab. */
export const leisureOn = (world: World): boolean => leisure && isRich(world) && runsRulesVersion(world, LEISURE_FROM_VERSION);

/** the last places this person spent spare time at, newest last */
export interface Leisure {
  recent: { key: string; tick: number }[];
}

const REMEMBERED = 6;
/** ticks over which a place stops feeling like somewhere they just were */
const STALE_OVER = Math.round(DAY * 0.75);
/** the furthest from home a person goes on a stroll: spare time is not an expedition */
const MAX_STROLL = 14;
/** within this of something they believe dangerous, a place is not somewhere to idle */
const DANGER_KEEP_AWAY = 12;
const MAX_HAUNTS = 4;
/** what the single idle fallback was worth before version 28, and what it is still worth */
const FALLBACK = 6;

export interface Haunt {
  key: string;
  /** the option: what they could do */
  label: string;
  /** the activity: what they are doing once there */
  doing: string;
  x: number;
  y: number;
  /** what the place is, for the taste hash and the evening pull */
  kind: 'home' | 'square' | BeliefKind;
}

/** Where a person might spend spare time right now, nearest to their own door first. Always at least one: their own door. */
export function hauntsFor(ctx: Ctx): Haunt[] {
  const { world, p } = ctx;
  const hub = nearestHub(world, p.x, p.y);
  const homeX = ctx.home ? ctx.home.doorX + 0.5 : hub.x;
  const homeY = ctx.home ? ctx.home.doorY + 0.5 : hub.y + 2;
  const out: Haunt[] = [{ key: 'home', label: ctx.home ? 'Potter about near home' : 'Potter about the camp', doing: 'Pottering about', x: homeX, y: homeY, kind: 'home' }];
  // after dark, or with danger about, spare time stays at the door
  if (ctx.night || ctx.dangers.length) return out;
  const sx = hub.x;
  const sy = hub.y + 2;
  if (hyp(sx - homeX, sy - homeY) > 6 && hyp(sx - homeX, sy - homeY) < MAX_STROLL) out.push({ key: 'square', label: 'Wander down to the square', doing: 'Strolling about the square', x: sx, y: sy, kind: 'square' });
  const near = (kinds: BeliefKind[]) => {
    let best: { x: number; y: number } | null = null;
    let bd = 1e9;
    for (const b of beliefsByKind(p, kinds)) {
      const d = hyp(b.x - homeX, b.y - homeY);
      if (d < 4 || d > MAX_STROLL || d >= bd) continue;
      if (dangerAt(ctx, b.x, b.y, DANGER_KEEP_AWAY) > 0) continue;
      bd = d;
      best = { x: b.x, y: b.y };
    }
    return best;
  };
  const water = near(['water']);
  if (water) out.push({ key: 'water', label: "Stroll to the water's edge", doing: "Pottering about at the water's edge", x: water.x, y: water.y, kind: 'water' });
  const trees = near(['tree', 'fruit_tree']);
  if (trees) out.push({ key: 'trees', label: 'Wander out to the trees', doing: 'Sitting out among the trees', x: trees.x, y: trees.y, kind: 'tree' });
  return out.slice(0, MAX_HAUNTS);
}

function lastAt(p: Person, key: string): number | null {
  const r = p.leisure?.recent;
  if (!r) return null;
  for (let i = r.length - 1; i >= 0; i--) if (r[i].key === key) return r[i].tick;
  return null;
}

/** What tilts one place up or down for this person right now, before it is set against the others. */
function tilt(ctx: Ctx, h: Haunt): Scorer {
  const { world, p } = ctx;
  const sc = new Scorer();
  const was = lastAt(p, h.key);
  const fresh = was === null ? 1 : Math.min(1, (world.tick - was) / STALE_OVER);
  sc.add(fresh >= 0.5 ? 'a change of scene' : 'been here lately', 4 * fresh - 2);
  const taste = hashUnit(hashString(world.seed) ^ 0x1e15, p.id, hashString(h.kind)) * 2 - 1;
  sc.add(taste >= 0 ? 'a favourite spot' : 'not much for it', 1.5 * taste);
  if (h.key === 'square' && !isReserved(p)) {
    const frac = dayFraction(world.tick);
    const bedtime = 0.8 + p.chrono;
    if (frac > 0.62 && frac < bedtime - 0.03) sc.add('the evening gathering', 2.5 * Math.min(1, p.traits.sociability));
  }
  if (h.key !== 'home') sc.add('the walk', -pen(eta(ctx, h.x, h.y)) * 0.3);
  return sc;
}

/**
 * Where, among the places on offer, this person goes now: the one their tilts favour most (a hashed breath of difference breaks
 * a tie). Spare time stays ONE option worth exactly what the single fallback always was (6), so it competes with everything else in
 * a person's day exactly as before and nothing is crowded out; what changes is only WHICH place it is. The tilts are shown in the
 * inspector as parts of the score, with one correction that makes the total 6.
 */
export function pickHaunt(ctx: Ctx, haunts: Haunt[]): { h: Haunt; sc: Scorer } {
  const { world, p } = ctx;
  let best: { h: Haunt; t: Scorer; v: number } | null = null;
  for (const h of haunts) {
    const t = tilt(ctx, h);
    const v = t.total + hashUnit(p.id, world.tick >> 6, hashString(h.key)) * 0.01;
    if (!best || v > best.v) best = { h, t, v };
  }
  const { h, t } = best!;
  const sc = new Scorer().add('nothing pressing', FALLBACK);
  for (const [name, v] of t.parts) sc.add(name, v);
  // the parts list drops tiny values for display; keep the total exact
  sc.total += t.total - t.parts.reduce((a, [, v]) => a + v, 0);
  sc.add('spare time stays a fallback', -t.total);
  return { h, sc };
}

/** They spent spare time here: remember it, a few places deep. */
export function noteHaunt(world: World, p: Person, key: string): void {
  const l = (p.leisure ??= { recent: [] });
  l.recent = l.recent.filter((r) => r.key !== key);
  l.recent.push({ key, tick: world.tick });
  if (l.recent.length > REMEMBERED) l.recent.shift();
}

/** one short string for the world fingerprint: the places and when */
export const leisureFingerprint = (p: Person): string => (p.leisure ? p.leisure.recent.map((r) => `${r.key}@${r.tick}`).join(';') : '');
