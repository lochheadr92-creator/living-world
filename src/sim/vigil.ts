// Rules 261 (the social scenes stream, bundle B, part 6 of `docs/SOCIAL_SCENES_PLAN.md`): keeping vigil. Kin sit beside somebody who is visibly
// feverish or hurt, through the night if need be, and bring them water or food they carry; sometimes they are there at the end.
//
// What stood before: nobody nursed anybody. A neighbour might look in once with food or water (welfare.ts), the cautious kept away from a visible fever
// (options_social.ts candidates), and a death was something others learned. A feverish person rested and slept alone or among their household; the
// household's other members went on with their day.
//
// One part, `vigil` (switched in hearth_scenes.ts, with `birth`, birth_help.ts, and `naming`, naming.ts). From rules 261:
//
//   the cue     A person who is not a child, is at ease (hunger and thirst drives 30 or less, energy drive 45 or less, no critical need, no danger believed
//               about, not laid up themselves), sees somebody of their own household, or their partner, parent or child (on their own record of kin),
//               who is VISIBLY ILL OR HURT and resting: the sign `feverish` (fever_sign.ts, severity 0.5 or more, rules 165) or the sign `hurt` (health under
//               60, the one welfare.ts already treats as visible), and at rest, asleep or by a fire. They cannot read how ill the other really is: the
//               plan's "health under 35" is in nobody's sight, so what is acted on is the sign, which shows from 60 (a wider band, and the deviation is
//               recorded). One sitter at a time: not if they see somebody already sitting up beside that person, and a sitter who finds somebody else
//               beside them when they arrive gives it up (the check at the place is physical). Worth 52, 8 more for a partner, parent or child, 4 for a
//               housemate, 6 for a fever, 4 for a hurt, 6 more in the dark, less the walk (options_social.ts optVigil).
//   the vigil   An ordinary `rest` activity marked `data.vigil` beside them, sticky: only danger or a critical need ends it from outside. If they are
//               indoors in the sitter's own home, the sitter sits in the same room (a home admits its own household only: habitation.ts). It lasts up to
//               VIGIL_MAX ticks (half a day), and ends: when the sick person has looked well for WELL_FOR ticks (recovery), or the sitter has to leave
//               for a need of their own (thirst under 35, hunger under 30, warmth under 25, energy under 12) or has fallen ill themselves, or loses sight
//               of the one they sit with, or they die. Every VIGIL_LOOK ticks, if the sick person looks hungry or thirsty, the sitter hands over one
//               portion of food or water they can spare, by the same transfer and gift the welfare visit uses (onGift 'care').
//   the cost    The sitter's own time and sleep. Nothing here changes how a fever spreads (illness.ts: talk, meals, and sleeping beside, all unchanged), and the
//               sick person mends no faster: the benefit is what is handed over and a glad thought, nothing else.
//   the end     A vigil that lasted VIGIL_MIN ticks or more writes ONE line in the feed when it ends: "A sat up through the night with B, who has a fever."
//               (if the dark fell during it; "sat with B" if not; "who is hurt" for a hurt one), and the sick person remembers it (a little more fond
//               of the sitter, more if they mended). A shorter one writes nothing. If the sick person dies while the sitter is beside them (in the
//               same place, in work at the vigil, at the very tick) the line is "A was with B when he died." instead, the sitter's grief is shortened
//               as a visit to a grave shortens it, and the vigil is over. A sitter who was not beside them at that tick has no such line.
//
// Nothing here reads anybody's true state: the sitter acts on the signs they see and on their own record of kin. The sick person's true illness is read
// nowhere. No draw is made. Saved: the vigil's own record in the activity's data (`vigil`: whom for, since when, ticks sat, how it began, whether it
// has seen the dark or the death); nothing on the person. Rich worlds at rules 261 and later only; rules 260 and earlier, authored worlds and a
// part switched off keep the old behaviour.
import { faceToward, newActivity, standSpotFor } from './activities';
import type { WorkResult } from './activities';
import { DAY } from './constants';
import { isDark } from './environment';
import { addEvent, addLog } from './events';
import { HEARTH_FROM, hasVigil } from './hearth_scenes';
import { doorPoint, hasHabitation, sameSpace } from './habitation';
import { homeBuildingOf } from './households';
import { think } from './mood';
import { Scorer, addOption, pen } from './optutil';
import type { Ctx } from './optutil';
import { carryCap } from './people';
import { senseRadius } from './perception';
import { adjustRel } from './relations';
import { laidUp } from './responsibilities';
import { runsRulesVersion } from './rulesversion';
import { onGift, surplusOf, personOf } from './social';
import { transfer } from './economy';
import type { Activity, ItemKind, Items, Person, SeenEntity, World } from './types';
import { hyp } from './util';

