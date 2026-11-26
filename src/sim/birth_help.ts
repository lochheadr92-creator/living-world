// Rules 261 (the social scenes stream, bundle B, part 4 of `docs/SOCIAL_SCENES_PLAN.md`): helping at a birth. A woman near her time
// lies in beside her home; a housemate who sees it asks a neighbour to be with her; the child is born with somebody there, or without.
//
// What stood before: the birth happened wherever she was, at the first life check after `pregnantUntil`, with nobody involved
// (lifecycle.ts giveBirth). Whatever the neighbours did, they did not know.
//
// One part, `birth` (switched in hearth_scenes.ts, with `naming`, naming.ts, and `vigil`, vigil.ts). From rules 261:
//
//   lying in    In the last third of a day before `pregnantUntil`, a woman who has a home, is up and about in the daylight (not asleep, not
//               indoors), has no critical need and believes in no danger, is not hungry or thirsty, and is out of a storm, goes to the
//               door of her home and sits there, lying in: an ordinary `rest` activity marked `data.lyingIn` (the tick it began), sticky, so
//               that only danger or a critical need breaks it off. It sits OUTSIDE by her door and not inside it, because a home admits
//               its own household only (habitation.ts: no guests), and a neighbour who is to be with her must be able to stand beside her.
//               She keeps the tick on `Person.lyingIn` until the birth. A woman with no home bears the child where she is, as before.
//   the ask     Two people may ask, in the same words and by the same rules: the woman herself, from a day before her time until she lies in
//               (she has a home and sees a grown person of another household who is free to talk and not at their work), and a housemate (not a
//               child) who sees her lying in (`SeenEntity.lyingIn`). Each has nothing pressing and asks one neighbour in sight, a grown person of
//               another household, to be with her when the child comes: an ordinary request of a new kind, `attend_birth`, made in an ordinary
//               conversation, weighed as the `watch` request is (social.ts evaluateRequest: the helper's own needs, promises, children and
//               liking), and a yes is an ordinary promise (a `work` Commitment, milestone 'attended'). The asker prefers women who have borne or
//               attended a child, then kin, then friends. One promised helper at a time for a woman (once one has promised, neither she nor a
//               housemate asks anybody else), and at most three asks in a day, hers and the housemates' together. A refusal costs the asker
//               what any refusal costs, and the next neighbour is asked. The woman TELLS the helper when to come: the tick her lying-in window
//               opens, carried on the request (`Request.deadline`), and where her door is (a told place, tellBelief). A housemate's ask carries
//               no time: the helper goes at once, to where the housemate last saw her.
//   the help    A helper who was told a time goes to the woman's door when it comes (the tile at the door of the home she was told of or holds a belief of, else where
//               she last saw the woman), whether or not she can see her lying in; one who was not goes to where she was told the woman is. Either
//               walks there and stays beside her: a `visit` marked `data.birth`. At an empty door (the woman is not there: she did not lie in)
//               the helper waits, and after a third of a day (and the minute the life check can take to deliver her) the promise lapses with a line in her log and none in the feed. It ends when the
//               child has come and they have stayed a little after, or after they have waited a day's third without a child, or when the woman
//               cannot be found or something pressing calls the helper away.
//   the birth   Unchanged: the same tick, the same code, the same draws (nothing here draws from the shared stream). If she had lain in
//               the feed says it only when she was helped: "X was born to M and F, with H there to help." (a helper counts if they are beside her, in
//               the same place, at that moment); in every other case the line is the old one, word for word (asked or not, lain in or not). Helped: mother and helper grow fonder (affinity +8/+4, trust +4/+2, familiarity +3), the
//               helper's count of births attended rises (`Person.attended`), a glad thought for each. Unhelped: a small lasting thought.
//   afterwards  A promise that no helper reached in time is released, not broken (the child was born before they could come).
//
// No health risk is added or removed either way; nothing here changes a chance of conception, birth or pairing. Nobody reads anybody's
// true state: the asker acts on what they SEE (a woman lying in), the helper on what they were told and what they find, and being
// beside her is physical. Draws, where there are any, would come from a hash; there are none. Saved: Person.lyingIn, Person.attended,
// Person.birthAsked, the activity data (`lyingIn`, `birth`, `birthDone`, `waitFrom`, `told`, `emptyDoor`), requests of kind `attend_birth` (with the time the woman
// told, in `Request.deadline`) and the commitment they make.
// Rich worlds at rules 261 and later only; rules 260 and earlier, authored worlds and a part switched off keep the old behaviour.
import { endActivity, faceToward, newActivity, standSpotFor } from './activities';
import type { WorkResult } from './activities';
import { DAY, isHomeType } from './constants';
import { addLog } from './events';
import { tellBelief } from './news';
import { HEARTH_FROM, hasBirthHelp } from './hearth_scenes';
import { doorPoint, sameSpace } from './habitation';
import { householdById, membersOf } from './households';
import { think } from './mood';
import { Scorer, addBlocked, addOption, beliefsByKind, eta, pen, spotNear, whereIs } from './optutil';
import type { Ctx } from './optutil';
import { stageOf } from './people';
import { senseRadius } from './perception';
import { isWalkable } from './registry';
import { adjustRel } from './relations';
import { runsRulesVersion } from './rulesversion';
import { MAX_ACTIVE_COMMITMENTS, activeCommitments, personOf, personalDriveMax, settle, willingness } from './social';
import { laidUp } from './responsibilities';
import type { Activity, Belief, Commitment, Person, Request, SeenEntity, World } from './types';
import { hyp } from './util';

