// DEFENCE AGAINST WOLVES (rules version 4, rich worlds only).
//
// One bounded behaviour. A spear is an ordinary tool - made from wood and stone at an ordinary workspace, carried in the
// pack, owned, worn by use and broken by it - and an adult who is holding one, is fit enough to use it, and can SEE a wolf
// close to themselves or to somebody else they can see, may go and drive it off.
//
// WHAT A DEFENCE IS NOT. It is not a fight: the wolf is never hurt and never dies here, there is no weapon damage, no
// armour, no patrol, no den raid and no pack. It is not a guarantee: an attempt can fail, and a defender standing two
// tiles from a wolf that has not been driven off is a person a wolf can bite, by the ordinary rules in wildlife.ts and
// through no special case written here. And it is not an aura: nothing is protected by the spear existing. Somebody has to
// notice, decide, walk there, and try.
//
// WHAT THE DEFENDER MAY USE TO DECIDE. Only what they can see now: `p.seen`, which perception refreshes, for both the wolf
// and the person in danger. A remembered wolf (a `danger` belief) is a reason to WANT a spear - it is how somebody learns
// the country has wolves in it - but never a thing to attack, because it is a memory of where a wolf was. A spear in a
// store is not a spear in your hand, and `bestOf` only ever returns one whose holder is the person themselves.
//
// HOW IT RESOLVES. Like a hunt (hunting.ts, the house precedent for closing with an animal): walk until within reach,
// face it, spend real ticks on the attempt, and settle it with a hash of the seed, the pair and the tick - no draw from
// the world's stream, so a replay is exact. On success the wolf breaks off and retreats, and remembers to leave that
// person alone for a while, so it cannot turn round and come straight back. On failure it is still there.
//
// In an authored world, in an unversioned one, and in versions 1 through 3, nothing here does anything: `defendsWolves` is
// false, no spear is ever wanted or made, and no option is ever offered.
import { faceToward, newActivity, registerHandler } from './activities';
import type { WorkResult } from './activities';
import { DAY } from './constants';
import { addEvent, addFx, addLog } from './events';
import { isRich, think } from './mood';
import { Scorer, addOption, pen } from './optutil';
import type { Ctx } from './optutil';
import { stageOf } from './people';
import { hashString, hashUnit } from './rng';
import { runsRulesVersion } from './rulesversion';
import { indoorHome } from './habitation';
import { dullness, toolOf, wearTool } from './tools';
import type { Animal, Person, Tool, World } from './types';
import { hyp } from './util';
import { isThreat, setFacingCheck, setWaryCheck } from './wildlife';

/** the rules version at which wolf defence starts; nothing here applies to a world below it */
export const DEFENCE_FROM_VERSION = 4;

/** within this distance of the wolf the attempt can be made; it is a spear's length and a step, not a punch */
export const REACH = 2.2;
/** past this the wolf has got away and the defender stops rather than chasing it across the map */
export const GIVE_UP = 9;
/**
 * A wolf this close to somebody is threatening them, as anyone watching would say. It is deliberately just under
 * COME_FROM, which leaves a narrow band - between THREAT_NEAR and COME_FROM of the defender - in which the person in
 * danger is somebody else rather than the defender. That band is narrow on purpose: measured, a longer approach almost
 * always ends with the wolf breaking off before the defender arrives, because the defender walking up makes two people
 * near it and the village's OLD group-proximity rule (wildlife.ts `scared`) takes it from there. Widening this does not
 * produce more rescues, only more walks that come to nothing. At 4 a ten-day probe resolved one attempt; at 5.5, three.
 */
export const THREAT_NEAR = 5.5;
/**
 * How far off a threat may be and still be worth walking to. It is the sense radius and no further, because a defence
 * answers what somebody can SEE; and it is kept short for a second reason, measured rather than assumed: the longer the
 * walk, the likelier the wolf has broken off before the defender arrives (very often because the defender approaching
 * makes two people near it, which is the village's old group-proximity protection). At 14 every attempt in a ten-day
 * probe ended with the wolf already going; at 6 they resolve.
 */
export const COME_FROM = 6;
/**
 * Ticks of actual jabbing before it is settled either way. Short, and measured rather than chosen: a wolf closes the
 * last tile in about seven ticks and bites at 1.2, so a longer attempt simply means the wolf gets there first and the
 * defence never resolves at all. At 34 every one of forty staged encounters ended with the defender bitten before she
 * could try.
 */