// ── the cue (options_social.ts optVigil) ──
/** the drives the sitter may have (the gates welfare.ts uses): hunger and thirst, and energy */
export const VIGIL_HUNGER_DRIVE_MAX = 30;
export const VIGIL_THIRST_DRIVE_MAX = 30;
export const VIGIL_ENERGY_DRIVE_MAX = 45;
/** a sitter who saw their person go in at their own door follows them in if they saw it this lately (ticks), and this near the door (tiles) */
export const FOLLOW_IN_WITHIN = 150;
export const FOLLOW_IN_NEAR = 4;
/** the worth of a vigil, and what adds to it: kin of the closest kind, a housemate, a fever, a hurt, the dark */
export const VIGIL_BASE = 52;
export const VIGIL_CLOSE_KIN = 8;
export const VIGIL_HOUSEMATE = 4;
export const VIGIL_FEVER = 6;
export const VIGIL_HURT = 4;
export const VIGIL_DARK = 6;
/** somebody seen sitting up this near the sick person is a sitter already */
export const SITTER_NEAR = 4;
/** the sitter waits this long before sitting again beside the same person after one vigil, and after one cut short for a need */
export const VIGIL_REST = 300;
export const VIGIL_REST_CUT = 150;

// ── the vigil ──
/** how long at most one vigil lasts: half a day */
export const VIGIL_MAX = Math.round(DAY / 2);
/** near enough to be beside them (the sitter follows if they move), and how long the sitter keeps sitting once the sick person has looked well */
export const VIGIL_NEAR = 3.2;
export const WELL_FOR = 60;
/** how often, in ticks sat, the sitter looks to see if the sick person wants food or water, and gives one portion if so and they can spare it */
export const VIGIL_LOOK = 60;
/** the needs under which the sitter leaves to see to themselves */
export const LEAVE_THIRST = 35;
export const LEAVE_HUNGER = 30;
export const LEAVE_WARMTH = 25;
export const LEAVE_ENERGY = 12;
/** the shortest vigil that is written */
export const VIGIL_MIN = 90;
/** what a vigil does for the sick person: a glad thought while it lasts, and what they remember of it */
export const SAT_GLAD = 5;
export const SAT_GLAD_FOR = DAY / 2;
export const SAT_AFFINITY = 2;
export const SAT_TRUST = 1;
export const SAT_MENDED_AFFINITY = 2;
export const SAT_MENDED_TRUST = 1;
export const SAT_FAMILIARITY = 1;
/** the grief of one who was beside them when they died is cut to this share of what is left, as a visit to a grave cuts it (options_places.ts) */
export const GRIEF_SHARE = 0.7;

export interface VigilData {
  /** who is sat with */
  for: number;
  /** when it began (the choice), and how many ticks the sitter has sat beside them */
  since: number;
  sat: number;
  /** how it began: what the sitter saw */
  kind: 'fever' | 'hurt';
  /** ticks in a row the sick person has looked well */
  well?: number;
  /** the dark fell during it */
  night?: true;
  /** the sick person died with the sitter beside them, and the line is written */
  over?: true;
}