// ── lying in ──
/** the last third of a day before her time */
export const LYING_WINDOW = Math.round(DAY / 3);
/** the worth of lying in: more than the ordinary work of a day (20 to 45), less than a pressing need */
export const LYING_SCORE = 60;
/** the hunger and thirst drives she may have and still lie in (over them she sees to herself first), and the warmth drive: she sits out of doors */
export const LYING_DRIVE_MAX = 40;
export const LYING_WARMTH_DRIVE_MAX = 20;
/** the weather she will not lie out in */
export const LYING_STORM = 0.3;
export const LYING_RAIN = 0.6;
/** she keeps it up this long past her time, so that a birth a little late still finds her there */
export const LYING_SLACK = 120;

// ── the ask ──
/** how far the housemate may be from her and still see (and so ask about) it */
export const ASK_SEE = 14;
/** the woman may ask for herself from this long before her time, until she lies in */
export const ASK_EARLY = DAY;
/** the hunger and thirst drives the asker may have */
export const ASK_DRIVE_MAX = 40;
/** the ask's score: a base, and for each thing that makes a neighbour the better one to ask */
export const ASK_BASE = 50;
export const ASK_BORNE = 8;
export const ASK_ATTENDED = 4;
export const ASK_WOMAN = 3;
export const ASK_KIN = 6;
export const ASK_FRIEND = 4;
export const ASK_FRIEND_AFFINITY = 25;
/** at most this many asks for one woman in a day, and a neighbour who was asked and refused is not asked again for this long */
export const ASKS_MAX = 3;
export const ASK_AGAIN = 400;
/** the helper's liking is weighed as a watch's is; having borne or attended a child, being a woman and knowing her each add to it */
export const WILL_BORNE = 0.12;
export const WILL_WOMAN = 0.05;
export const WILL_KNOWS = 0.1;
export const WILL_NEEDED = 0.5;
/** the help: how near counts as beside her, how long the helper waits for a child that does not come, how long they stay after it does */
export const HELP_NEAR = 4;
export const HELP_WAIT_MAX = Math.round(DAY / 3);
export const HELP_AFTER = 60;
/**
 * the child is delivered by the life check, which runs once in 60 ticks (lifecycle.ts LIFE_CHECK_EVERY; kept in step by a test, and not imported here: lifecycle imports this file),
 * so it can come up to that long after the day it is due. A helper who was told a time comes at the start of the window, and waits out the window and this lag.
 */
export const BIRTH_LAG = 60;
/** what the help is worth against the helper's other work, and how long a helper who could not find her waits before looking again */
export const HELP_SCORE = 56;
export const HELP_RETRY = 120;
/** what a birth does: the mother's and the helper's gain in fondness for each other, the glad thought, the mother's thought if alone */
export const BORN_MOTHER_AFFINITY = 8;
export const BORN_MOTHER_TRUST = 4;
export const BORN_HELPER_AFFINITY = 4;
export const BORN_HELPER_TRUST = 2;
export const BORN_FAMILIARITY = 3;
export const BORN_GLAD = 6;
export const BORN_ALONE = -6;
export const BORN_ALONE_FOR = 3 * DAY;
export const ATTENDED_MAX = 99;

const isHelperActivity = (a: Activity | null | undefined, motherId: number): boolean => !!a && a.kind === 'visit' && a.data.birth === true && a.targetId === motherId;

