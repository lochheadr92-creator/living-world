// Which animation a person is drawn with. Presentation only.
//
// The simulation says little about how a person looks: each activity's handler names one of about 28 poses, and many
// activities share a generic one ("stand", "sit", "craft", "pick", "store"). What the person is really doing is on their
// own record: the activity's kind, its phase and its data, the conversation they are in, what they are saying, their fever,
// injury, pregnancy and bereavement. This file reads that record, and nothing else changes: `p.pose` is what it always was,
// no value is added to PoseKind and nothing under src/sim is touched, so saved worlds and the recorded references are as
// they were. Everything here is read-only and draws no random number.
//
// The rule: an animation is chosen only from state the record holds. Where the record cannot tell two things apart, they
// are drawn alike (and `docs/CHARACTER_ANIMATIONS.md` says which).
import { ageYears } from '../sim/people';
import type { Conversation, Person, PoseKind, World } from '../sim/types';
import { workAnimOf } from './anim_work'; // work (H)
import type { WorkAnimId } from './anim_work'; // work (H)
// walking (G)
import type { Activity } from '../sim/types';
import { LITTLE_AGE } from '../sim/child_pace';
import { weightOf } from '../sim/economy';
import { hasRods } from '../sim/fishing_rods';
import { carryCap, stageOf } from '../sim/people';

export type AnimId =
  | PoseKind
  | WorkAnimId // work (H): gathering, felling, fishing, farming, building, eating and drinking (anim_work.ts)
  // walking (G): how a person on foot goes, told from their own record (walkingOf below)
  | 'walk_tired' | 'walk_cold' | 'walk_urgent' | 'walk_laden' | 'walk_work' | 'walk_social' | 'skip' | 'walk_low' | 'walk_glad'
  // standing about (B)
  | 'idle' | 'fire_sit' | 'fire_story' | 'fire_sing' | 'fire_listen' | 'fire_thanks' | 'fire_address' | 'stand_thanks' | 'stand_address'
  | 'stroll' | 'walkout' | 'greet_run' | 'embrace' | 'lookout' | 'search' | 'claim' | 'respects' | 'lookin' | 'mind' | 'attend_birth'
  | 'search_walk' | 'call' | 'celebrate' | 'market' | 'funeral' | 'dance' | 'trek' | 'barter' | 'trudge' | 'unpack'
  // seated (C)
  | 'rest' | 'warm' | 'alone' | 'meal_sit' | 'meal_eat' | 'vigil' | 'lyingin' | 'comfort' | 'settle' | 'standup'
  // work (D)
  | 'whittle' | 'mend_tool' | 'mend_cart' | 'weave' | 'butcher' | 'feed_animal' | 'shear' | 'milk' | 'tether' | 'setgear' | 'haul_net' | 'hangskin'
  | 'workbench' | 'stalk' | 'strike' | 'guard' | 'charge' | 'putaway' | 'takeout' | 'heave' | 'feedfire' | 'filljar' | 'mend' | 'survey'
  // talk (E)
  | 'talk_warn' | 'alarmed' | 'teach' | 'learn' | 'ask_court' | 'demure' | 'welcome' | 'rally' | 'peace'
  // children's games (F)
  | 'game_chaser' | 'game_runner' | 'game_count' | 'game_hide' | 'game_house' | 'play_ground' | 'play_sticks' | 'play_toy';

/** conditions drawn over whatever the person is doing (F); every field is read straight from the person's record */
export interface Condition {
  /** 0, or how bad the fever is (0..1) */
  fever: number;
  /** a sprained ankle: a limp */
  limp: boolean;
  /** a broken arm: held in a sling */
  sling: boolean;
  /** a bad cut: a binding (the record does not say where; it is drawn on the forearm by convention) */
  cut: boolean;
  /** 0, or how near her time a woman with child is (0..1) */
  belly: number;
  /** bereaved */
  mourning: boolean;
}

/** nothing to show (the one shared object, so the renderer can skip the work by identity) */
export const NO_CONDITION: Condition = { fever: 0, limp: false, sling: false, cut: false, belly: 0, mourning: false };

/** a pregnancy shows over about this many ticks before the birth (the last months), growing as her time comes */
const BELLY_SHOWS = 9600;