const vigilOf = (a: Activity | null | undefined): VigilData | undefined => (a && a.kind === 'rest' ? (a.data.vigil as VigilData | undefined) : undefined);
export const isVigil = (a: Activity | null | undefined): boolean => vigilOf(a) !== undefined;
const he = (q: Person): string => (q.sex === 'f' ? 'she' : 'he');

// ───────────────────────── the cue ─────────────────────────
/** the sick person, seen, whom this person would sit with: what is shown to them, their own kin and what is already there */
export function sickToSitWith(ctx: Ctx): { s: SeenEntity; q: Person; close: boolean; housemate: boolean } | null {
  const { world, p } = ctx;
  if (!hasVigil(world) || ctx.stage === 'child' || ctx.criticals.length || ctx.dangers.length || laidUp(world, p) || p.activity?.data.vigil !== undefined) return null;
  if (ctx.drives.hunger > VIGIL_HUNGER_DRIVE_MAX || ctx.drives.thirst > VIGIL_THIRST_DRIVE_MAX || ctx.drives.energy > VIGIL_ENERGY_DRIVE_MAX) return null;
  let best: { s: SeenEntity; q: Person; close: boolean; housemate: boolean; d: number } | null = null;
  for (const s of ctx.seenPersons) {
    if (!(s.feverish || s.hurt) || !(s.asleep || s.act === 'rest' || s.act === 'sleep' || s.act === 'warm')) continue;
    const q = world.byId.get(s.id);
    if (!q || q.ent !== 'person' || !q.alive) continue;
    const rel = p.relations[s.id];
    const close = rel?.kin === 'partner' || rel?.kin === 'parent' || rel?.kin === 'child';
    const housemate = ctx.members.some((m) => m.id === s.id);
    if (!close && !housemate) continue;
    if ((p.cooldowns['vigil' + s.id] ?? 0) > world.tick) continue;
    // one sitter at a time: not if somebody is seen sitting up beside them
    if (ctx.seenPersons.some((o) => o.sittingUp && o.id !== p.id && hyp(o.x - s.x, o.y - s.y) <= SITTER_NEAR)) continue;
    const d = hyp(s.x - p.x, s.y - p.y);
    if (!best || d < best.d) best = { s, q, close, housemate, d };
  }
  return best ? { s: best.s, q: best.q, close: best.close, housemate: best.housemate } : null;
}

/** Offered to a person who sees somebody of theirs ill or hurt and at rest (options_social.ts socialOptions). */
export function vigilOption(ctx: Ctx): void {
  const { world, p } = ctx;
  const sick = sickToSitWith(ctx);
  if (!sick) return;
  const { s, q, close, housemate } = sick;
  const fever = !!s.feverish;
  const d = hyp(s.x - p.x, s.y - p.y);
  const e = (d * 1.18) / Math.max(0.03, ctx.speed);
  const sc = new Scorer().add(fever ? `${q.name} has a fever` : `${q.name} is hurt`, VIGIL_BASE);
  if (close) sc.add('family', VIGIL_CLOSE_KIN);
  else sc.add('one of my household', VIGIL_HOUSEMATE);
  sc.add(fever ? 'a fever is a long night' : 'hurt, and cannot help themselves', fever ? VIGIL_FEVER : VIGIL_HURT);
  if (ctx.night) sc.add('the night', VIGIL_DARK);
  sc.add('walking', -pen(e));
  const inside = hasHabitation(world) && p.indoors ? p.indoors : 0;
  // outdoors, a free tile beside them; indoors, the same room (where the sitter already is)
  const spot = inside ? { x: p.x, y: p.y } : standSpotFor(world, p, q);
  if (!spot) return;
  const sx = spot.x, sy = spot.y;
  addOption(ctx, {
    kind: 'rest',
    label: `Sit up with ${q.name}`,
    goal: `to be with ${q.name}, who is ${fever ? 'feverish' : 'hurt'}`,
    need: null,
    util: sc.total,
    parts: sc.parts,
    eta: e + VIGIL_MAX,
    key: `vigil:${q.id}`,
    targetId: inside || q.id,
    tag: 'care',
    make: () => {
      const data: VigilData = { for: q.id, since: world.tick, sat: 0, kind: fever ? 'fever' : 'hurt' };
      return newActivity(world, p, {
        kind: 'rest',
        label: `Sitting up with ${q.name}`,
        goal: `to be with ${q.name}, who is ${fever ? 'feverish' : 'hurt'}`,
        // indoors, the room they are both in; outdoors, the person themselves (the walk goes where they go while they are in sight) unless they are of the
        // sitter's own household, who can be followed through their door (the engine ends a walk to a person who goes indoors; this one is not a walk to them)
        targetId: inside || q.id,
        ...(inside || housemate ? {} : { targetType: 'person' }),
        tx: s.x,
        ty: s.y,
        spotX: sx,
        spotY: sy,
        amount: VIGIL_MAX + 60,
        utility: sc.total,
        minCommit: 120,
        maxTicks: Math.ceil(e) + VIGIL_MAX + 400,
        data: { vigil: data, sticky: true },
      });
    },
  });
}