// ───────────────────────── lying in ─────────────────────────
/** Offered to a woman in the last third of a day before her time (options_social.ts socialOptions). */
export function lieInOption(ctx: Ctx): void {
  const { world, p } = ctx;
  if (!hasBirthHelp(world) || p.sex !== 'f' || p.pregnantUntil <= world.tick || p.pregnantUntil - world.tick > LYING_WINDOW) return;
  if (ctx.stage === 'child' || !ctx.home || p.indoors || p.activity?.data.lyingIn !== undefined) return;
  // bearing a child comes after seeing to herself: not with a critical need, in danger, hungry or thirsty, after dark or in a storm
  if (ctx.criticals.length || ctx.dangers.length || ctx.night) return;
  if (ctx.drives.hunger > LYING_DRIVE_MAX || ctx.drives.thirst > LYING_DRIVE_MAX || ctx.drives.warmth > LYING_WARMTH_DRIVE_MAX) return;
  if (world.weather.storm > LYING_STORM || world.weather.rain > LYING_RAIN) return;
  const home = ctx.home;
  const left = p.pregnantUntil - world.tick;
  const sc = new Scorer().add('her time is near', LYING_SCORE);
  addOption(ctx, {
    kind: 'rest',
    label: 'Lie in by the door until the child comes',
    goal: 'to wait for the child',
    need: null,
    util: sc.total,
    parts: sc.parts,
    eta: left + LYING_SLACK,
    key: 'lie_in',
    targetId: 0,
    tag: 'rest',
    make: () => {
      const spot = standSpotFor(world, p, home);
      if (!spot) return null;
      return newActivity(world, p, {
        kind: 'rest',
        label: 'Lying in by her door',
        goal: 'to wait for the child',
        tx: spot.x,
        ty: spot.y,
        spotX: spot.x,
        spotY: spot.y,
        amount: left + LYING_SLACK,
        utility: sc.total,
        minCommit: 120,
        maxTicks: left + LYING_SLACK + 400,
        data: { lyingIn: world.tick, sticky: true },
      });
    },
  });
}

/** the rest activity marked `lyingIn` has begun work (act_misc.ts): she is lying in, and it is on her record until the birth */
export function lyingInBegin(world: World, p: Person, a: Activity): void {
  if (p.lyingIn === undefined) {
    p.lyingIn = world.tick;
    addLog(world, p, 'life', 'Went to lie in by my door: the child will come soon.');
  }
  a.duration = Math.max(1, a.amount);
}

/** one tick of lying in (act_misc.ts rest handler): it ends with the child, or when her time and the slack are past */
export function lyingInWork(world: World, p: Person, a: Activity): WorkResult {
  if (!hasBirthHelp(world) || p.pregnantUntil <= 0) return 'done';
  a.progress++;
  return a.progress >= a.duration ? 'done' : 'continue';
}

// ───────────────────────── the ask ─────────────────────────
/** the grown woman a housemate sees lying in, if there is one: the asker's own sight and nothing else */
export function motherSeenLyingIn(ctx: Ctx): { s: SeenEntity; mother: Person } | null {
  const { world, p } = ctx;
  for (const s of ctx.seenPersons) {
    if (!s.lyingIn || hyp(s.x - p.x, s.y - p.y) > ASK_SEE) continue;
    const e = world.byId.get(s.id);
    if (e && e.ent === 'person' && e.alive && e.hhId === p.hhId && e.id !== p.id) return { s, mother: e };
  }
  return null;
}

/**
 * The woman asking for herself: she is expecting, with a home, within a day of her time and not yet lying in. Returns her, or null. (What she needs to ask is the
 * same as a housemate's: `mayAskForHelpNow`, and somebody in sight who may be asked.)
 */
export function motherAsking(ctx: Ctx): Person | null {
  const { world, p } = ctx;
  if (!hasBirthHelp(world) || p.sex !== 'f' || ctx.stage === 'child' || !ctx.home) return null;
  const left = p.pregnantUntil - world.tick;
  if (p.pregnantUntil <= 0 || left <= 0 || left > ASK_EARLY) return null;
  if (p.lyingIn !== undefined || p.activity?.data.lyingIn !== undefined) return null;
  return p;
}

/** the tick she tells the helper to come at: when her lying-in window opens (or now, if it has) */
export const lyingInOpensAt = (world: World, mother: Person): number => Math.max(world.tick, mother.pregnantUntil - LYING_WINDOW);

/** somebody has been asked to be with her at this birth (by her or a housemate): kept on her until the birth, for what the feed says of it */
export function noteBirthAsked(world: World, req: Request): void {
  const m = req.destId ? personOf(world, req.destId) : undefined;
  if (m && m.birthAsked === undefined) m.birthAsked = world.tick;
}

/** every ask for this woman in the last day: the ones still open, and the number made (hers and her housemates' together) */
function asksFor(world: World, motherId: number): { open: boolean; made: number } {
  let open = false, made = 0;
  for (const r of world.requests) {
    if (r.kind !== 'attend_birth' || r.destId !== motherId || world.tick - r.created >= DAY) continue;
    made++;
    if (r.status === 'pending' || r.status === 'promised') open = true;
  }
  return { open, made };
}

