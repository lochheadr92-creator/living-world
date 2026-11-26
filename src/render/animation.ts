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

export type AnimId =
  | PoseKind
  // standing about (B)
  | 'idle' | 'fire_sit' | 'fire_story' | 'fire_sing' | 'fire_listen' | 'fire_thanks' | 'fire_address' | 'stand_thanks' | 'stand_address'
  | 'stroll' | 'walkout' | 'greet_run' | 'embrace' | 'lookout' | 'search' | 'claim' | 'respects' | 'lookin' | 'mind' | 'attend_birth'
  | 'search_walk' | 'call' | 'celebrate' | 'market' | 'funeral' | 'dance' | 'trek' | 'barter' | 'trudge' | 'unpack'
  // seated (C)
  | 'rest' | 'warm' | 'alone' | 'meal_sit' | 'meal_eat' | 'vigil' | 'lyingin' | 'comfort' | 'settle' | 'standup'
  // work (D)
  | 'whittle' | 'mend_tool' | 'mend_cart' | 'weave' | 'butcher' | 'feed_animal' | 'shear' | 'tether' | 'setgear' | 'haul_net' | 'hangskin'
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
  return NO_CONDITION;
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
    default:
      return 'talk';
  }
}

/**
 * The animation for a person. `pose` is the pose the renderer would have shown (the simulation's, with the renderer's own
 * corrections for a cart or a spade already made); `conv` is the conversation they are in, if any.
 */
export function animationOf(world: World, p: Person, pose: PoseKind, conv: Conversation | undefined): AnimId {
  const a = p.activity;
  if (!a) return pose;
  if (pose === 'pull' || pose === 'fear' || pose === 'sleep') return pose;
  const d = a.data;
  const work = a.phase === 'work';
  const onFoot = pose === 'walk' || pose === 'run';
  const standing = work && pose === 'stand';

  if (pose === 'talk') return pose;

  switch (a.kind) {
    case 'wander': {
      if (d.reunion) return onFoot ? 'greet_run' : standing ? 'embrace' : pose;
      if (d.walk) return onFoot ? 'stroll' : standing ? 'walkout' : pose;
      if (!standing) return pose;
      if (d.evening === 'fire') {
        return 'fire_sit';
      }
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
    default:
      return pose;
  }
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
/** an animation with nothing for the arms to do, so a fever, a sling or a bereavement may show in them too */
export const isQuiet = (a: AnimId): boolean => QUIET.has(a);