// ───────────────────────── the vigil itself ─────────────────────────
/**
 * They have gone in at the sitter's own door, which the sitter saw them do (last seen this lately and this near the door): the sitter follows them in, a home
 * admitting its own household. Sets the activity going to the door, as startActivity does for a rest at home; returns false if this does not hold.
 */
function followIn(world: World, p: Person, a: Activity, sick: Person): boolean {
  const home = hasHabitation(world) && !p.indoors ? homeBuildingOf(world, p) : null;
  const seen = p.whereabouts[sick.id];
  if (!home || sick.indoors !== home.id || sick.hhId !== p.hhId || !seen || world.tick - seen.tick > FOLLOW_IN_WITHIN) return false;
  const door = doorPoint(home);
  if (hyp(seen.x - door.x, seen.y - door.y) > FOLLOW_IN_NEAR) return false;
  a.targetId = home.id;
  a.targetType = '';
  a.data.homeEntry = true;
  a.tx = door.x;
  a.ty = door.y;
  a.spotX = door.x;
  a.spotY = door.y;
  a.phase = 'travel';
  a.path = [];
  a.pi = 0;
  a.pathTries = 0;
  return true;
}

/** somebody else is sitting beside this person, in work, in the same place: seen by anybody who is there */
function otherSitter(world: World, sick: Person, except: Person): Person | null {
  for (const q of world.persons) {
    if (q === except || !q.alive || q.activity?.phase !== 'work') continue;
    const v = vigilOf(q.activity);
    if (v && v.for === sick.id && sameSpace(world, q, sick) && hyp(q.x - sick.x, q.y - sick.y) <= SITTER_NEAR) return q;
  }
  return null;
}

/** the rest activity marked `vigil` has reached them (act_misc.ts rest handler): they sit down, or find somebody already there and do not */
export function vigilBegin(world: World, p: Person, a: Activity): string | undefined {
  const v = vigilOf(a)!;
  const sick = personOf(world, v.for);
  if (!sick) return 'they are no longer around';
  if (!sameSpace(world, p, sick)) return followIn(world, p, a, sick) ? undefined : `${sick.name} was not where I expected`;
  if (hyp(sick.x - p.x, sick.y - p.y) > senseRadius(world, p)) return `${sick.name} was not where I expected`;
  const other = otherSitter(world, sick, p);
  if (other) {
    p.cooldowns['vigil' + sick.id] = world.tick + VIGIL_REST;
    return `${other.name} was already sitting with ${sick.name}`;
  }
  a.duration = VIGIL_MAX + 60;
  a.label = `Sitting up with ${sick.name}`; // entering a home relabels a rest as resting inside it
  a.targetType = ''; // the walk chased them; sitting beside them, the sitter is not held to their every move (vigilWork follows, or follows them indoors)
  if (isDark(world)) v.night = true;
  if (v.sat === 0) addLog(world, p, 'social', `Sat down beside ${sick.name}, who ${v.kind === 'fever' ? 'has a fever' : 'is hurt'}.`);
  return undefined;
}