/** Whether this housemate is the one to go and ask, now: ordinary ease, and nobody has been asked and said yes or is being asked. */
export function mayAskForHelpNow(ctx: Ctx, mother: Person): boolean {
  const { world } = ctx;
  if (!hasBirthHelp(world) || ctx.stage === 'child' || ctx.criticals.length || ctx.dangers.length) return false;
  if (ctx.drives.hunger > ASK_DRIVE_MAX || ctx.drives.thirst > ASK_DRIVE_MAX) return false;
  const asks = asksFor(world, mother.id);
  return !asks.open && asks.made < ASKS_MAX;
}

/** Whether this neighbour, seen, could be asked: a grown person of another household, awake and not in a talk (the caller has seen to that). */
export function mayBeAskedToAttend(ctx: Ctx, mother: Person, q: Person): boolean {
  const { world, p } = ctx;
  if (q.id === mother.id || q.hhId === mother.hhId || q.hhId === p.hhId) return false;
  const st = stageOf(world, q);
  if (st === 'child' || st === 'youth') return false;
  if (q.pregnantUntil > 0 && q.pregnantUntil - world.tick < LYING_WINDOW) return false; // her own time is near
  return (p.cooldowns['birthask' + q.id] ?? 0) <= world.tick;
}

/** how much a neighbour is worth asking, by what the asker has seen of them and knows of them: those who have borne or attended a child, kin, friends */
export function helperScorer(ctx: Ctx, mother: Person, q: Person, aff: number, d: number): Scorer {
  const { p } = ctx;
  const sc = new Scorer().add(p.id === mother.id ? 'I should have somebody with me' : 'somebody should be with her', ASK_BASE);
  if (q.children.length > 0) sc.add('has borne a child', ASK_BORNE);
  else if ((q.attended ?? 0) > 0) sc.add('has helped at a birth', ASK_ATTENDED);
  if (q.sex === 'f') sc.add('a woman', ASK_WOMAN);
  if (p.relations[q.id]?.kin || mother.relations[q.id]?.kin || q.relations[mother.id]?.kin) sc.add('family', ASK_KIN);
  else if (aff >= ASK_FRIEND_AFFINITY) sc.add('a friend', ASK_FRIEND);
  sc.add('walking', -pen((d * 1.18) / Math.max(0.03, ctx.speed)) * 0.6);
  return sc;
}

/** the asker was turned down: they wait before asking that neighbour again, and the one who has none left to ask is left to manage */
export function onBirthHelpDeclined(world: World, A: Person, B: Person, mother: Person | null | undefined): void {
  A.cooldowns['birthask' + B.id] = world.tick + ASK_AGAIN;
  think(world, A, 'no_help', -3, DAY / 2, `${B.name} could not be with ${mother?.name ?? 'her'}`);
  addLog(world, A, 'social', `${B.name} could not be with ${mother?.name ?? 'her'} for the birth. I will have to ask someone else, or manage.`);
}

// ───────────────────────── the answer ─────────────────────────
type Answer = { kind: 'promise'; item: null; n: number } | { kind: 'decline'; reason: 'own_need' | 'committed' | 'unwilling' | 'disliked' };

/** B's answer to A's ask that they be with the woman when her child comes (social.ts evaluateRequest): weighed as a watch is, by B's own state and record. */
export function answerBirthHelp(world: World, B: Person, A: Person, req: Request): Answer {
  const rel = B.relations[A.id];
  if (laidUp(world, B) || personalDriveMax(world, B) > 50) return { kind: 'decline', reason: 'own_need' };
  if (activeCommitments(B).length >= MAX_ACTIVE_COMMITMENTS) return { kind: 'decline', reason: 'committed' };
  const ownKids = membersOf(world, householdById(world, B.hhId)).filter((m) => m !== B && m.alive && stageOf(world, m) === 'child').length;
  if (ownKids >= 2) return { kind: 'decline', reason: 'own_need' };
  const mother = req.destId ? personOf(world, req.destId) : undefined;
  let w = willingness(world, B, A, 0.5);
  if (B.children.length > 0 || (B.attended ?? 0) > 0) w += WILL_BORNE;
  if (B.sex === 'f') w += WILL_WOMAN;
  if (mother && ((B.relations[mother.id]?.kin ?? '') !== '' || (B.relations[mother.id]?.affinity ?? 0) >= ASK_FRIEND_AFFINITY)) w += WILL_KNOWS;
  if (w < WILL_NEEDED) return { kind: 'decline', reason: (rel?.affinity ?? 0) < -10 ? 'disliked' : 'unwilling' };
  return { kind: 'promise', item: null, n: 1 };
}

