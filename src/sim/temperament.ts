// Boundaries and alone time (rich worlds only). People differ in how much company they want: one loves a crowded table,
// another is worn down by it and goes off to sit alone for a while. Neither is a mistake: the reserved person who declines a
// crowded meal loses nothing with the host, and the time alone restores them as the meal restores the other.
//
// `p.crowd` counts time lately spent with three or more people close by; it drains when they are not. A reserved person
// (sociability below 0.4) with much of it feels crowded (a thought) and sees an option to take some time alone: a walk to a
// spot away from everyone and a while sitting there, after which the count is cleared and they feel the quiet. A sociable
// person feels a full table more (meals.ts). An authored world never creates `p.crowd`.
import { newActivity, registerHandler } from './activities';
import type { WorkResult } from './activities';
import { DAY } from './constants';
import { addLog } from './events';
import { isRich, think } from './mood';
import { Scorer, addOption, eta, pen } from './optutil';
import type { Ctx, Option } from './optutil';
import { RESERVED, isReserved } from './people';
import { isWalkable } from './registry';
import { hashString, hashUnit } from './rng';
import { runsRulesVersion } from './rulesversion';
import { workOfOption, tradeWord } from './trade';
import type { Person, SkillKey, World } from './types';
import { hyp } from './util';

// Disposition, not aptitude or a second trade. Immutable seed/id already preserve
// these tastes across saves; there is no duplicate saved preference record.
export const WORK_TASTES_FROM_VERSION = 31;
export const WORK_TASTE_TILT = 1.5;
const WORK_TASTES: SkillKey[] = ['wood', 'stone', 'build', 'farm', 'craft', 'carpentry', 'kiln', 'smith'];
let workTastes = true;
export const workTastesOn = (): boolean => workTastes;
export function setWorkTastes(on: boolean): void { workTastes = on; }
export function personalWorkTaste(world: World, p: Person): { like: SkillKey; dislike: SkillKey } | null {
  if (!workTastes || !isRich(world) || !runsRulesVersion(world, WORK_TASTES_FROM_VERSION)) return null;
  const seed = hashString(world.seed) ^ 0x7a57e;
  const like = Math.floor(hashUnit(seed, p.id, 1) * WORK_TASTES.length);
  const offset = 1 + Math.floor(hashUnit(seed, p.id, 2) * (WORK_TASTES.length - 1));
  return { like: WORK_TASTES[like], dislike: WORK_TASTES[(like + offset) % WORK_TASTES.length] };
}

/** Taste settles close work choices without lifting work above needs or leisure. */
export function tiltWorkChoices(world: World, p: Person, scored: { o: Option; s: number }[]): void {
  const taste = personalWorkTaste(world, p);
  if (!taste) return;
  const work = scored.filter(x => x.o.need === null && WORK_TASTES.includes(workOfOption(p, x.o)!));
  if (work.length < 2) return;
  const before = work.reduce((a,b) => b.s > a.s ? b : a);
  const maximum = before.s;
  const nudges = work.map(x => {
    const kind = workOfOption(p, x.o);
    return kind === taste.like ? WORK_TASTE_TILT : kind === taste.dislike ? -WORK_TASTE_TILT : 0;
  });
  const tiltedMax = Math.max(...work.map((x,i) => x.s + nudges[i]));
  work.forEach((x,i) => { x.s = maximum + (x.s + nudges[i] - tiltedMax); });
  const after = work.reduce((a,b) => b.s > a.s ? b : a);
  if (before !== after) {
    const reason = workOfOption(p, after.o) === taste.like
      ? `I enjoy ${tradeWord(taste.like)}` : `I would rather avoid ${tradeWord(taste.dislike)}`;
    after.o = { ...after.o, workTasteReason: `${reason}; another close work choice was available` };
  }
}

/** how often the count is looked at, and the most it holds */
const CROWD_EVERY = 30;
const CROWD_MAX = 2400;
/** from here a reserved person feels crowded */
export const CROWDED_AT = 600;
/** how far from everyone counts as alone, and how long the sitting lasts */
const ALONE_DIST = 6;
const ALONE_TICKS = 220;