export function conditionOf(world: World, p: Person): Condition {
  const ill = p.illness;
  const inj = p.injury && p.injury.until > world.tick ? p.injury : undefined;
  const left = p.pregnantUntil > world.tick ? p.pregnantUntil - world.tick : -1;
  const le = p.lifeEvent;
  const mourning = !!le && le.kind === 'bereaved' && le.until > world.tick;
  if (!ill && !inj && left < 0 && !mourning) return NO_CONDITION;
  return {
    fever: ill ? Math.min(1, Math.max(0.35, ill.severity / 60)) : 0,
    limp: inj?.kind === 'sprain',
    sling: inj?.kind === 'broken',
    cut: inj?.kind === 'cut',
    belly: left >= 0 && left < BELLY_SHOWS ? 0.45 + 0.55 * (1 - left / BELLY_SHOWS) : 0,
    mourning,
  };
}

/** what is being said aloud to a company (the evening fire, an occasion), told from the speaker's own speech and thoughts */
function spoken(world: World, p: Person): 'story' | 'sing' | 'thanks' | 'address' | null {
  const sp = p.speech;
  if (!sp || sp.until <= world.tick) return null;
  const thoughts = p.mood?.thoughts;
  if (thoughts) {
    for (const th of thoughts) {
      // a story is said for 90 ticks and a song for 120, and each leaves a thought dated the tick it began
      if (th.kind === 'told_story' && th.since === sp.until - 90) return 'story';
      if (th.kind === 'sang' && th.since === sp.until - 120) return 'sing';
    }
  }
  if (sp.kind !== 'say') return null;
  // a thanks before the company leaves nothing on the speaker but the words themselves (praise.ts)
  if (sp.text.startsWith('Thank you, ') || sp.text.startsWith('I would not be here but for ')) return 'thanks';
  // speaking for a shared building: the project records the tick it was spoken for, and the speaker is one of its candidates (speak_for.ts)
  const projects = world.civicProjects;
  if (projects) for (const q of projects) if (q.spoke === sp.until - 120 && q.council?.candidates.some((x) => x.personId === p.id)) return 'address';
  return null;
}

/** listening to a story being told at the fire: the listener's own thought of it, while it is being told */
function hearingStory(world: World, p: Person): boolean {
  const thoughts = p.mood?.thoughts;
  if (!thoughts) return false;
  for (const th of thoughts) if (th.kind === 'story' && world.tick - th.since < 90) return true;
  return false;
}

function talkAnim(world: World, p: Person, c: Conversation): AnimId {
  const lead = c.a === p.id;
  switch (c.purpose) {
    case 'warn':
      return lead ? 'talk_warn' : 'alarmed';
    case 'court':
      return lead ? 'ask_court' : 'demure';
    case 'welcome':
      return lead ? 'welcome' : 'talk';
    case 'recruit':
      return lead ? 'rally' : 'talk';
    case 'mediate':
      return lead ? 'peace' : 'talk';
    case 'teach_technique':
      return lead ? 'teach' : 'learn';
    case 'learn_technique':
      return lead ? 'learn' : 'teach';
    case 'learn_foraging':
    case 'learn_skill': {
      // the lesson is asked for by either; the elder of the two is the one who shows
      const other = world.byId.get(lead ? c.b : c.a);
      if (!other || other.ent !== 'person') return 'talk';
      return ageYears(world, p) >= ageYears(world, other) ? 'teach' : 'learn';
    }
    case 'play_together': {
      const g = c.data.game as string | undefined;
      if (g === 'chase') return lead ? 'game_chaser' : 'game_runner';
      if (g === 'hide') return lead ? 'game_count' : 'game_hide';
      if (g === 'house') return 'game_house';
      return 'talk';
    }
    default:
      return 'talk';
  }
}

/**
 * The animation for a person. `pose` is the pose the renderer would have shown (the simulation's, with the renderer's own
 * corrections for a cart or a spade already made); `conv` is the conversation they are in, if any.
 */