/**
 * Spoken when the help is promised, as for a watch: a housemate tells the helper where they last saw her, if that is newer than what the helper has; the woman
 * herself tells the helper where her door is (the home she holds a belief of, as a told place).
 */
export function communicateMotherLocation(world: World, asker: Person, helper: Person, motherId: number): void {
  if (asker.id === motherId) {
    const home = homeBeliefOf(world, asker, asker);
    if (home) tellBelief(world, asker, helper, home);
    return;
  }
  const seen = asker.seen.find((s) => s.ent === 'person' && s.id === motherId);
  const location = seen ? { x: seen.x, y: seen.y, tick: asker.lastPercept.tick } : asker.whereabouts[motherId];
  if (!location || world.tick - location.tick > DAY || (helper.whereabouts[motherId]?.tick ?? -1) >= location.tick) return;
  helper.whereabouts[motherId] = { ...location };
  addLog(world, helper, 'social', `${asker.name} told me where they last saw the woman who is lying in (tick ${location.tick}).`);
}

// ───────────────────────── the help ─────────────────────────
/**
 * Where a helper told to come to her door goes: the tile at the home's door, not the tile of its walls nearest to the helper (`spotNear`), which can be the far side of
 * the home, out of sight of the woman lying in by the door (seen in the first run of this: a helper waited seven tiles off at an "empty door" with the woman in plain daylight beyond sight).
 */
function doorSpotOf(world: World, p: Person, home: Belief): { x: number; y: number } | null {
  const e = world.byId.get(home.id);
  if (e && e.ent === 'building' && isWalkable(world, e.doorX, e.doorY)) return doorPoint(e);
  return spotNear(world, p, home);
}

/**
 * the belief a person holds of the home a woman's household lives in (their own, if she is of their household), or null. A household can have two buildings that count as a home
 * (a lean-to and the hut that came after it; seen in the first run of this, where a helper went to the old one): the one the household lives in (`hhId`'s `homeId`, which is the one she
 * lies in by the door of, and the one she tells of) if the person holds a belief of it, else the first they hold.
 */
function homeBeliefOf(world: World, p: Person, mother: Person): Belief | null {
  const homeId = householdById(world, mother.hhId)?.homeId;
  const lives = homeId ? p.beliefs[homeId] : undefined;
  if (lives && lives.kind === 'building' && isHomeType(lives.btype)) return lives;
  for (const b of beliefsByKind(p, ['building'])) if (b.hh === mother.hhId && isHomeType(b.btype)) return b;
  return null;
}

/**
 * The promised help, offered from the helper's own promises (options_work.ts optCommitments). Told a time (the woman asked her, carrying the tick her lying-in
 * window opens on the request), she does nothing about it before then, and then goes to the woman's door: the home she was told of or holds a belief of, else where
 * she last saw the woman, whether or not she can see her lying in. Not told a time (a housemate's ask), she goes at once to where she was told the woman is.
 */
export function birthHelpCommitmentOption(ctx: Ctx, c: Commitment): void {
  const { world, p } = ctx;
  const m = world.byId.get(c.destId ?? 0);
  if (!m || m.ent !== 'person' || !m.alive) return;
  const due = requestOf(world, c)?.deadline ?? 0;
  if (due > world.tick) {
    addBlocked(ctx, 'visit', `Be with ${m.name} for the birth`, m.id, `told to come when her time is near (from tick ${due})`, 'promise');
    return;
  }
  const told = due > 0;
  const home = told ? homeBeliefOf(world, p, m) : null;
  const loc = home ? doorSpotOf(world, p, home) ?? { x: home.x, y: home.y } : whereIs(ctx, m.id, 0);
  if (!loc || (p.cooldowns['birth' + m.id] ?? 0) > world.tick) {
    addBlocked(ctx, 'visit', `Be with ${m.name} for the birth`, m.id, !loc ? 'does not know where she is' : 'could not find her; waiting before looking again', 'promise');
    return;
  }
  const e = eta(ctx, loc.x, loc.y);
  const to = world.byId.get(c.to);
  const sc = new Scorer().add(`promised ${to && to.ent === 'person' ? to.name : 'someone'} to be with ${m.name} when the child comes`, HELP_SCORE).add('walking', -pen(e));
  addOption(ctx, {
    kind: 'visit',
    label: `Be with ${m.name} for the birth, as promised`,
    goal: `to keep my promise to be with ${m.name} when her child comes`,
    need: null,
    util: sc.total,
    parts: sc.parts,
    eta: e + HELP_WAIT_MAX,
    key: `birth:${m.id}`,
    targetId: m.id,
    tag: 'promise',
    make: () =>
      newActivity(world, p, {
        kind: 'visit',
        label: told ? `Waiting at ${m.name}'s door for her child` : `Waiting with ${m.name} for her child`,
        goal: `to be with ${m.name} when her child comes`,
        targetId: m.id,
        // a woman who has not lain in may be indoors: told to come to her door, the helper does not chase her and does not fail at the wall
        ...(told ? {} : { targetType: 'person' }),
        tx: loc.x,
        ty: loc.y,
        spotX: loc.x,
        spotY: loc.y,
        utility: sc.total,
        minCommit: 100,
        maxTicks: Math.ceil(e) + HELP_WAIT_MAX + HELP_AFTER + 300,
        data: { birth: true, commitmentId: c.id, items: {}, sticky: true, ...(told ? { told: due } : {}) },
      }),
  });
}