/** Every CROWD_EVERY ticks: count the company, feel it (rich only). */
export function crowdTick(world: World, p: Person): void {
  if (!isRich(world) || (world.tick + p.id) % CROWD_EVERY !== 0 || !p.alive) return;
  let near = 0;
  for (const s of p.seen) if (s.ent === 'person' && hyp(s.x - p.x, s.y - p.y) < 4) near++;
  const c = p.crowd ?? 0;
  // a crowd is four or more close by while awake (three is a household at its own fire; a town's lanes are busier than a village's)
  if (near >= 4 && p.pose !== 'sleep') p.crowd = Math.min(CROWD_MAX, c + CROWD_EVERY);
  else if (c > 0) p.crowd = Math.max(0, c - CROWD_EVERY * (p.activity?.kind === 'alone' ? 4 : 0.5));
  if (p.crowd === 0) delete p.crowd;
  if (isReserved(p) && (p.crowd ?? 0) >= CROWDED_AT) think(world, p, 'crowded', -(4 + 8 * ((RESERVED - p.traits.sociability) / RESERVED)), DAY / 2, 'has had too much company');
}

/** a tile at least ALONE_DIST from everyone, within reach, or null */
function quietSpot(world: World, p: Person): { x: number; y: number } | null {
  // nearer first, then farther out: in a town of a hundred the quiet is at the edge of the woods, not in the lanes
  for (let i = 0; i < 18; i++) {
    const ang = hashUnit(p.id, world.tick, i) * Math.PI * 2;
    const r = ALONE_DIST + 1 + hashUnit(p.id, world.tick, i + 20) * 10 + i;
    const x = Math.floor(p.x + Math.cos(ang) * r);
    const y = Math.floor(p.y + Math.sin(ang) * r);
    if (!isWalkable(world, x, y)) continue;
    let ok = true;
    for (const q of world.persons) {
      if (q === p || !q.alive) continue;
      if (hyp(q.x - x - 0.5, q.y - y - 0.5) < ALONE_DIST) {
        ok = false;
        break;
      }
    }
    if (ok) return { x, y };
  }
  return null;
}

export function aloneOptions(ctx: Ctx): void {
  const { world, p } = ctx;
  if (!isRich(world) || !isReserved(p) || (p.crowd ?? 0) < CROWDED_AT) return;
  if (ctx.criticals.length || ctx.dangers.length || ctx.night) return;
  const spot = quietSpot(world, p);
  if (!spot) return;
  const e = eta(ctx, spot.x + 0.5, spot.y + 0.5);
  const sc = new Scorer()
    .add('has had too much company', 10 + 18 * ((RESERVED - p.traits.sociability) / RESERVED) * Math.min(1, (p.crowd ?? 0) / 1500))
    .add('walking', -pen(e) * 0.5);
  if (sc.total < 8) return;
  addOption(ctx, {
    kind: 'alone',
    label: 'Take some time alone',
    goal: 'to have some quiet',
    need: null,
    util: sc.total,
    parts: sc.parts,
    eta: e + ALONE_TICKS,
    key: 'alone',
    targetId: 0,
    tag: 'rest',
    make: () =>
      newActivity(world, p, {
        kind: 'alone',
        label: 'Sitting alone for a while',
        goal: 'to have some quiet',
        need: null,
        tx: spot.x + 0.5,
        ty: spot.y + 0.5,
        spotX: spot.x + 0.5,
        spotY: spot.y + 0.5,
        utility: sc.total,
        minCommit: 80,
        maxTicks: 700,
      }),
  });
}

registerHandler('alone', {
  availability: 0.9,
  pose: () => 'sit',
  begin(world, p, a) {
    a.duration = ALONE_TICKS;
  },
  work(world, p, a): WorkResult {
    a.progress++;
    // company found them: it is not time alone any more
    let near = 0;
    for (const s of p.seen) if (s.ent === 'person' && hyp(s.x - p.x, s.y - p.y) < 4.5) near++;
    if (near >= 2 && a.progress > 20) return 'partial:company came';
    return a.progress >= a.duration ? 'done' : 'continue';
  },
  onEnd(world, p, a, outcome) {
    if (outcome !== 'success') return;
    delete p.crowd;
    think(world, p, 'quiet', 6, DAY / 2, 'had some time alone');
    addLog(world, p, 'need', 'Sat alone for a while, away from everyone.');
  },
});