function animationOfPose(world: World, p: Person, pose: PoseKind, conv: Conversation | undefined): AnimId {
  const a = p.activity;
  if (!a) return pose;
  if (pose === 'pull' || pose === 'fear' || pose === 'sleep') return pose;
  const d = a.data;
  const work = a.phase === 'work';
  const onFoot = pose === 'walk' || pose === 'run';
  const standing = work && pose === 'stand';

  if (pose === 'talk') return conv ? talkAnim(world, p, conv) : 'talk';

  switch (a.kind) {
    // ── work (H): what the record says the work is (anim_work.ts); the old pose is the look where it says nothing more ──
    case 'gather': case 'tree_work': case 'plant': case 'tend': case 'harvest': case 'build': case 'eat': case 'eat_store': case 'drink':
      return workAnimOf(world, p, pose, a) ?? pose;
    case 'wander': {
      if (d.reunion) return onFoot ? 'greet_run' : standing ? 'embrace' : pose;
      if (d.walk) return onFoot ? 'stroll' : standing ? 'walkout' : pose;
      if (!standing) return pose;
      if (d.evening === 'fire') {
        const s = spoken(world, p);
        if (s === 'story') return 'fire_story';
        if (s === 'sing') return 'fire_sing';
        if (s === 'thanks') return 'fire_thanks';
        if (s === 'address') return 'fire_address';
        return hearingStory(world, p) ? 'fire_listen' : 'fire_sit';
      }
      if (d.play === 'stones' || d.play === 'bugs') return 'play_ground';
      if (d.play === 'sticks') return 'play_sticks';
      if (d.play === 'toy') return 'play_toy';
      return 'idle';
    }
    case 'explore':
      return standing ? 'lookout' : pose;
    case 'search':
      return standing ? 'search' : pose;
    case 'claim_home':
      return standing ? 'claim' : pose;
    case 'pay_respects':
      return standing ? 'respects' : pose;
    case 'visit': {
      if (d.fetch) return onFoot ? 'search_walk' : standing ? 'call' : pose;
      if (d.fetchWith) return onFoot ? 'search_walk' : standing ? 'lookout' : pose;
      if (d.fetchedBy) return pose;
      if (!standing) return pose;
      if (d.birth) return d.emptyDoor ? 'stand' : 'attend_birth';
      if (d.watch) return 'mind';
      return 'lookin';
    }
    case 'attend': {
      const dance = d.dance as { done?: true } | undefined;
      if (dance && !dance.done && (onFoot || pose === 'stand')) return 'dance';
      if (!standing) return pose;
      const o = world.occasions?.find((x) => x.id === d.occasion);
      // early: waiting at the place for it to begin
      if (!o || o.status !== 'gathering') return 'stand';
      if (o.kind === 'funeral') return 'funeral';
      const s = spoken(world, p);
      if (s === 'thanks') return 'stand_thanks';
      if (s === 'address') return 'stand_address';
      return o.kind === 'market' ? 'market' : 'celebrate';
    }
    case 'exchange_journey':
      return onFoot ? 'trek' : standing ? 'barter' : pose;
    case 'relocate':
      return onFoot ? 'trudge' : standing ? 'unpack' : pose;
    case 'rest': {
      if (d.side !== undefined) return work && (pose === 'sit' || pose === 'stand') ? 'standup' : pose;
      if (pose !== 'sit') return pose;
      if (d.vigil !== undefined) return 'vigil';
      if (d.lyingIn !== undefined) return 'lyingin';
      if (d.grief !== undefined) return 'comfort';
      if (d.settle !== undefined) return 'settle';
      return 'rest';
    }
    case 'warm':
      return pose === 'sit' ? 'warm' : pose;
    case 'alone':
      return pose === 'sit' ? 'alone' : pose;
    case 'attend_meal':
    case 'host_meal':
      return pose === 'sit' ? 'meal_sit' : pose === 'eat' ? 'meal_eat' : pose;
    case 'craft':
      return pose === 'craft' ? 'whittle' : pose;
    case 'tool_work':
      return pose !== 'craft' ? pose : d.textile ? 'weave' : d.cartId ? 'mend_cart' : 'mend_tool';
    case 'butcher':
      return pose === 'craft' ? 'butcher' : pose;
    case 'animal_work': {
      if (pose !== 'craft') return pose;
      const op = d.op as string | undefined;
      switch (op) {
        case 'feed': case 'water': case 'hay_feed': return 'feed_animal';
        case 'shear': return 'shear';
        case 'milk': return 'milk';
        case 'egg': return 'takeout';
        case 'slaughter': return 'butcher';
        case 'mix_feed': return 'workbench';
        case 'repair': return 'mend_cart';
        default: return 'tether'; // acquire, house, mate: a hand on the animal, tying or leading it
      }
    }
    case 'gear_work': {
      if (pose !== 'craft') return pose;
      const op = d.op as string | undefined;
      return op === 'check' || op === 'retrieve' ? 'haul_net' : 'setgear';
    }
    case 'hang_skin':
      return pose === 'craft' ? 'hangskin' : pose;
    case 'operate':
      return pose === 'craft' ? 'workbench' : pose;
    case 'hunt':
      return pose === 'pick' ? 'strike' : onFoot ? 'stalk' : pose;
    case 'defend':
      return pose === 'pick' ? 'guard' : onFoot ? 'charge' : pose;
    case 'deposit':
      return pose === 'store' ? 'putaway' : pose;
    case 'withdraw':
      return pose === 'store' ? 'takeout' : pose;
    case 'haul':
      return pose === 'store' ? 'heave' : pose;
    case 'fuel_fire':
      return pose === 'store' ? 'feedfire' : pose;
    case 'fetch_water':
      return pose === 'drink' ? 'filljar' : pose;
    case 'repair':
      return pose === 'build' ? 'mend' : pose;
    case 'plan_site':
      return pose === 'build' ? 'survey' : pose;
    default:
      return pose;
  }
}