/** what the sitter hands over on a look: one portion of food if they look hungry, one of water if thirsty, from what the sitter can spare */
function tend(world: World, p: Person, sick: Person, sign: SeenEntity): void {
  const give: Items = {};
  if (sign.hungry) for (const k of ['bread', 'meat', 'fish', 'fruit', 'grain', 'berries', 'dried_fish', 'smoked_fish', 'dried_meat', 'smoked_meat', 'rendered_fat'] as ItemKind[]) if ((p.inv[k] ?? 0) > 0 && surplusOf(world, p, k) >= 1) { give[k] = 1; break; }
  if (sign.thirsty && (p.inv.water ?? 0) > 0 && surplusOf(world, p, 'water') >= 1) give.water = 1;
  const got: Items = {};
  let moved = 0;
  for (const k of Object.keys(give) as ItemKind[]) {
    const m = transfer(world, p.inv, sick.inv, carryCap(world, sick), k, give[k] ?? 0, 'person:' + p.id, 'person:' + sick.id, 'sat up with');
    if (m > 0) got[k] = m;
    moved += m;
  }
  if (moved > 0) onGift(world, p, sick, got, 'care', true);
}

/** One tick of the vigil (act_misc.ts rest handler). */
export function vigilWork(world: World, p: Person, a: Activity): WorkResult {
  const v = vigilOf(a)!;
  if (v.over) return 'partial:they died';
  const sick = personOf(world, v.for);
  if (!sick) return 'partial:they are gone';
  if (!hasVigil(world)) return 'partial:it was not to be';
  if (!sameSpace(world, p, sick)) return followIn(world, p, a, sick) ? 'continue' : 'partial:they are not in the same place now';
  const d = hyp(sick.x - p.x, sick.y - p.y);
  if (d > senseRadius(world, p)) return 'partial:lost sight of them';
  faceToward(p, sick.x, sick.y);
  if (d > VIGIL_NEAR) {
    // they have moved: follow
    a.tx = sick.x;
    a.ty = sick.y;
    a.spotX = sick.x;
    a.spotY = sick.y;
    a.phase = 'travel';
    a.path = [];
    a.pi = 0;
    return 'continue';
  }
  v.sat++;
  if (isDark(world)) v.night = true;
  const n = p.needs;
  if (p.illness) return 'partial:I have a fever myself';
  if (n.thirst < LEAVE_THIRST || n.hunger < LEAVE_HUNGER || n.warmth < LEAVE_WARMTH || n.energy < LEAVE_ENERGY) return 'partial:I had to see to myself';
  // what they can see of them now: the sign, never the illness itself
  const sign = p.seen.find((x) => x.id === sick.id);
  if (sign) {
    if (sign.feverish || sign.hurt) v.well = 0;
    else {
      v.well = (v.well ?? 0) + 1;
      if (v.well >= WELL_FOR) return 'done';
    }
    if (v.sat % VIGIL_LOOK === 0) tend(world, p, sick, sign);
  }
  if (v.sat === VIGIL_MIN) think(world, sick, 'sat_with:' + p.id, SAT_GLAD, SAT_GLAD_FOR, `${p.name} sat up with me`);
  a.progress++;
  return v.sat >= VIGIL_MAX ? 'done' : 'continue';
}

