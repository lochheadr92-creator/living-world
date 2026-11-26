// Rules 264 (the social scenes stream, bundle E, part 13 of `docs/SOCIAL_SCENES_PLAN.md`): fetching someone home after dark. When it is dark or nearly dark and a member of
// somebody's own household has not been seen for a long while, they do not go out alone if they can help it: they ask a grown person in sight to come with them, the two walk
// out together to where the worrier last saw the missing one, and walk back with them.
//
// What stood before: a household dependant not seen for over 1,100 ticks becomes a `missing` concern (welfare.ts) and an adult may walk over and look in, alone, for twelve ticks.
// In six settlements over 25 days there were 87 wolf bites, none fatal, 65 of them in the dark, 76 on somebody with nobody else within five tiles. By the rules that were already
// there a person with two others within five tiles is never picked by a wolf and a stalking wolf breaks off when two or more are near it (wildlife.ts): nothing new is needed for a
// group to be safer, only that it stays together.
//
// One part, `fetch` (switched in together_scenes.ts, with `side`, standing_up.ts, and `speech`, speak_for.ts). From rules 264:
//
//   the cue      A grown person (not a child or a youth) with no critical need and no danger believed about, who holds the `missing` worry for a member of their own household
//                (the worry welfare.ts raises) and is offered the walk to look for them (the `visit:` option), when the light is under FETCH_DARK, and whose own record of the
//                last place they saw them (whereIs: not "in sight") is within FETCH_RANGE tiles of their home door (of the settlement centre if they have no home). It is the
//                worrier's own record and nothing else: they walk to where THEY last saw them.
//   the ask      Before they go, the worrier asks one grown person in sight, within FETCH_ASK_NEAR tiles, to come with them: an ordinary request of a new kind, `fetch`, made in an
//                ordinary conversation (options_social.ts optFetchAsk), worth the walk's own worth and FETCH_ASK_EDGE more so that, other things being equal, it comes first (mood weighs a talk and a walk a little differently, so a worrier in a low mood may go without asking). Kin and friends are asked first.
//                A refusal costs what any refusal costs, the next person in sight is asked, and at most FETCH_ASKS_MAX are asked for one search. The first yes is enough: one
//                companion (a deviation from "one or two": the plan's own smallest version, chosen from the start). If nobody agrees, the worrier goes alone exactly as before.
//   the answer   Weighed as a `watch` is (social.ts evaluateRequest, answerFetch here): not if laid up or pressed by a need of their own (a drive over 50) or believing in a danger,
//                not with a promise too many, not with two small children of their own to leave, and then by their regard for the asker (willingness). A yes is an ordinary promise
//                (a `work` commitment, milestone `fetched`), kept by having gone, whether or not the one looked for was found.
//   the walk     The worrier's visit becomes the search: the same `visit` activity, now carrying `data.fetch` (who, since when, where home is, who came with them) and walking to
//                the place they last saw them. The companion's own `visit` (`data.fetchWith`) follows the worrier, and so does the found person's (`data.fetchedBy`): whoever falls
//                more than FETCH_TOGETHER - 0.4 tiles behind turns and follows again, running (the speed fleeing uses) if more than FETCH_RUN_FROM tiles back, so the group stays
//                within a few tiles of each other the whole way. Whoever is left more than FETCH_LOST tiles behind for FETCH_LOST_FOR ticks has lost them and goes no further.
//   finding      On reaching that place the worrier looks round for FETCH_LOOK ticks; seeing the one looked for (within FETCH_FIND tiles, or at any distance they can see: they
//                walk over), they say a line and the one found is offered a strong option to walk home with them (their own choice, as for any option: not offered with a critical
//                need or a danger believed about). They turn for home when the one found has set out with them, or after FETCH_WAIT_FOR_THEM ticks without.
//   limits       About FETCH_TICKS ticks out, or the worrier more than FETCH_RANGE tiles from home, and they turn back with whoever they have. If the one looked for is seen near
//                home by themselves first, nothing more is done and nothing is written.
//   the lines    On arriving within FETCH_HOME_NEAR tiles of home with a companion still beside them (within FETCH_BESIDE tiles): "A and B went out after dark and brought C home."
//                or, when they did not find them or the one found would not come: "A and B went out after dark looking for C and came back without them." With no companion
//                still beside them nothing is written to the feed. The one brought home is glad of it for a day and fonder of those who came.
//   not built    The public thanks of bundle A (praise.ts) is not used: it is made of a rescue from a wolf and says so in its words (thanksOwed, "for driving off a wolf"), so it does
//                not fit what this is without a change to it. The found person's own gratitude is what is here.
//
// Rules 278 (one more switched repair of this part, `fetchSetsOutOn`): once somebody has promised to come (`companionsFor`), the worrier's own walk to look is offered at the
// companion's level, FETCH_JOIN_SCORE less the walk, instead of the ordinary visit's worth. Before it the companion was offered the walk at 72 and the worrier's own walk stayed
// at 26 to 29, under sleep at 35 to 51, so the worrier went to bed and the companion's walk ended "the search never set out" (docs/SOCIAL_SCENES.md, "Rules 278"). It changes the
// one number only; the cue, the ask, the answer, the walk and its limits are as they were, and with no promise nothing is touched.
//
// Nothing here reads anybody's true state to plan: the worrier acts on their own record of where they saw them and their own sight of them on getting there; the answers are the
// answerers' own; the one found is offered the walk because they see the worrier come up and speak, and for no other reason. (Bookkeeping is read: whom a search is for, to link the
// companion's and the found person's walk to it, and whether the found person has set out, which the worrier would see.) No draw from the shared stream is made. Saved: the activities'
// own data (`fetch`, `fetchWith`, `fetchedBy`), requests of kind `fetch`, the promises they make (milestone `fetched`) and the asker's ordinary `cooldowns`, all in the fingerprint
// (world.ts) and checked on loading (validateFetching). Rich worlds at rules 264 and later only; rules 263 and earlier, authored worlds and a part switched off keep the old behaviour.
import { endActivity, faceToward, newActivity } from './activities';
import type { WorkResult } from './activities';
import { DAY } from './constants';
import { FETCH_FOUND_LINES, saying } from './dialogue';
import { addEvent, addLog, say } from './events';
import { sameSpace } from './habitation';
import { householdById, membersOf } from './households';
import { think } from './mood';
import { Scorer, addBlocked, addOption, eta, pen, whereIs } from './optutil';
import type { Ctx, Option } from './optutil';
import { stageOf } from './people';
import { senseRadius } from './perception';
import { adjustRel } from './relations';
import { nearestCentre } from './reunion';
import { laidUp } from './responsibilities';
import { runsRulesVersion } from './rulesversion';
import { MAX_ACTIVE_COMMITMENTS, activeCommitments, personOf, personalDriveMax, settle, willingness } from './social';
import { TOGETHER_FROM, hasFetching } from './together_scenes';
import type { Activity, Building, Commitment, Concern, Person, Request, World } from './types';
import { hyp } from './util';