export const ATTEMPT_TICKS = 10;
/** ticks of wear a spear takes from one attempt, win or lose (TOOL_DEFS.spear.wear a tick) */
export const WEAR_TICKS = 40;
/** how long a driven-off wolf keeps away from the person it was driven off: a quarter of a day */
export const WARY_TICKS = 620;
/** after an attempt, win or lose, this person does not immediately try again on the same wolf */
export const RETRY_COOLDOWN = 160;

/**
 * Nobody defends below this: too hurt, too tired, or a spear so worn it is a stick.
 *
 * `MAX_WEAR` is why a defending spear RETIRES rather than snaps. An attempt costs WEAR_TICKS x TOOL_DEFS.spear.wear,
 * about 3.6, so a spear is good for roughly twenty-five defences and then passes this line - at which point nobody will
 * face a wolf with it and it is simply dead weight until it is dropped. `wearTool` would break it at 100, and still
 * will if something else ever wears one, but defending alone cannot take it that far. That is deliberate: the
 * consequence of hard use is having to make another, which costs wood, stone and a morning, not a splinter in the hand.
 */
export const MIN_HEALTH = 35;
export const MIN_ENERGY = 20;
export const MAX_WEAR = 92;

/**
 * The lab switch, beside the world like the others: module-level, never saved, never hashed, on unless the lab turns it
 * off. With it off nobody takes the defensive ACTION; spears can still be made and carried, which is what makes
 * `rich-no-defence` an ablation of the defence rather than of the whole feature. See docs/RICH_WORLD.md.
 */
let defence = true;
export function setWolfDefence(on: boolean): void {
  defence = on;
}
export const wolfDefenceOn = (): boolean => defence;

/** Does this world have spears in it at all? Rich, and at least version 4. The lab switch does NOT turn this off. */
export const makesSpears = (world: World): boolean => isRich(world) && runsRulesVersion(world, DEFENCE_FROM_VERSION);
/** Does this world run the defensive action? Everything above, and not switched off by the lab. */
export const defendsWolves = (world: World): boolean => defence && makesSpears(world);

const key = (world: World): number => hashString(world.seed) ^ 0x5bea;
/**
 * Which way an attempt goes: a hash of the seed, this pair and this tick, never a draw from the world's stream, so a
 * replay is exact and the lab's nudge still tells chance from cause. The one place the outcome is decided.
 */
const wouldDrive = (world: World, p: Person, a: Animal, chance: number): boolean => hashUnit(key(world), p.id * 31 + a.id, world.tick) < chance;

/** The spear in this person's own hands, if they have one fit to use. Not one in a store, and not one worn to a stick. */
export function spearOf(world: World, p: Person): Tool | null {
  const t = toolOf(world, p, 'spear');
  if (!t || t.wear >= MAX_WEAR) return null;
  return t;
}

export interface Unfit {
  why: string;
}

/**
 * Could this person defend anybody at all, leaving aside whether there is anything to defend against? Returns null when
 * they could, or the reason they could not, in their own terms, so the inspector can say why no defence was on offer.
 *
 * A child never defends. Neither does somebody with no spear in hand, too hurt, too tired, carrying an injury or in the
 * grip of a fever.
 */
export function unfitToDefend(ctx: Ctx): Unfit | null {
  return unfitPerson(ctx.world, ctx.p);
}

/** The same question of a bare person, for the activity handler, which has no option context. */
export function unfitPerson(world: World, p: Person): Unfit | null {
  if (!defendsWolves(world)) return { why: 'this world has no such thing' };
  if (indoorHome(world, p)) return { why: 'inside a home, away from the wolf' };
  if (stageOf(world, p) === 'child') return { why: 'a child does not face a wolf' };
  if (!spearOf(world, p)) return { why: (p.inv.spear ?? 0) > 0 ? 'their spear is worn past use' : 'nothing to face it with' };
  if (p.health < MIN_HEALTH) return { why: 'too badly hurt to face it' };
  if (p.needs.energy < MIN_ENERGY) return { why: 'too worn out to face it' };
  if (p.injury) return { why: 'an injury that would not bear it' };
  if (p.illness && p.illness.severity > 0.5) return { why: 'too ill to face it' };
  return null;
}