/** The vigil has ended, however it ended (act_misc.ts rest handler onEnd). One line in the feed if it was long enough and no death has written its own. */
export function vigilEnd(world: World, p: Person, a: Activity, outcome: string, detail: string): void {
  const v = vigilOf(a);
  if (!v || detail === 'died') return;
  const sick = personOf(world, v.for);
  p.cooldowns['vigil' + v.for] = world.tick + (outcome === 'success' ? VIGIL_REST : VIGIL_REST_CUT);
  if (v.over || !sick) return;
  if (v.sat < VIGIL_MIN) {
    if (v.sat > 0) addLog(world, p, 'social', `Sat with ${sick.name} for a little, then ${detail || 'left'}.`);
    return;
  }
  const mended = (v.well ?? 0) >= WELL_FOR;
  const who = v.kind === 'fever' ? 'who has a fever' : 'who is hurt';
  addEvent(world, 'social', v.night ? `${p.name} sat up through the night with ${sick.name}, ${who}.` : `${p.name} sat with ${sick.name}, ${who}.`, [p.id, sick.id], sick.x, sick.y);
  adjustRel(sick, p.id, world.tick, { aff: SAT_AFFINITY + (mended ? SAT_MENDED_AFFINITY : 0), trust: SAT_TRUST + (mended ? SAT_MENDED_TRUST : 0), fam: SAT_FAMILIARITY, note: mended ? `${p.name} sat with me while I was ill and I mended` : `${p.name} sat with me while I was ${v.kind === 'fever' ? 'ill' : 'hurt'}` });
  adjustRel(p, sick.id, world.tick, { fam: SAT_FAMILIARITY, note: `sat with ${sick.name}` });
  addLog(world, p, 'social', `Sat with ${sick.name} for ${v.sat} ticks${mended ? ' until they looked well' : ''}.`);
  addLog(world, sick, 'social', `${p.name} sat with me for ${v.sat} ticks.`);
}

// ───────────────────────── a death ─────────────────────────
/** who is beside somebody now: sitters in work at a vigil for them, in the same place and near (before their death moves them from the room: lifecycle.ts killPerson) */
export function sittersBeside(world: World, sick: Person): Person[] {
  if (!hasVigil(world)) return [];
  const out: Person[] = [];
  for (const q of world.persons) {
    if (q === sick || !q.alive || q.activity?.phase !== 'work') continue;
    const v = vigilOf(q.activity);
    if (v && !v.over && v.for === sick.id && sameSpace(world, q, sick) && hyp(q.x - sick.x, q.y - sick.y) <= VIGIL_NEAR + 1) out.push(q);
  }
  return out;
}

/** The person has died with these beside them (lifecycle.ts killPerson, once the death is on record): the line, and the sitter's grief shortened. */
export function vigilAtDeath(world: World, dead: Person, beside: Person[]): void {
  for (const q of beside) {
    if (!q.alive) continue;
    const v = vigilOf(q.activity);
    if (!v) continue;
    v.over = true;
    addEvent(world, 'life', `${q.name} was with ${dead.name} when ${he(dead)} died.`, [q.id, dead.id], q.x, q.y);
    addLog(world, q, 'life', `Was with ${dead.name} when ${he(dead)} died.`);
    const loss = q.mood?.thoughts.find((t) => t.kind === 'lost:' + dead.id && t.until > world.tick);
    if (loss) loss.until = world.tick + Math.round((loss.until - world.tick) * GRIEF_SHARE);
  }
}

// ───────────────────────── saved state ─────────────────────────
/** What a save may hold of this (rules 261, rich only); anything else is refused on loading. */
export function validateVigil(w: World): void {
  const allowed = w.settings.dynamics === 'rich' && runsRulesVersion(w, HEARTH_FROM);
  const int = (n: unknown, min: number, max: number): boolean => Number.isSafeInteger(n) && (n as number) >= min && (n as number) <= max;
  for (const p of w.persons) {
    for (const a of [p.activity, p.suspended]) {
      if (!a || a.data.vigil === undefined) continue;
      const v = a.data.vigil as VigilData;
      if (!allowed || a.kind !== 'rest' || !v || !int(v.for, 1, Number.MAX_SAFE_INTEGER) || !int(v.since, 0, w.tick) || !int(v.sat, 0, VIGIL_MAX + 60) || (v.kind !== 'fever' && v.kind !== 'hurt')
        || (v.well !== undefined && !int(v.well, 0, WELL_FOR)) || (v.night !== undefined && v.night !== true) || (v.over !== undefined && v.over !== true)) throw new Error('Invalid vigil');
    }
  }
}