// ───────────────────────── walking (G) ─────────────────────────
// A person on foot who is in none of the special walks above (stroll, greet_run, search_walk, trek, trudge, stalk, charge, dance)
// was drawn with the one walk. Here the record tells them apart, first match wins: on the way to bed or worn out; on the way to
// get warm or cold; on the way to food or water and in need of it; under a heavy load; going to work with the tool in the pack;
// on the way to somebody; a child on the way to play; low or glad in mood; otherwise the plain walk as before. Each reads only
// what the simulation keeps, and none draws a random number.

/** the lines the simulation itself draws for what a watcher can see of somebody (perception.ts describeSeenPerson) */
const TIRED_BELOW = 25;
const COLD_BELOW = 35;
const HUNGRY_BELOW = 42;
const THIRSTY_BELOW = 40;
/** the burden figure (weight in the pack over what they can carry, as characters.ts reckons it) from which the walk is a laden one */
const LADEN_FROM = 0.6;
/** the weight under which nobody is near the line, so the carrying capacity need not be worked out */
const LADEN_MIN_WEIGHT = 2;
/** the mood level (mood.ts, -100..100) at and below which the walk is a low one, and at and above which a glad one */
const LOW_MOOD = -12;
const GLAD_MOOD = 5;
/** how near (tiles) to the person they are walking to is "close" */
export const GREET_WITHIN = 7;

/**
 * The tool a person walking to work has in the pack for it, as the kind characters.ts draws in the hand: 1 an axe, pick or hoe,
 * 2 a rod, 3 a hammer; 0 when they are not going to such work or do not hold the tool. It follows the tool each task uses
 * (tools.ts): an axe for a tree, a pick for rock, outcrop, ore or clay, a rod for a fish spot (only where rods exist), a hoe to
 * till or tend, a hammer to build or repair. The pack's count is what is read; the tool records are kept in step with it.
 */
export function walkToolOf(world: World, p: Person): 0 | 1 | 2 | 3 {
  const a = p.activity;
  if (!a) return 0;
  const inv = p.inv;
  switch (a.kind) {
    case 'gather': {
      const s = world.byId.get(a.targetId);
      if (!s || s.ent !== 'source') return 0;
      if (s.type === 'tree') return (inv.axe ?? 0) > 0 ? 1 : 0;
      if (s.type === 'rock' || s.type === 'outcrop' || s.type === 'ore_vein' || s.type === 'clay_pit') return (inv.pick ?? 0) > 0 ? 1 : 0;
      if (s.type === 'fish_spot') return hasRods(world) && (inv.rod ?? 0) > 0 ? 2 : 0;
      return 0;
    }
    case 'till':
    case 'tend':
      return (inv.hoe ?? 0) > 0 ? 1 : 0;
    case 'build':
    case 'repair':
      return (inv.hammer ?? 0) > 0 ? 3 : 0;
    default:
      return 0;
  }
}

/**
 * A heavy load on the way to put it down: going to a store, to a building site or a hearth with it, or to hand it over (the
 * activities that move goods), with the burden figure at or over the line. Most people in an ordinary world walk about with a
 * well-filled pack, so the weight alone would make this everybody's walk; the errand is what makes it a load. An armful or a jar
 * on the head already draws the arms (characters.ts) and is left to that.
 */
function ladenWalk(world: World, p: Person, kind: string): boolean {
  if (kind !== 'deposit' && kind !== 'haul' && kind !== 'give' && kind !== 'fuel_fire') return false;
  const inv = p.inv;
  if ((inv.bricks ?? 0) > 0 || (inv.clay ?? 0) > 0 || ((inv.bread ?? 0) > 0 && (inv.basket ?? 0) === 0)) return false;
  if ((inv.jar ?? 0) > 0 && (inv.water ?? 0) > 0) return false;
  const w = weightOf(inv);
  if (w < LADEN_MIN_WEIGHT) return false;
  const cap = carryCap(world, p);
  return cap > 0 && w / cap >= LADEN_FROM;
}