// ── the cue and the ask ──
/** the light under which it is "dark or nearly dark" (dusk to dawn: the light is 0 to 1, and under 0.3 is the dark itself) */
export const FETCH_DARK = 0.5;
/** the worrier's own record of the last place they saw them is within this many tiles of home */
export const FETCH_RANGE = 30;
/** a grown person in sight within this many tiles may be asked, at most this many are asked for one search, counting the asks of the last FETCH_ASK_WINDOW ticks */
export const FETCH_ASK_NEAR = 12;
export const FETCH_ASKS_MAX = 2;
export const FETCH_ASK_WINDOW = 900;
/** the ask is worth the walk's own worth and this much more, so that it comes first; and one who refused is not asked again for this long */
export const FETCH_ASK_EDGE = 4;
export const FETCH_ASK_AGAIN = 400;
/** what a kinsman, a friend or a neighbour adds to who is worth asking */
export const FETCH_ASK_KIN = 6;
export const FETCH_ASK_FRIEND = 4;
export const FETCH_FRIEND_AFFINITY = 25;
/** willingness needed to say yes, as for a watch (0.5) */
export const FETCH_WILL = 0.5;
/** the promise runs this long, and one that has been made and never taken up lapses after FETCH_PROMISE_LIFE */
export const FETCH_PROMISE_TTL = 1300;
export const FETCH_PROMISE_LIFE = 900;
// ── the walk ──
/** the companion's and the found person's own worth: above the ordinary work of a night, below a pressing need */
export const FETCH_JOIN_SCORE = 72;
export const FETCH_HOME_SCORE = 84;
/** how near the group keeps, and how far behind a follower runs; how far behind, for how long, is lost */
export const FETCH_TOGETHER = 3;
export const FETCH_RUN_FROM = 4.5;
export const FETCH_LOST = 9;
export const FETCH_LOST_FOR = 60;
/** a companion waits this long for the worrier to set out */
export const FETCH_JOIN_WAIT = 240;
/** how near the companion must be to the worrier when they set out to be one of the party, and how long after the worrier sets out they have to start walking with them */
export const FETCH_JOIN_NEAR = 10;
export const FETCH_JOIN_GRACE = 150;
// ── finding and bringing home ──
export const FETCH_FIND = 5;
export const FETCH_LOOK = 24;
export const FETCH_GREET = 24;
export const FETCH_WAIT_FOR_THEM = 90;
export const FETCH_FOUND_NEAR = 8;
/** the search is over the worrier is this far out, or has been out this long */
export const FETCH_TICKS = 600;
export const FETCH_HOME_NEAR = 8;
export const FETCH_BESIDE = 6;
// ── what it does ──
export const FETCH_GLAD = 5;
export const FETCH_GLAD_FOR = DAY;
export const FETCH_AFFINITY = 3;
export const FETCH_TRUST = 2;
export const FETCH_COMPANION_AFFINITY = 2;
// ── the worrier sets out once somebody has promised (rules 278) ──
/** the first rules version in which the worrier's own walk to look is offered at the companion's level once somebody has promised to come */
export const FETCH_SETS_OUT_FROM = 278;
let setsOutOn = true;
/** Lab switch `rich-no-fetch-sets-out` (never saved or hashed): the worrier's own walk to look keeps the ordinary visit's worth even with a promise made, as before rules 278. */
export const fetchSetsOutOn = (): boolean => setsOutOn;
export function setFetchSetsOut(on: boolean): void { setsOutOn = on; }
/** the repair applies in a rich world at rules 278 and later, with the fetch part on and its own switch on */
export const hasFetchSetsOut = (w: World): boolean => setsOutOn && hasFetching(w) && runsRulesVersion(w, FETCH_SETS_OUT_FROM);

export interface FetchData {
  /** whom the search is for, when it set out, where home is (the door point of the worrier's home, or the settlement centre) */
  for: number;
  since: number;
  home: { x: number; y: number };
  /** the companions who set out with them (one, in this version) */
  party: number[];
  phase: 'out' | 'back';
  /** ticks spent looking round at the place; the tick the one looked for was found; the tick the one found was waited for from; the one found has set out with them */
  looked?: number;
  found?: number;
  waited?: number;
  fetched?: true;
  /** the search has been settled one way or another and its promises closed */
  done?: true;
}
export interface FetchWithData {
  leader: number;
  for: number;
  commitmentId: number;
  /** ticks waited for the leader to set out, ticks behind (more than FETCH_LOST) in a row */
  waited?: number;
  lost?: number;
  done?: true;
}
export interface FetchedByData {
  leader: number;
  /** the `since` of the search they are being brought home by */
  since: number;
  waited?: number;
  lost?: number;
}