const commitmentOf = (p: Person, a: Activity): Commitment | undefined => p.commitments.find((c) => c.id === a.data.commitmentId);
const requestOf = (world: World, c: Commitment | undefined): Request | undefined => (c ? world.requests.find((r) => r.id === c.requestId) : undefined);

/** One tick of the helper's wait (welfare.ts visit handler, while `a.data.birth` is set). */
export function birthHelpWork(world: World, p: Person, a: Activity, mother: Person): 'continue' | 'done' | `fail:${string}` | `partial:${string}` {
  const here = sameSpace(world, p, mother);
  const d = hyp(mother.x - p.x, mother.y - p.y);
  if (!here || d > senseRadius(world, p)) {
    if (a.data.told === undefined) {
      if (!here) return 'fail:she was not where I expected';
      p.cooldowns['birth' + mother.id] = world.tick + HELP_RETRY;
      return 'fail:lost sight of her';
    }
    // told to come to her door, she is not in sight (she did not lie in, or has not come yet): the helper waits at the empty door, and the promise lapses
    // quietly (a line in the helper's log, none in the feed) if the child has not come or she has not come to lie in within a third of a day
    a.data.emptyDoor = true;
    const since = (a.data.waitFrom ??= world.tick) as number;
    a.progress++;
    if (mother.pregnantUntil <= 0) {
      releaseHelp(world, p, a, 'the child was already born');
      return 'fail:the child was already born when I came';
    }
    if (world.tick - since >= HELP_WAIT_MAX + BIRTH_LAG) {
      releaseHelp(world, p, a, 'she had not come to lie in');
      return 'partial:she had not come to lie in';
    }
    return 'continue';
  }
  faceToward(p, mother.x, mother.y);
  if (d > HELP_NEAR - 0.8) {
    // she has moved: follow
    a.tx = mother.x;
    a.ty = mother.y;
    a.spotX = mother.x;
    a.spotY = mother.y;
    a.phase = 'travel';
    a.path = [];
    a.pi = 0;
    return 'continue';
  }
  a.progress++;
  // the wait is counted in time, not in ticks of work: a talk or a call away does not give her helper a fresh third of a day
  const waitFrom = (a.data.waitFrom ??= world.tick) as number;
  const done = a.data.birthDone as number | undefined;
  if (done !== undefined) {
    // the promise was kept at the birth (birthScene); what is left is staying a little after it
    return world.tick - done < HELP_AFTER ? 'continue' : 'done';
  }
  // not yet: she is still carrying (a child born to somebody who was not beside her is no business of this helper's wait)
  if (mother.pregnantUntil <= 0) {
    releaseHelp(world, p, a, 'the child was already born');
    return 'fail:the child was already born when I came';
  }
  if (world.tick - waitFrom >= HELP_WAIT_MAX + (a.data.told !== undefined ? BIRTH_LAG : 0)) {
    releaseHelp(world, p, a, 'the child had not come');
    return 'fail:the child did not come while I waited';
  }
  return 'continue';
}

/** The promise is kept, at the moment of the birth, with the helper beside her (and not left to a later tick the helper may not live to see through). */
function keepHelp(world: World, p: Person, a: Activity, mother: Person): void {
  const c = commitmentOf(p, a);
  if (c && c.status === 'active') {
    c.status = 'done';
    c.contrib = Math.max(c.contrib ?? 0, 40);
    c.reason = 'was beside her when the child was born';
    const r = requestOf(world, c);
    if (r && r.status === 'promised') settle(world, r, 'fulfilled', 'was with her when the child was born');
    const asker = personOf(world, c.to);
    if (asker) adjustRel(asker, p.id, world.tick, { aff: 3, trust: 4, note: `${p.name} was with ${mother.name} for the birth` });
  }
  addLog(world, p, 'social', `Stayed with ${mother.name} until her child had come, as promised.`);
}