/** on the way to somebody: the activity goes to a person (or to a meal with them), and is not a search for somebody lost */
function towardSomebody(a: Activity): boolean {
  switch (a.kind) {
    case 'socialize':
    case 'converse':
    case 'give':
    case 'attend_meal':
    case 'host_meal':
      return true;
    case 'visit':
      return !a.data.fetch && !a.data.fetchWith && !a.data.fetchedBy;
    default:
      return false;
  }
}

/** a child of seven to eleven (the renderer's child band) */
function playingAge(world: World, p: Person): boolean {
  return ageYears(world, p) >= LITTLE_AGE && stageOf(world, p) === 'child';
}

/** how a person on foot goes, when none of the walks above applies to them */
function walkingOf(world: World, p: Person): AnimId {
  const a = p.activity;
  const kind = a ? a.kind : '';
  if (kind === 'flee') return 'walk';
  const n = p.needs;
  if (kind === 'sleep' || n.energy < TIRED_BELOW) return 'walk_tired';
  if (kind === 'warm' || n.warmth < COLD_BELOW) return 'walk_cold';
  if (a && ((a.need === 'hunger' && n.hunger < HUNGRY_BELOW) || (a.need === 'thirst' && n.thirst < THIRSTY_BELOW))) return 'walk_urgent';
  if (ladenWalk(world, p, kind)) return 'walk_laden';
  if (walkToolOf(world, p) !== 0) return 'walk_work';
  if (a) {
    // a child on the way to play, or pottering about (not to sit at the evening fire)
    const toPlay = kind === 'wander' ? !a.data.evening : (kind === 'socialize' || kind === 'converse') && a.data.purpose === 'play_together';
    if (toPlay && playingAge(world, p)) return 'skip';
    if (towardSomebody(a)) return 'walk_social';
  }
  const m = p.mood;
  if (m) {
    if (m.level <= LOW_MOOD) return 'walk_low';
    if (m.level >= GLAD_MOOD) return 'walk_glad';
  }
  return 'walk';
}

/**
 * The animation for a person. `pose` is the pose the renderer would have shown (the simulation's, with the renderer's own
 * corrections for a cart or a spade already made); `conv` is the conversation they are in, if any. Where that would be the plain
 * walk, the walking (G) rules above say how this person goes.
 */
export function animationOf(world: World, p: Person, pose: PoseKind, conv: Conversation | undefined): AnimId {
  const an = animationOfPose(world, p, pose, conv);
  return an === 'walk' ? walkingOf(world, p) : an;
}

const POSES: ReadonlySet<string> = new Set<PoseKind>([
  'stand', 'walk', 'run', 'pick', 'chop', 'mine', 'fish', 'drink', 'eat', 'sleep', 'sit', 'build', 'till', 'plant', 'tend', 'harvest', 'craft', 'talk', 'give',
  'argue', 'store', 'saw', 'hammer', 'forge', 'bake', 'dig', 'pull', 'fear',
]);
/** is this animation one of the simulation's own poses (drawn by the old pose code)? */
export const isPose = (a: AnimId): a is PoseKind => POSES.has(a);

const QUIET: ReadonlySet<AnimId> = new Set<AnimId>([
  'stand', 'walk', 'run', 'sit', 'talk', 'idle', 'rest', 'fire_sit', 'fire_listen', 'meal_sit', 'funeral', 'walkout', 'stroll', 'trek', 'trudge', 'lookin', 'alone',
  'warm', 'comfort',
]);
/** the walks of (G): like the plain walk, none holds anything with both hands, so a sling or a bereavement shows in the arms too (a fever only shows in the arms of somebody not on foot) */
const QUIET_WALKS: ReadonlySet<AnimId> = new Set<AnimId>(['walk_tired', 'walk_cold', 'walk_urgent', 'walk_laden', 'walk_work', 'walk_social', 'skip', 'walk_low', 'walk_glad']);
/** an animation with nothing for the arms to do, so a fever, a sling or a bereavement may show in them too */
export const isQuiet = (a: AnimId): boolean => QUIET.has(a) || QUIET_WALKS.has(a);