/** A wolf this person can see right now, with where they can see it. Never a remembered one. */
function seenWolves(ctx: Ctx): { a: Animal; x: number; y: number }[] {
  const { world, p } = ctx;
  const out: { a: Animal; x: number; y: number }[] = [];
  for (const s of p.seen) {
    if (!isThreat(world, s)) continue;
    const a = world.byId.get(s.id);
    if (!a || a.ent !== 'animal' || a.type === 'deer' || a.health <= 0) continue;
    if (a.state === 'retreat') continue; // already going; there is nothing to drive off
    out.push({ a, x: s.x, y: s.y });
  }
  return out;
}

/**
 * Who this wolf is threatening, as far as THIS person can see: themselves, or somebody they can currently see who is
 * nearer the wolf than is comfortable. Returns null when nobody visible is in danger from it.
 *
 * Judged on what is in plain sight - two positions and a distance - and never on the wolf's own `targetId`, which is the
 * animal's private intent and nothing a bystander could read.
 */
export function threatened(ctx: Ctx, w: { a: Animal; x: number; y: number }): { who: Person | null; name: string; d: number } | null {
  const { world, p } = ctx;
  const dMe = hyp(w.x - p.x, w.y - p.y);
  if (dMe <= THREAT_NEAR) return { who: null, name: 'themselves', d: dMe };
  let best: { who: Person; d: number } | null = null;
  for (const s of ctx.seenPersons) {
    const d = hyp(w.x - s.x, w.y - s.y);
    if (d > THREAT_NEAR) continue;
    const q = world.byId.get(s.id);
    if (!q || q.ent !== 'person' || !q.alive || indoorHome(world, q)) continue;
    if (!best || d < best.d) best = { who: q, d };
  }
  return best ? { who: best.who, name: best.who.name, d: best.d } : null;
}

/** How likely this attempt is to drive the wolf off. Seeded and bounded; a spear is never a certainty. */
export function driveChance(world: World, p: Person, spear: Tool, helpers: number): number {
  const base = 0.34;
  const skill = 0.1 * (p.skills.forage - 1);
  const fit = 0.12 * (p.health / 100 - 0.5) + 0.08 * (p.needs.energy / 100 - 0.5);
  const together = 0.13 * Math.min(2, helpers);
  const blunt = 0.2 * dullness(spear.wear);
  return Math.max(0.15, Math.min(0.82, base + skill + fit + together - blunt));
}

/** other grown people on their feet near the defender at the moment of the attempt: a wolf minds a crowd */
function helpersNear(world: World, p: Person): number {
  let n = 0;
  for (const q of world.persons) {
    if (q === p || !q.alive || q.pose === 'sleep' || indoorHome(world, q)) continue;
    if (stageOf(world, q) === 'child') continue;
    if (hyp(q.x - p.x, q.y - p.y) <= 6) n++;
  }
  return n;
}

// ───────────────────────── the option ─────────────────────────