/** The promise comes to nothing without blame: the child was born before they came, or never came while they waited. */
function releaseHelp(world: World, p: Person, a: Activity, why: string): void {
  const c = commitmentOf(p, a);
  if (c && c.status === 'active') {
    c.status = 'moot';
    c.reason = why;
    const r = requestOf(world, c);
    if (r && r.status === 'promised') settle(world, r, 'cancelled', why);
  }
  addLog(world, p, 'social', `Went to be with a woman for her birth, but ${why}.`);
}

// ───────────────────────── the birth ─────────────────────────
/**
 * who is beside her now: those whose promised help brought them within reach, in the same place. One who has stopped to talk is still beside her (their
 * wait is held while they talk, `Person.suspended`); one still walking up is not.
 */
function helpersAt(world: World, mother: Person): { q: Person; a: Activity }[] {
  const out: { q: Person; a: Activity }[] = [];
  for (const q of world.persons) {
    if (!q.alive || q === mother) continue;
    const held = isHelperActivity(q.suspended, mother.id);
    const a = isHelperActivity(q.activity, mother.id) ? q.activity! : held ? q.suspended! : null;
    if (!a || (!held && a.phase !== 'work') || !sameSpace(world, q, mother) || hyp(q.x - mother.x, q.y - mother.y) > HELP_NEAR) continue;
    out.push({ q, a });
  }
  return out;
}

export interface BirthScene { text: string; ids: number[] }

/**
 * The child is born (lifecycle.ts giveBirth, once the child, the household and the feast are in place; nothing before it moves). If she had
 * lain in, the scene is settled: who was beside her, what it did to them, and the words of the feed. Returns null for a woman who had not
 * lain in, whose line is the old one.
 */
export function birthScene(world: World, mother: Person, baby: Person, father: Person | null): BirthScene | null {
  if (!hasBirthHelp(world)) return null;
  const lay = mother.lyingIn !== undefined;
  const asked = mother.birthAsked !== undefined;
  delete mother.lyingIn;
  delete mother.birthAsked;
  if (!lay && !asked) return null;
  const beside = helpersAt(world, mother);
  const helpers = beside.map((b) => b.q);
  for (const { q: h, a } of beside) {
    h.attended = Math.min(ATTENDED_MAX, (h.attended ?? 0) + 1);
    a.data.birthDone = world.tick;
    adjustRel(mother, h.id, world.tick, { aff: BORN_MOTHER_AFFINITY, trust: BORN_MOTHER_TRUST, fam: BORN_FAMILIARITY, note: `${h.name} was with me when ${baby.name} was born` });
    adjustRel(h, mother.id, world.tick, { aff: BORN_HELPER_AFFINITY, trust: BORN_HELPER_TRUST, fam: BORN_FAMILIARITY, note: `was with ${mother.name} when ${baby.name} was born` });
    think(world, h, 'born_with', BORN_GLAD, DAY, `was there when ${baby.name} was born`);
    think(world, mother, 'born_with:' + h.id, BORN_GLAD, DAY, `${h.name} was with me when ${baby.name} came`);
    addLog(world, h, 'social', `Was with ${mother.name} when ${baby.name} was born.`);
    keepHelp(world, h, a, mother);
    // afterwards the helper is the first to look in: a worry of the ordinary kind, raised by what they saw (welfare.ts)
    if (!h.concerns.some((c) => c.about === mother.id && c.kind === 'newborn')) {
      h.concerns.push({ about: mother.id, kind: 'newborn', seen: world.tick, src: 'seen', from: h.id, checked: -99999 });
      if (h.concerns.length > 6) h.concerns.shift();
    }
    addLog(world, mother, 'life', `${h.name} was with me when ${baby.name} was born.`);
  }
  // an ask that no helper reached in time is released, not broken
  for (const r of world.requests) {
    if (r.kind !== 'attend_birth' || r.destId !== mother.id || (r.status !== 'pending' && r.status !== 'promised')) continue;
    const helper = personOf(world, r.to);
    if (r.status === 'promised' && helper && helpers.includes(helper)) continue; // theirs is settled when they have stayed a little after
    const c = helper?.commitments.find((x) => x.id === r.commitmentId);
    if (c && c.status === 'active') {
      c.status = 'moot';
      c.reason = 'the child was born before I came';
    }
    if (helper?.activity && isHelperActivity(helper.activity, mother.id)) endActivity(world, helper, 'partial', 'the child was born before I came');
    if (helper && r.status === 'promised') addLog(world, helper, 'social', `The child was born before I could be with ${mother.name}.`);
    settle(world, r, 'cancelled', 'the child was born before they could come');
  }
  const born = `${baby.name} was born to ${mother.name}${father ? ' and ' + father.name : ''}`;
  if (!helpers.length) {
    think(world, mother, 'bore_alone', BORN_ALONE, BORN_ALONE_FOR, `bore ${baby.name} with no one to help`);
    // unhelped: the old line, word for word (the feed does not say who was not there)
    return { text: `${born}.`, ids: [baby.id, mother.id] };
  }
  const names = helpers.map((h) => h.name);
  const who = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return { text: `${born}, with ${who} there to help.`, ids: [baby.id, mother.id, ...helpers.map((h) => h.id)] };
}