const isFetching = (a: Activity | null | undefined): boolean => !!a && a.kind === 'visit' && (a.data.fetch !== undefined || a.data.fetchWith !== undefined || a.data.fetchedBy !== undefined);
export const isFetchSearch = (a: Activity | null | undefined): boolean => !!a && a.kind === 'visit' && a.data.fetch !== undefined;
export const hasFetchData = (a: Activity | null | undefined): boolean => isFetching(a);

const homePointOf = (w: World, p: Person, home: Building | null): { x: number; y: number } => (home ? { x: home.doorX + 0.5, y: home.doorY + 0.5 } : nearestCentre(w, p));
const grown = (w: World, q: Person): boolean => {
  const st = stageOf(w, q);
  return st !== 'child' && st !== 'youth';
};
const listNames = (names: string[]): string => (names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

/** whether this person believes in a danger (as the person's own options do: a danger belief seen lately, out of doors) */
function believesInDanger(w: World, p: Person): boolean {
  if (p.indoors) return false;
  for (const id of p.bykind.danger ?? []) {
    const b = p.beliefs[id];
    if (b && b.amount > 0 && w.tick - b.seen < 700) return true;
  }
  return false;
}

// ───────────────────────── the cue (options_social.ts optFetchAsk) ─────────────────────────
export interface FetchCue { c: Concern; M: Person; visit: Option; loc: { x: number; y: number }; home: { x: number; y: number } }

/** The search that would be made, if there is one: the `missing` worry for a household member, in the dark, with the ordinary walk to look for them on offer. */
export function fetchCue(ctx: Ctx): FetchCue | null {
  const { world, p } = ctx;
  if (!hasFetching(world) || !grown(world, p) || ctx.criticals.length || ctx.dangers.length || p.convId || world.light >= FETCH_DARK || isFetching(p.activity)) return null;
  for (const c of p.concerns) {
    if (c.kind !== 'missing') continue;
    const M = personOf(world, c.about);
    if (!M || !M.alive || M.hhId !== p.hhId) continue;
    const visit = ctx.options.find((o) => o.key === `visit:${c.about}` && o.make);
    if (!visit) continue;
    const loc = whereIs(ctx, c.about, 0);
    if (!loc || loc.how === 'in sight') continue;
    const home = homePointOf(world, p, ctx.home);
    if (hyp(loc.x - home.x, loc.y - home.y) > FETCH_RANGE) continue;
    return { c, M, visit, loc, home };
  }
  return null;
}

/** how many asks this worrier has made in the last FETCH_ASK_WINDOW ticks for this search */
export function fetchAsksMade(w: World, A: Person, missingId: number): number {
  let n = 0;
  for (const r of w.requests) if (r.kind === 'fetch' && r.from === A.id && r.destId === missingId && w.tick - r.created < FETCH_ASK_WINDOW) n++;
  return n;
}

/** those who have promised to come, for this search, and are near enough to set out with the worrier now */
export function companionsFor(w: World, A: Person, missingId: number): Person[] {
  const out: Person[] = [];
  for (const q of w.persons) {
    if (!q.alive || q === A || hyp(q.x - A.x, q.y - A.y) > FETCH_JOIN_NEAR || !sameSpace(w, q, A)) continue;
    if (q.commitments.some((c) => c.status === 'active' && c.milestone === 'fetched' && c.to === A.id && c.destId === missingId)) out.push(q);
  }
  return out;
}

/** Whether this grown person in sight may be asked to come: not the one looked for, not a child or a youth, not already out on such a search, not one who has just refused. */
export function mayBeAskedToFetch(ctx: Ctx, M: Person, q: Person): boolean {
  const { world, p } = ctx;
  if (q.id === M.id || q.id === p.id || !grown(world, q) || isFetching(q.activity)) return false;
  return (p.cooldowns['fetchask' + q.id] ?? 0) <= world.tick;
}

/** how much a person is worth asking: family and friends first */
export function fetchScorer(ctx: Ctx, cue: FetchCue, q: Person, aff: number, d: number): Scorer {
  const { p } = ctx;
  const sc = new Scorer().add(`${cue.M.name} is not home and it is getting dark`, cue.visit.util + FETCH_ASK_EDGE);
  if (p.relations[q.id]?.kin || q.hhId === p.hhId) sc.add('family', FETCH_ASK_KIN);
  else if (aff >= FETCH_FRIEND_AFFINITY) sc.add('a friend', FETCH_ASK_FRIEND);
  sc.add('walking', -pen((d * 1.18) / Math.max(0.03, ctx.speed)) * 0.6);
  return sc;
}

/**
 * Rules 278. The worrier's own walk to look, once somebody has promised to come (`companionsFor`: the promise made to them, by one beside them), is worth what the companion's walk is
 * worth, FETCH_JOIN_SCORE less the walk to the place, with the reason said plainly. Null with no promise, with the part or the switch off, before 278, or when the ordinary worth is
 * already as high (it never lowers). A critical need or a danger believed about never reaches here: `fetchCue` is null for them, as the companion's walk is blocked for them.
 */
function setsOutScore(ctx: Ctx, cue: FetchCue): Scorer | null {
  const { world, p } = ctx;
  if (!hasFetchSetsOut(world)) return null;
  const companion = companionsFor(world, p, cue.M.id)[0];
  if (!companion) return null;
  const sc = new Scorer().add(`${companion.name} has promised to come and look for ${cue.M.name} with me`, FETCH_JOIN_SCORE).add('walking', -pen(eta(ctx, cue.loc.x, cue.loc.y)));
  return sc.total > cue.visit.util ? sc : null;
}

/**
 * The ordinary walk to look for them, made the search if somebody has promised to come: the visit activity the worrier would have made goes out carrying the party, and takes
 * the time a search is allowed. Without a companion it is not touched. From rules 278, with a companion, it is also offered at the companion's level (`setsOutScore`).
 */
export function joinParty(ctx: Ctx, cue: FetchCue): void {
  const { world, p } = ctx;
  const base = cue.visit.make!;
  const raised = setsOutScore(ctx, cue);
  if (raised) { cue.visit.util = raised.total; cue.visit.parts = raised.parts; }
  cue.visit.make = () => {
    const a = base();
    if (!a) return null;
    const party = companionsFor(world, p, cue.M.id).slice(0, 1);
    if (!party.length) return a;
    if (raised) a.utility = raised.total;
    const data: FetchData = { for: cue.M.id, since: world.tick, home: { x: cue.home.x, y: cue.home.y }, party: party.map((q) => q.id), phase: 'out' };
    a.data.fetch = data;
    a.label = `Going out after dark with ${listNames(party.map((q) => q.name))} to look for ${cue.M.name}`;
    a.goal = `to find ${cue.M.name} and bring them home`;
    a.expire = world.tick + FETCH_TICKS + 500;
    a.minCommit = world.tick + 60;
    return a;
  };
}

// ───────────────────────── the answer (social.ts evaluateRequest) ─────────────────────────
type Answer = { kind: 'promise'; item: null; n: number } | { kind: 'decline'; reason: 'own_need' | 'committed' | 'unwilling' | 'disliked' };

/** B's answer to A's ask that they come with them to look for somebody after dark: weighed as a watch is, by B's own state and record; never with a need of their own or a danger. */
export function answerFetch(world: World, B: Person, A: Person, _req: Request): Answer {
  const rel = B.relations[A.id];
  if (laidUp(world, B) || personalDriveMax(world, B) > 50 || believesInDanger(world, B)) return { kind: 'decline', reason: 'own_need' };
  if (activeCommitments(B).length >= MAX_ACTIVE_COMMITMENTS) return { kind: 'decline', reason: 'committed' };
  const ownKids = membersOf(world, householdById(world, B.hhId)).filter((m) => m !== B && m.alive && stageOf(world, m) === 'child').length;
  if (ownKids >= 2) return { kind: 'decline', reason: 'own_need' };
  const w = willingness(world, B, A, 0.5) + 0.1 * B.traits.generosity;
  if (w < FETCH_WILL) return { kind: 'decline', reason: (rel?.affinity ?? 0) < -10 ? 'disliked' : 'unwilling' };
  return { kind: 'promise', item: null, n: 1 };
}

/** The ask was turned down: the asker waits before asking that person again, and the next in sight is asked, or they go alone. */
export function onFetchDeclined(world: World, A: Person, B: Person, M: Person | null | undefined): void {
  A.cooldowns['fetchask' + B.id] = world.tick + FETCH_ASK_AGAIN;
  think(world, A, 'no_help', -3, DAY / 2, `${B.name} could not come and look for ${M?.name ?? 'them'}`);
  addLog(world, A, 'social', `${B.name} could not come and look for ${M?.name ?? 'them'}. I will ask someone else, or go alone.`);
}

// ───────────────────────── the companion's walk (options_work.ts optCommitments) ─────────────────────────
/** Offered to somebody who has promised to go with a worrier: go and keep beside them. Not with a critical need or a danger believed about. */
export function fetchCommitmentOption(ctx: Ctx, c: Commitment): void {
  const { world, p } = ctx;
  const A = personOf(world, c.to), M = personOf(world, c.destId ?? 0);
  if (!hasFetching(world) || !A || !A.alive || !M || p.activity?.data.fetchWith !== undefined) return;
  const label = `Go with ${A.name} to look for ${M.name}`;
  if (ctx.criticals.length || ctx.dangers.length) {
    addBlocked(ctx, 'visit', label, A.id, 'has a need of their own or sees a danger', 'promise');
    return;
  }
  const s = ctx.seenPersons.find((x) => x.id === A.id);
  const loc = s ? { x: s.x, y: s.y } : whereIs(ctx, A.id, 0);
  if (!loc) {
    addBlocked(ctx, 'visit', label, A.id, 'does not know where they are', 'promise');
    return;
  }
  const e = eta(ctx, loc.x, loc.y);
  const sc = new Scorer().add(`promised ${A.name} to go with them to look for ${M.name}`, FETCH_JOIN_SCORE).add('walking', -pen(e));
  addOption(ctx, {
    kind: 'visit',
    label,
    goal: `to keep my promise to go with ${A.name} to look for ${M.name}`,
    need: null,
    util: sc.total,
    parts: sc.parts,
    eta: e + FETCH_TICKS,
    key: `fetchwith:${A.id}`,
    targetId: A.id,
    tag: 'promise',
    make: () => {
      const data: FetchWithData = { leader: A.id, for: M.id, commitmentId: c.id };
      return newActivity(world, p, {
        kind: 'visit',
        label: `Going with ${A.name} to look for ${M.name}`,
        goal: `to keep my promise to go with ${A.name} to look for ${M.name}`,
        targetId: A.id,
        targetType: 'person',
        tx: loc.x,
        ty: loc.y,
        spotX: loc.x,
        spotY: loc.y,
        utility: sc.total,
        minCommit: 60,
        maxTicks: Math.ceil(e) + FETCH_TICKS + 700,
        data: { fetchWith: data, items: {}, sticky: true },
      });
    },
  });
}

// ───────────────────────── the one found (options_social.ts socialOptions) ─────────────────────────
/** Offered to somebody who sees one of their own household come up and call them home: walk home with them. Their own choice: not with a critical need or a danger believed about. */
export function fetchedOption(ctx: Ctx): void {
  const { world, p } = ctx;
  if (!hasFetching(world) || ctx.criticals.length || ctx.dangers.length || p.activity?.data.fetchedBy !== undefined || p.activity?.data.fetchWith !== undefined) return;
  for (const s of ctx.seenPersons) {
    if (!s.fetching || hyp(s.x - p.x, s.y - p.y) > FETCH_FOUND_NEAR) continue;
    const A = personOf(world, s.id);
    if (!A || !A.alive || !(ctx.members.some((m) => m.id === A.id) || p.relations[A.id]?.kin)) continue;
    const d = A.activity?.data.fetch as FetchData | undefined;
    if (!d || d.for !== p.id || d.phase !== 'out') continue; // whom they have come for: they said it by name
    const e = eta(ctx, s.x, s.y);
    const sc = new Scorer().add(`${A.name} has come to take me home`, FETCH_HOME_SCORE).add('walking', -pen(e));
    addOption(ctx, {
      kind: 'visit',
      label: `Walk home with ${A.name}`,
      goal: `to walk home with ${A.name}`,
      need: null,
      util: sc.total,
      parts: sc.parts,
      eta: e + FETCH_TICKS,
      key: `fetched:${A.id}`,
      targetId: A.id,
      tag: 'care',
      make: () =>
        newActivity(world, p, {
          kind: 'visit',
          label: `Walking home with ${A.name}`,
          goal: `to walk home with ${A.name}`,
          targetId: A.id,
          targetType: 'person',
          tx: s.x,
          ty: s.y,
          spotX: s.x,
          spotY: s.y,
          utility: sc.total,
          minCommit: 60,
          maxTicks: Math.ceil(e) + FETCH_TICKS + 900,
          data: { fetchedBy: { leader: A.id, since: d.since } as FetchedByData, items: {}, sticky: true },
        }),
    });
    return;
  }
}

// ───────────────────────── the walk (welfare.ts visit handler) ─────────────────────────
const canSee = (w: World, p: Person, q: Person, within: number): boolean => q.alive && sameSpace(w, p, q) && hyp(q.x - p.x, q.y - p.y) <= Math.min(within, senseRadius(w, p));

/** the search under way that a follower follows, if it is still on: the worrier's own, or one they hold in a talk */
function searchOf(L: Person, v: FetchWithData | FetchedByData): FetchData | undefined {
  for (const a of [L.activity, L.suspended]) {
    const d = a?.data.fetch as FetchData | undefined;
    if (!d || d.done) continue;
    if ('commitmentId' in v ? d.for === v.for : d.since === v.since) return d;
  }
  return undefined;
}

/** a visit marked `fetch`, `fetchWith` or `fetchedBy` has reached the end of a walk (welfare.ts visit handler): the worrier looks round or is home; a follower stands by */
export function fetchBegin(world: World, p: Person, a: Activity): string | undefined {
  if (!hasFetching(world)) return 'it was not to be';
  const d = a.data.fetch as FetchData | undefined;
  if (!d) {
    a.data.run = false;
    a.duration = 1_000_000;
    return undefined;
  }
  const M = personOf(world, d.for);
  if (!M || !M.alive) return 'they are no longer around';
  if (d.phase === 'back') {
    concludeFetch(world, p, a, d);
    return undefined;
  }
  if (canSee(world, p, M, FETCH_FIND)) foundIt(world, p, a, d, M);
  else {
    d.looked = 0;
    a.duration = FETCH_LOOK;
    a.label = `Looking round for ${M.name}`;
  }
  return undefined;
}

function foundIt(world: World, p: Person, a: Activity, d: FetchData, M: Person): void {
  d.found = world.tick;
  a.progress = 0;
  a.duration = FETCH_GREET + FETCH_WAIT_FOR_THEM + 2;
  a.label = `Bringing ${M.name} home`;
  a.targetType = 'person';
  faceToward(p, M.x, M.y);
  say(world, p, saying(FETCH_FOUND_LINES, p.id, M.id, world.tick, { n: M.name }), 'happy', 100);
  M.nextThink = Math.min(M.nextThink, world.tick + 1); // they hear it, and look at what to do at once
  addLog(world, p, 'social', `Found ${M.name} out after dark and called them home.`);
}

/** the way home: the worrier sets out for the home door, with whoever follows (the one looked for is not chased any more) */
function headHome(world: World, p: Person, a: Activity, d: FetchData): void {
  d.phase = 'back';
  a.phase = 'travel';
  a.targetType = '';
  a.tx = a.spotX = d.home.x;
  a.ty = a.spotY = d.home.y;
  a.path = [];
  a.pi = 0;
  a.pathTries = 0; // so that the walk is planned again (stepTravel plans only when no try has been made)
  a.data.run = false;
}

function turnBack(world: World, p: Person, a: Activity, d: FetchData, M: Person, why: string): void {
  addLog(world, p, 'social', `Turned back from looking for ${M.name}: ${why}.`);
  delete p.whereabouts[M.id]; // the old place is forgotten, as the look-in forgets it
  a.label = `Going home from looking for ${M.name}`;
  headHome(world, p, a, d);
}

/** One tick of the worrier at the end of a walk (the visit handler's work), or of a follower beside them. */
export function fetchWork(world: World, p: Person, a: Activity): WorkResult {
  const d = a.data.fetch as FetchData | undefined;
  if (d) return leaderWork(world, p, a, d);
  const v = (a.data.fetchWith ?? a.data.fetchedBy) as FetchWithData | FetchedByData;
  return followWork(world, p, a, v);
}

function leaderWork(world: World, p: Person, a: Activity, d: FetchData): WorkResult {
  const M = personOf(world, d.for);
  if (!M || !M.alive) return 'partial:they are no longer around';
  if (d.phase === 'back') {
    concludeFetch(world, p, a, d);
    return 'done';
  }
  if (d.found === undefined) {
    // looking round at the place
    const s = p.seen.find((x) => x.id === M.id);
    if (s && hyp(s.x - p.x, s.y - p.y) > FETCH_FIND) {
      // seen further off: walk over
      a.tx = a.spotX = s.x;
      a.ty = a.spotY = s.y;
      a.phase = 'travel';
      a.path = [];
      a.pi = 0;
      a.pathTries = 0;
      return 'continue';
    }
    if (canSee(world, p, M, FETCH_FIND)) {
      foundIt(world, p, a, d, M);
      return 'continue';
    }
    d.looked = (d.looked ?? 0) + 1;
    p.heading += 0.1;
    if (d.looked >= FETCH_LOOK) turnBack(world, p, a, d, M, 'they were not there');
    return 'continue';
  }
  // found: the call, then the way home when they have set out with us
  faceToward(p, M.x, M.y);
  a.progress++;
  if (!d.fetched && M.activity?.data.fetchedBy?.leader === p.id) d.fetched = true; // we can see them come
  if (a.progress < FETCH_GREET) return 'continue';
  if (d.fetched) {
    a.label = `Bringing ${M.name} home`;
    headHome(world, p, a, d);
    return 'continue';
  }
  d.waited = (d.waited ?? 0) + 1;
  if (d.waited > FETCH_WAIT_FOR_THEM) turnBack(world, p, a, d, M, `${M.name} would not come`);
  return 'continue';
}

function followWork(world: World, p: Person, a: Activity, v: FetchWithData | FetchedByData): WorkResult {
  const L = personOf(world, v.leader);
  if (!L || !L.alive) return 'partial:they are gone';
  if (!sameSpace(world, p, L)) return 'partial:they went in without me';
  if (!searchOf(L, v)) {
    v.waited = (v.waited ?? 0) + 1;
    if (v.waited > FETCH_JOIN_WAIT) return 'partial:the search never set out';
  } else v.waited = 0;
  const d = hyp(L.x - p.x, L.y - p.y);
  if (d > FETCH_LOST) {
    v.lost = (v.lost ?? 0) + 1;
    if (v.lost >= FETCH_LOST_FOR) return 'partial:I lost them';
  } else v.lost = 0;
  faceToward(p, L.x, L.y);
  if (d > FETCH_TOGETHER - 0.4) {
    // they have gone on: follow, running if far behind
    a.tx = a.spotX = L.x;
    a.ty = a.spotY = L.y;
    a.phase = 'travel';
    a.path = [];
    a.pi = 0;
    a.pathTries = 0; // so that the walk is planned again (stepTravel plans only when no try has been made)
    a.data.run = d > FETCH_RUN_FROM;
    return 'continue';
  }
  a.data.run = false;
  return 'continue';
}

// ───────────────────────── the search settled ─────────────────────────
/** close a companion's promise and walk: kept (`done`: they went), or put by without blame (`moot` or `interrupted`) */
function closeCompanion(world: World, q: Person, A: Person, M: Person | null | undefined, how: 'done' | 'moot' | 'interrupted', why: string): void {
  const c = q.commitments.find((x) => x.status === 'active' && x.milestone === 'fetched' && x.to === A.id && x.destId === M?.id);
  if (c) {
    c.status = how;
    c.reason = why;
    if (how === 'done') c.contrib = Math.max(c.contrib ?? 0, 40);
    const r = world.requests.find((x) => x.id === c.requestId);
    if (r && r.status === 'promised') settle(world, r, how === 'done' ? 'fulfilled' : how === 'interrupted' ? 'interrupted' : 'cancelled', why);
  }
  const v = q.activity?.data.fetchWith as FetchWithData | undefined;
  if (v && !v.done) {
    v.done = true;
    endActivity(world, q, how === 'done' ? 'success' : 'partial', why);
  } else if (q.suspended?.data.fetchWith) q.suspended = null;
}

/** the one found stops following when the search is over */
function releaseFound(world: World, M: Person | null | undefined, A: Person, why: string): void {
  if (!M || M.activity?.data.fetchedBy?.leader !== A.id) return;
  endActivity(world, M, 'success', why);
}

/**
 * The worrier is home with whoever came (or back without them): the line, the thoughts, the promises kept by having gone, everybody's walk ended. Called from fetchTick the
 * moment they are within FETCH_HOME_NEAR of home, or on reaching the door.
 */
function concludeFetch(world: World, p: Person, a: Activity, d: FetchData): void {
  if (d.done) return;
  d.done = true;
  const M = personOf(world, d.for);
  const beside = (q: Person | null | undefined): q is Person => !!q && q.alive && sameSpace(world, p, q) && hyp(q.x - p.x, q.y - p.y) <= FETCH_BESIDE;
  const party = d.party.map((id) => personOf(world, id)).filter((q): q is Person => !!q && q.alive && q.activity?.data.fetchWith?.leader === p.id);
  const withUs = party.filter(beside);
  const brought = !!d.fetched && beside(M);
  const names = [p.name, ...withUs.map((q) => q.name)];
  if (M && withUs.length) {
    addEvent(world, 'social', brought ? `${listNames(names)} went out after dark and brought ${M.name} home.` : `${listNames(names)} went out after dark looking for ${M.name} and came back without them.`, [p.id, ...withUs.map((q) => q.id), M.id], p.x, p.y);
  }
  if (M && brought) {
    think(world, M, 'fetched_home', FETCH_GLAD, FETCH_GLAD_FOR, `${listNames(names)} came out after dark and brought me home`);
    adjustRel(M, p.id, world.tick, { aff: FETCH_AFFINITY, trust: FETCH_TRUST, note: `${p.name} came out after dark and brought me home` });
    for (const q of withUs) adjustRel(M, q.id, world.tick, { aff: FETCH_COMPANION_AFFINITY, note: `${q.name} came out after dark with ${p.name} and brought me home` });
    addLog(world, M, 'social', `${listNames(names)} came out after dark and brought me home.`);
    addLog(world, p, 'social', `Brought ${M.name} home after dark${withUs.length ? ` with ${listNames(withUs.map((q) => q.name))}` : ''}.`);
    p.concerns = p.concerns.filter((c) => c.about !== M.id);
    p.cooldowns['check' + M.id] = world.tick + 2 * Math.round(DAY * 0.6);
  } else if (M) {
    addLog(world, p, 'social', `Came back from looking for ${M.name} after dark without them.`);
    p.concerns = p.concerns.filter((c) => c.about !== M.id);
    p.cooldowns['check' + M.id] = world.tick + Math.round(DAY * 0.3);
  }
  for (const q of party) {
    addLog(world, q, 'social', brought ? `Went with ${p.name} after dark and we brought ${M!.name} home.` : `Went with ${p.name} after dark to look for ${M?.name ?? 'them'}.`);
    if (withUs.includes(q) && brought) adjustRel(p, q.id, world.tick, { aff: FETCH_COMPANION_AFFINITY, trust: 1 });
    closeCompanion(world, q, p, M, 'done', 'went with them to look');
  }
  releaseFound(world, M, p, 'home');
  if (p.activity === a) endActivity(world, p, 'success', brought ? 'brought them home' : 'came back without them');
}

/** nothing is written, nobody is blamed: the one looked for is home by themselves, or the search cannot go on */
function endQuietly(world: World, p: Person, a: Activity, d: FetchData, why: string): void {
  if (d.done) return;
  d.done = true;
  const M = personOf(world, d.for);
  for (const id of d.party) {
    const q = personOf(world, id);
    if (q) closeCompanion(world, q, p, M, 'moot', why);
  }
  releaseFound(world, M, p, why);
  if (M) {
    p.concerns = p.concerns.filter((c) => c.about !== M.id);
    p.cooldowns['check' + M.id] = world.tick + Math.round(DAY * 0.3);
  }
  addLog(world, p, 'social', `${M?.name ?? 'The one I went to look for'} ${why}.`);
  if (p.activity === a) endActivity(world, p, 'success', why);
}

// ───────────────────────── the monitor (perception.ts, every third tick) ─────────────────────────
/**
 * Everything about a search that is not one person's own step: the worrier's limits and arrival, the party's membership, a companion's promise that was never taken up. Called from
 * perceive for each person, every third tick, before they look about them (the last sight is at most that old).
 */
export function fetchTick(world: World, p: Person): void {
  if (!hasFetching(world)) return;
  const a = p.activity;
  const d = a && a.kind === 'visit' ? (a.data.fetch as FetchData | undefined) : undefined;
  if (a && d && !d.done) leadTick(world, p, a, d);
  if (p.commitments.length) lapseStale(world, p);
}

function leadTick(world: World, p: Person, a: Activity, d: FetchData): void {
  const M = personOf(world, d.for);
  if (!M || !M.alive) { endQuietly(world, p, a, d, 'could not be found'); return; }
  // the party: those who are still with them
  const stay = d.party.filter((id) => {
    const q = personOf(world, id);
    if (!q || !q.alive) return false;
    if (q.activity?.data.fetchWith?.leader === p.id || q.suspended?.data.fetchWith?.leader === p.id) return true;
    // somebody who promised to come has a little while to set out after the worrier does, if their promise still stands
    return world.tick - d.since < FETCH_JOIN_GRACE && q.commitments.some((c) => c.status === 'active' && c.milestone === 'fetched' && c.to === p.id && c.destId === d.for);
  });
  if (stay.length !== d.party.length) {
    for (const id of d.party) if (!stay.includes(id)) {
      const q = personOf(world, id);
      if (q) closeCompanion(world, q, p, M, 'moot', 'could not keep with them');
    }
    d.party = stay;
  }
  // the one looked for is home already, by themselves: nothing more to do and nothing to write
  if (d.found === undefined) {
    const s = p.seen.find((x) => x.id === M.id);
    if (s && hyp(s.x - d.home.x, s.y - d.home.y) <= FETCH_HOME_NEAR) { endQuietly(world, p, a, d, 'was home already'); return; }
  }
  if (d.phase === 'out' && d.found === undefined && (world.tick - d.since >= FETCH_TICKS || hyp(p.x - d.home.x, p.y - d.home.y) > FETCH_RANGE + 2)) {
    turnBack(world, p, a, d, M, 'it had gone on long enough');
    return;
  }
  if (d.phase === 'back' && hyp(p.x - d.home.x, p.y - d.home.y) <= FETCH_HOME_NEAR) concludeFetch(world, p, a, d);
}

/** a promise to go that was made and never taken up (the worrier never set out) lapses, with nobody to blame */
function lapseStale(world: World, p: Person): void {
  for (const c of p.commitments) {
    if (c.status !== 'active' || c.milestone !== 'fetched' || world.tick - c.made < FETCH_PROMISE_LIFE) continue;
    if (p.activity?.data.fetchWith?.commitmentId === c.id) continue;
    c.status = 'moot';
    c.reason = 'the search never set out';
    const r = world.requests.find((x) => x.id === c.requestId);
    if (r && r.status === 'promised') settle(world, r, 'cancelled', c.reason);
  }
}

// ───────────────────────── a walk ended (the visit handler's onEnd) ─────────────────────────
/** However a walk ended: if it ended before the search was settled the promises are closed without blame and the others released. */
export function fetchEnd(world: World, p: Person, a: Activity, outcome: string, detail: string): void {
  const d = a.data.fetch as FetchData | undefined;
  if (d) {
    if (d.done) return;
    d.done = true;
    const M = personOf(world, d.for);
    if (outcome !== 'failed') addLog(world, p, 'social', `Gave up looking for ${M?.name ?? 'them'} after dark: ${detail}.`);
    for (const id of d.party) {
      const q = personOf(world, id);
      if (q) closeCompanion(world, q, p, M, 'moot', `${p.name} had to stop looking`);
    }
    releaseFound(world, M, p, `${p.name} had to stop`);
    return;
  }
  const v = a.data.fetchWith as FetchWithData | undefined;
  if (v) {
    if (v.done) return;
    v.done = true;
    const A = personOf(world, v.leader), M = personOf(world, v.for);
    const c = p.commitments.find((x) => x.status === 'active' && x.id === v.commitmentId);
    if (c) {
      c.status = outcome === 'interrupted' ? 'interrupted' : 'moot';
      c.reason = detail;
      const r = world.requests.find((x) => x.id === c.requestId);
      if (r && r.status === 'promised') settle(world, r, outcome === 'interrupted' ? 'interrupted' : 'cancelled', detail);
    }
    addLog(world, p, 'social', `Went with ${A?.name ?? 'them'} to look for ${M?.name ?? 'someone'}, but ${detail}.`);
  }
}

// ───────────────────────── saved state ─────────────────────────
/** What a save may hold of this (rules 264, rich only); anything else is refused on loading. */
export function validateFetching(w: World): void {
  const allowed = w.settings.dynamics === 'rich' && runsRulesVersion(w, TOGETHER_FROM);
  const int = (n: unknown, min: number, max: number): boolean => Number.isSafeInteger(n) && (n as number) >= min && (n as number) <= max;
  const num = (n: unknown): boolean => typeof n === 'number' && Number.isFinite(n);
  const ID = Number.MAX_SAFE_INTEGER;
  for (const p of w.persons) {
    for (const a of [p.activity, p.suspended]) {
      if (!a) continue;
      const d = a.data.fetch as FetchData | undefined;
      const v = a.data.fetchWith as FetchWithData | undefined;
      const u = a.data.fetchedBy as FetchedByData | undefined;
      if (d === undefined && v === undefined && u === undefined) continue;
      if (!allowed || a.kind !== 'visit' || [d, v, u].filter((x) => x !== undefined).length !== 1) throw new Error('Invalid fetching');
      if (d !== undefined) {
        if (!d || !int(d.for, 1, ID) || !int(d.since, 0, w.tick) || !d.home || !num(d.home.x) || !num(d.home.y) || !Array.isArray(d.party) || d.party.length > 1 || d.party.some((id) => !int(id, 1, ID)) || new Set(d.party).size !== d.party.length
          || (d.phase !== 'out' && d.phase !== 'back') || (d.looked !== undefined && !int(d.looked, 0, FETCH_LOOK)) || (d.found !== undefined && !int(d.found, d.since, w.tick))
          || (d.waited !== undefined && !int(d.waited, 0, FETCH_WAIT_FOR_THEM + 1)) || (d.fetched !== undefined && (d.fetched !== true || d.found === undefined)) || (d.done !== undefined && d.done !== true)) throw new Error('Invalid fetching search');
      }
      if (v !== undefined) {
        if (!v || !int(v.leader, 1, ID) || !int(v.for, 1, ID) || !int(v.commitmentId, 1, ID) || (v.waited !== undefined && !int(v.waited, 0, FETCH_JOIN_WAIT + 1)) || (v.lost !== undefined && !int(v.lost, 0, FETCH_LOST_FOR)) || (v.done !== undefined && v.done !== true)) throw new Error('Invalid fetching companion');
      }
      if (u !== undefined) {
        if (!u || !int(u.leader, 1, ID) || !int(u.since, 0, w.tick) || (u.waited !== undefined && !int(u.waited, 0, FETCH_JOIN_WAIT + 1)) || (u.lost !== undefined && !int(u.lost, 0, FETCH_LOST_FOR))) throw new Error('Invalid fetching walk home');
      }
    }
    for (const c of p.commitments) if (c.milestone === 'fetched' && (!allowed || c.kind !== 'work' || c.destKind !== 'person' || !int(c.destId, 1, ID))) throw new Error('Invalid fetching promise');
  }
  for (const r of w.requests) if (r.kind === 'fetch' && (!allowed || r.destKind !== 'person' || !int(r.destId, 1, ID))) throw new Error('Invalid fetching request');
  for (const c of w.conversations) if ((c.data as { reqKind?: string }).reqKind === 'fetch' && !allowed) throw new Error('Invalid fetching conversation');
}