export function defenceOptions(ctx: Ctx): void {
  const { world, p } = ctx;
  if (!defendsWolves(world)) return;
  const unfit = unfitToDefend(ctx);
  if (unfit) return;
  const spear = spearOf(world, p)!;
  for (const w of seenWolves(ctx)) {
    const d = hyp(w.x - p.x, w.y - p.y);
    if (d > COME_FROM) continue;
    if ((p.cooldowns['defend:' + w.a.id] ?? 0) > world.tick) continue;
    const t = threatened(ctx, w);
    if (!t) continue;
    const helpers = helpersNear(world, p);
    // How this is weighed against RUNNING, which is the only other answer to the same situation. Fleeing scores
    // 92 + 38 x (how close) x caution (options_survival.ts optFlee), so it rises with how timid somebody is. Standing
    // has to fall with the same trait, or every village would be either all heroes or all runners. A bold person with a
    // sound spear beats their own flee score; a timid one does not, and runs, which is the point: the spear gives them
    // the CHOICE, and who they are decides it.
    const sc = new Scorer();
    sc.add(t.who ? `a wolf on ${t.name}` : 'a wolf on me', t.who ? 78 : 86);
    sc.add('not one to run', 44 * (1 - p.traits.caution));
    if (t.who) sc.add('would not leave them to it', 26 * p.traits.generosity);
    // past a point running is the worse answer: nobody outruns a wolf that is already at their heels
    if (t.d < 3) sc.add('too close to turn my back on', 20 * (1 - t.d / 3));
    sc.add(`spear in hand (worn ${Math.round(spear.wear)})`, 10 - 10 * dullness(spear.wear));
    if (helpers > 0) sc.add(helpers > 1 ? 'others at hand' : 'someone at hand', 4 + 3 * Math.min(2, helpers));
    if (p.health < 70) sc.add('hurt already', -14 * (1 - p.health / 70));
    sc.add('walking', -pen((d * 1.18) / Math.max(0.03, ctx.speed)) * 0.5);
    if (sc.total <= 0) continue;
    noteOffered(t.who !== null);
    addOption(ctx, {
      kind: 'defend',
      label: t.who ? `Drive the wolf off ${t.name}` : 'Drive the wolf off',
      goal: t.who ? `to get the wolf away from ${t.name}` : 'to get the wolf away from me',
      need: 'safety',
      util: sc.total,
      parts: sc.parts,
      eta: (d * 1.18) / Math.max(0.03, ctx.speed) + ATTEMPT_TICKS,
      key: `defend:${w.a.id}`,
      targetId: w.a.id,
      tag: 'danger',
      make: () =>
        newActivity(world, p, {
          kind: 'defend',
          label: t.who ? `Driving a wolf off ${t.name}` : 'Driving a wolf off',
          goal: t.who ? `to get the wolf away from ${t.name}` : 'to get the wolf away from me',
          need: 'safety',
          targetId: w.a.id,
          targetType: 'animal',
          tx: w.x,
          ty: w.y,
          // Stand where you are and face it. The spot is the defender's OWN place, not the wolf's, so the activity
          // enters its working phase at once and the handler below decides whether to wait or to follow. Walking to
          // where a wolf WAS is how every one of forty staged encounters ended with the defender bitten in transit:
          // the two close on each other, she arrives at an empty patch of grass, and it has already bitten and gone.
          spotX: p.x,
          spotY: p.y,
          utility: sc.total,
          // The walk is the attempt. `minCommit` 30 let the ordinary "something better came up" rule take people off
          // the moment they set out, so most attempts never reached the wolf; 120 covers the walk and the jabbing, and
          // `maxTicks` still ends it. Danger and a deadlier need interrupt regardless of this (decision.ts).
          minCommit: 120,
          maxTicks: 420,
          data: { forWhom: t.who ? t.who.id : 0, forName: t.name, tries: 0 },
        }),
    });
    break; // one wolf at a time
  }
}

// ───────────────────────── the attempt ─────────────────────────

/** The wolf breaks off and goes, and keeps away from this person for a while. Nothing is hurt and nothing dies. */
export function driveOff(world: World, a: Animal, p: Person): void {
  a.state = 'retreat';
  a.targetId = 0;
  a.until = world.tick + WARY_TICKS;
  a.cooldown = Math.max(a.cooldown, 40);
  a.path = [];
  a.pi = 0;
  // a memory of its own, so that when the retreat ends it does not simply fix on the same person again. Absent on every
  // wolf that was never driven off, so an older world's animals carry nothing new (world.ts hashWorld adds it only when set).
  a.wary = world.tick + WARY_TICKS;
  a.waryOf = p.id;
}

/** Is this wolf keeping clear of that person? Read by `pickPrey`, which is the one place a wolf chooses somebody. */
export const waryOf = (world: World, a: Animal, p: Person): boolean => a.wary !== undefined && a.wary > world.tick && a.waryOf === p.id;

/**
 * Is this person squared up to THIS wolf right now - spear in hand, attempt under way, within reach? A wolf hesitates
 * rather than taking its free bite while that is true (wildlife.ts `setFacingCheck`), for at most the length of one
 * attempt. It is deliberately narrow: the activity must be a defence, it must be AGAINST this animal, it must have
 * reached the working phase rather than still be walking, and there must still be a usable spear in hand.
 */
export function facingWolf(world: World, a: Animal, p: Person): boolean {
  if (unfitPerson(world, p) || hyp(a.x - p.x, a.y - p.y) > REACH) return false;
  const act = p.activity;
  if (!act || act.kind !== 'defend' || act.targetId !== a.id || act.phase !== 'work') return false;
  return spearOf(world, p) !== null;
}

// wildlife.ts asks these when a wolf chooses somebody and when it would bite; they are registered rather than
// imported, because that module is loaded far earlier than this one (see `setWaryCheck` there)
setWaryCheck(waryOf);
setFacingCheck(facingWolf);