/** The helper has come to look in on the mother after the birth (welfare.ts visit): both are the better for it, as for a look-in on the bereaved. */
export function onLookedInOnMother(world: World, visitor: Person, mother: Person): void {
  think(world, mother, 'looked_in', 4, DAY / 2, `${visitor.name} came to see how we were`);
  think(world, visitor, 'looked_in', 2, DAY / 2, `looked in on ${mother.name} and the baby`);
  adjustRel(mother, visitor.id, world.tick, { aff: 2, trust: 1, fam: 1, note: `${visitor.name} came to see how we were after the birth` });
  adjustRel(visitor, mother.id, world.tick, { aff: 1, fam: 1 });
  addLog(world, visitor, 'social', `Looked in on ${mother.name} and the baby.`);
  addLog(world, mother, 'social', `${visitor.name} came to see how we were.`);
}

// ───────────────────────── what the card says ─────────────────────────
/** Rows for the card (history.ts): what this person has done at a birth, and what is being done now, said as it is. */
export function birthHelpRows(p: Person): string[] {
  const rows: string[] = [];
  if (p.lyingIn !== undefined) rows.push(`Lying in by their door since tick ${p.lyingIn}, waiting for the child.`);
  if (p.attended) rows.push(`Has been beside ${p.attended === 1 ? 'one birth' : `${p.attended} births`} as a helper.`);
  return rows;
}

// ───────────────────────── saved state ─────────────────────────
/** What a save may hold of this (rules 261, rich only); anything else is refused on loading. */
export function validateBirthHelp(w: World): void {
  const allowed = w.settings.dynamics === 'rich' && runsRulesVersion(w, HEARTH_FROM);
  const int = (n: unknown, min: number, max: number): boolean => Number.isSafeInteger(n) && (n as number) >= min && (n as number) <= max;
  for (const p of w.persons) {
    if (p.lyingIn !== undefined && (!allowed || !int(p.lyingIn, 0, w.tick) || w.tick - p.lyingIn > LYING_WINDOW + DAY || !(p.pregnantUntil > 0))) throw new Error('Invalid lying in');
    if (p.attended !== undefined && (!allowed || !int(p.attended, 1, ATTENDED_MAX))) throw new Error('Invalid births attended');
    if (p.birthAsked !== undefined && (!allowed || !int(p.birthAsked, 0, w.tick) || !(p.pregnantUntil > 0))) throw new Error('Invalid birth ask record');
    for (const a of [p.activity, p.suspended]) {
      if (!a) continue;
      if (a.data.lyingIn !== undefined && (!allowed || a.kind !== 'rest' || !int(a.data.lyingIn, 0, w.tick))) throw new Error('Invalid lying in activity');
      if (a.data.birth !== undefined && (!allowed || a.kind !== 'visit' || a.data.birth !== true || (a.data.birthDone !== undefined && !int(a.data.birthDone, 0, w.tick)) || (a.data.waitFrom !== undefined && !int(a.data.waitFrom, 0, w.tick)) || (a.data.told !== undefined && !int(a.data.told, 1, w.tick)) || (a.data.emptyDoor !== undefined && (a.data.emptyDoor !== true || a.data.told === undefined)))) throw new Error('Invalid birth help activity');
    }
    for (const c of p.commitments) if (c.milestone === 'attended' && (!allowed || c.kind !== 'work' || c.destKind !== 'person')) throw new Error('Invalid birth help promise');
  }
  // a request carries a time only when the woman asked for herself (the tick her lying-in window opens, at most a day ahead)
  for (const r of w.requests) if (r.kind === 'attend_birth' && (!allowed || r.destKind !== 'person' || !int(r.destId, 1, Number.MAX_SAFE_INTEGER) || !int(r.deadline ?? 0, 0, w.tick + ASK_EARLY) || ((r.deadline ?? 0) !== 0 && r.from !== r.destId))) throw new Error('Invalid birth help request');
  for (const c of w.conversations) if ((c.data as { reqKind?: string }).reqKind === 'attend_birth' && !allowed) throw new Error('Invalid birth help conversation');
}