function resolve(world: World, p: Person, a: Animal, act: { data: Record<string, any> }): WorkResult {
  const spear = spearOf(world, p);
  if (!spear) return 'fail:nothing to face it with';
  const helpers = helpersNear(world, p);
  const chance = driveChance(world, p, spear, helpers);
  act.data.tries++;
  noteAttempt(((act.data.forWhom as number) ?? 0) !== 0);
  const forName = (act.data.forName as string) ?? 'themselves';
  const forWhom = (act.data.forWhom as number) ?? 0;
  // the attempt is work, and work wears a tool, whichever way it goes
  wearTool(world, spear, WEAR_TICKS);
  p.cooldowns['defend:' + a.id] = world.tick + RETRY_COOLDOWN;
  // past MAX_WEAR it is no longer something anybody will face a wolf with: retired by this attempt, not snapped
  const retired = (p.inv.spear ?? 0) === 0 || spear.wear >= MAX_WEAR;
  const won = wouldDrive(world, p, a, chance);
  noteOutcome(won, retired);
  if (!won) {
    addFx(world, 'splash', a.x, a.y, 0);
    addLog(world, p, 'danger', `Went at the wolf with my spear and it would not give ground${forWhom ? ` (${forName} is still in its way)` : ''}.`);
    return 'fail:it would not give ground';
  }
  driveOff(world, a, p);
  p.skills.forage = Math.min(1.8, p.skills.forage + 0.008);
  addFx(world, 'bite', a.x, a.y, 0);
  const whom = forWhom && forWhom !== p.id ? ` away from ${forName}` : '';
  addEvent(world, 'danger', `${p.name} drove a wolf off${whom} with a spear.`, forWhom && forWhom !== p.id ? [p.id, forWhom] : [p.id], p.x, p.y);
  addLog(world, p, 'danger', `Drove a wolf off${whom} with my spear.`);
  think(world, p, 'drove_off', 6, DAY, `drove a wolf off${whom}`);
  if (forWhom && forWhom !== p.id) {
    const q = world.byId.get(forWhom);
    if (q && q.ent === 'person' && q.alive) {
      addLog(world, q, 'danger', `${p.name} drove the wolf off me.`);
      think(world, q, 'rescued', 8, DAY, `${p.name} drove a wolf off me`);
    }
  }
  return 'done';
}

registerHandler('defend', {
  availability: 0.2,
  pose: () => 'pick',
  begin(world, p, a) {
    const wolf = world.byId.get(a.targetId);
    if (!wolf || wolf.ent !== 'animal' || wolf.health <= 0) return 'it is gone';
    if (!defendsWolves(world)) return 'this world has no such thing';
    const unfit = unfitPerson(world, p);
    if (unfit) return unfit.why;
    // `begin` runs again every time the attempt re-approaches a wolf that moved, so setting out is counted once
    if (!a.data.setOut) {
      a.data.setOut = true;
      noteSetOut();
    }
    a.duration = ATTEMPT_TICKS;
  },
  work(world, p, a): WorkResult {
    // the lab switched it off under an attempt that was already running: it ends rather than carrying on invisibly
    if (!defendsWolves(world)) return 'fail:this world has no such thing';
    const unfit = unfitPerson(world, p);
    if (unfit) return `fail:${unfit.why}`;
    const wolf = world.byId.get(a.targetId);
    if (!wolf || wolf.ent !== 'animal' || wolf.health <= 0) return 'fail:it is gone';
    if (!spearOf(world, p)) return 'fail:nothing to face it with';
    if (p.health < MIN_HEALTH) return 'fail:too badly hurt to go on';
    // It is leaving of its own accord - very often because the defender walking up makes two people near it, which is
    // the village's OLD protection (wildlife.ts `scared`), not this one. That ends the attempt, but it is neither a
    // success of theirs nor a failure: `partial` says so, and nothing is credited or announced.
    if (wolf.state === 'retreat') {
      noteLeftOnItsOwn();
      return 'partial:it was already going';
    }
    // the person they came to help is no longer in danger from it, or is no longer there
    const forWhom = (a.data.forWhom as number) ?? 0;
    if (forWhom && forWhom !== p.id) {
      const q = world.byId.get(forWhom);
      if (!q || q.ent !== 'person' || !q.alive) return 'fail:there is nobody left to stand in front of';
      if (indoorHome(world, q)) return 'partial:they reached shelter';
      if (hyp(wolf.x - q.x, wolf.y - q.y) > THREAT_NEAR * 1.6) return 'partial:the wolf had left them';
    }
    const d = hyp(wolf.x - p.x, wolf.y - p.y);
    faceToward(p, wolf.x, wolf.y);
    if (d > REACH) {
      const prev = a.data.lastDist as number | undefined;
      a.data.lastDist = d;
      // It is coming to her. Standing still IS the action - walking out to meet a wolf that is already on its way only
      // means meeting it half-way, in the open, mid-stride. She waits, facing it, and the attempt begins when it
      // arrives. A wolf will not simply stand off: it is stalking somebody, so this ends one way or the other.
      // Take a second observation before deciding it is stationary. Otherwise the first tick
      // starts a walk even when the wolf is closing, before there is a distance to compare.
      if (d <= COME_FROM && (prev === undefined || d < prev - 1e-6)) return 'continue';
      // it is not coming: follow it as far as is reasonable, and no further
      if (d > GIVE_UP || (a.data.tries as number) >= 2) {
        p.cooldowns['defend:' + wolf.id] = world.tick + RETRY_COOLDOWN;
        return 'fail:it kept out of reach';
      }
      a.tx = wolf.x;
      a.ty = wolf.y;
      a.spotX = wolf.x;
      a.spotY = wolf.y;
      a.phase = 'travel';
      a.path = [];
      a.pi = 0;
      // A new approach needs an initial path; the prior stand-in-place travel already used its try.
      a.pathTries = 0;
      return 'continue';
    }
    a.progress++;
    if (a.progress < a.duration) return 'continue';
    a.progress = 0;
    return resolve(world, p, wolf, a);
  },
});

// ───────────────────────── observation (never saved, never hashed) ─────────────────────────
//
// The conventions of probe.ts, transmission.ts and provision.ts: module-level, off by default, no part of `World`, a save
// or the state hash; no randomness, no clock, no log, no event and no decision.

/**
 * What really happened, kept apart stage by stage, because the whole point of this feature is that an intention is not
 * an outcome. `offered` is a chance to act, `setOut` is somebody walking, `attempts` is somebody within reach having a
 * go, and only `droveOff` is a wolf actually driven off. `leftOnItsOwn` is the case that would be easiest to pass off
 * as a success and is not one: the wolf broke off before the attempt, very often because the defender walking up made
 * two people near it, which is the village's OLD group-proximity protection (wildlife.ts `scared`) and not this.
 */
export interface DefenceCounters {
  /** spears actually made */
  spearsMade: number;
  /** defences put on the table, and how many were for somebody else */
  offered: number;
  offeredForOthers: number;
  /** times somebody actually set off to do it */
  setOut: number;
  /** attempts that reached the wolf and were resolved, and how many were for somebody else */
  attempts: number;
  forOthers: number;
  /** resolved attempts that drove the wolf off, and that did not */
  droveOff: number;
  failed: number;
  /** ended because the wolf was already going: NOT a defence working */
  leftOnItsOwn: number;
  /** spears worn past use by defending: retired, not snapped (see MAX_WEAR) */
  spearsRetired: number;
}

const zeroDef = (): DefenceCounters => ({ spearsMade: 0, offered: 0, offeredForOthers: 0, setOut: 0, attempts: 0, forOthers: 0, droveOff: 0, failed: 0, leftOnItsOwn: 0, spearsRetired: 0 });

export const defProbe: DefenceCounters & { on: boolean } = { on: false, ...zeroDef() };

export function defReset(): void {
  Object.assign(defProbe, zeroDef());
}

export function defSnapshot(): DefenceCounters {
  const { on: _on, ...rest } = defProbe;
  void _on;
  return { ...rest };
}

export function noteSpearMade(): void {
  if (defProbe.on) defProbe.spearsMade++;
}

/** somebody set off; counted once for the activity, not once per arrival, because an attempt may re-approach */
export function noteSetOut(): void {
  if (defProbe.on) defProbe.setOut++;
}

/** somebody within reach actually had a go */
export function noteAttempt(forOther: boolean): void {
  if (!defProbe.on) return;
  defProbe.attempts++;
  if (forOther) defProbe.forOthers++;
}

/** it broke off before the attempt: the old protection, not this one */
export function noteLeftOnItsOwn(): void {
  if (defProbe.on) defProbe.leftOnItsOwn++;
}

/** an option was put on the table; whether it was taken is the ranking's business */
export function noteOffered(forOther: boolean): void {
  if (!defProbe.on) return;
  defProbe.offered++;
  if (forOther) defProbe.offeredForOthers++;
}

export function noteOutcome(won: boolean, retired: boolean): void {
  if (!defProbe.on) return;
  if (won) defProbe.droveOff++;
  else defProbe.failed++;
  if (retired) defProbe.spearsRetired++;
}
