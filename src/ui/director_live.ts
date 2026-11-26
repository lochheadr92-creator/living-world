// What is going on in the world right now, for the story director: a gathering under way, a wolf close to a person, a conversation
// being had, someone who has just spoken angrily or in warning, someone in real trouble. Read from world state, never from the
// feed, so the camera can be there while it happens instead of after.
//
// Presentation only and read-only: nothing here writes to the world or draws from its random state, and the words are the
// simulation's or the inspector's own (occasionNotice for a gathering, the inspector's "what are they doing" and status lines for
// a person), except the two wolf sentences, which say exactly what the wolf's recorded state is, and the one sentence of the
// quiet shot (everybody asleep). The director calls scanLive at most once a UI second.
//
// Nobody asleep is offered as a subject. `abed` says who: a person who is asleep, or on the way to bed. A conversation, a person's
// own speech or trouble, a walk out and a search party follow nobody abed. A wolf that is attacking is still shown on whoever it
// attacks; a wolf that is stalking is shown on the person who is up (its target if it is, else the nearest), and when everybody near
// is abed it is still offered, on the nearest, but at 60, which is under LIVE_EXEMPT, so it can no longer hold the screen for the
// whole night. The kinds that are awake by construction (a vigil, a grief sit, a lying-in, a search, a dance, a gathering) need no
// test. When nothing else is on, an `ambient` candidate is offered for each person who is up and outdoors and not turning in at their
// own home (the lowest band, below every other live score), so there is something to cut to that is not a sleeper; `quietPlace` is
// where the camera goes when nobody is up at all (director_model.ts).
import { HELP_NEAR } from '../sim/birth_help';
import { isCourtWalk, type WalkData } from '../sim/courting';
import { isDancing } from '../sim/dance';
import { isFetchSearch, type FetchData } from '../sim/fetch_home';
import { isGriefSit, type GriefData } from '../sim/grief_sit';
import { isVigil, type VigilData } from '../sim/vigil';
import { describePerson } from '../sim/inspect';
import { statusLine } from '../sim/inspect_observer';
import { isHomeType } from '../sim/constants';
import { personById } from '../sim/registry';
import type { Animal, ConvPurpose, Occasion, Person, World } from '../sim/types';
import { occasionNotice } from './event_cards_model';

export type LiveKind = 'occasion' | 'wolf' | 'talk' | 'speech' | 'trouble' | 'walk' | 'lying' | 'vigil' | 'dance' | 'grief' | 'search' | 'ambient' | 'quiet';

export interface LiveCandidate {
  /** what the cooldown is kept by: 'occ:<id>', 'wolf:<id>', 'talk:<id>', 'walk:<id>', 'lying:<id>', 'vigil:<id>', 'dance:<id>', 'grief:<id>', 'search:<id>', 'amb:<id>' or 'person:<id>' */
  key: string;
  kind: LiveKind;
  score: number;
  /** the living person to follow, or 0: the shot is then of the place */
  subjectId: number;
  x: number;
  y: number;
  /** the caption, read when the shot starts and again at each scan while it lasts */
  caption(): string;
}

/** a wolf this close to a person (tiles) is near them */
export const WOLF_NEAR = 8;

/** asleep, or on the way to bed: somebody alive who is not somebody to watch. Read from the world, nothing is kept. */
export const abed = (p: Person): boolean => p.alive && (p.pose === 'sleep' || p.activity?.kind === 'sleep');

/**
 * Somebody turning in: resting at a home of their own household ("Staying at my lean-to"; the activity's target is that home, the test
 * the option itself uses to call it "my own"). They are on their way to sleep, with nothing to watch, so no ambient shot is made of them.
 * Resting at the shared fire, or at somebody else's home, is not this.
 */
const restingAtOwnHome = (world: World, p: Person): boolean => {
  const a = p.activity;
  if (!a || a.kind !== 'rest' || !a.targetId || !p.hhId) return false;
  const t = world.byId.get(a.targetId);
  return t?.ent === 'building' && t.hhId === p.hhId && isHomeType(t.type);
};

/** the key of the shot of the place when nobody is up (the director_model.ts quiet shot), and its one sentence */
export const QUIET_KEY = 'quiet';
export const QUIET_SENTENCE = 'Everyone is asleep.';

/** a gathering under way: its card's own sentence */
const OCCASION_SCORE: Record<Occasion['kind'], number> = { wedding: 70, funeral: 70, feast: 60, harvest: 60, market: 45 };

/**
 * What a conversation is worth watching: the rarer and more telling purposes above plain talk. Mediation is the most telling, then
 * the lessons, then the children's and the family's time; plain chat is the least.
 */
const TALK_SCORE: Record<ConvPurpose, number> = {
  mediate: 68,
  court: 62,
  welcome: 58,
  teach_technique: 55,
  learn_technique: 55,
  learn_skill: 55,
  play_together: 45,
  family_time: 40,
  learn_foraging: 40,
  apologize: 38,
  warn: 38,
  propose: 35,
  recruit: 35,
  invite: 30,
  request: 30,
  trade: 30,
  offer: 28,
  share_work: 28,
  handover_work: 28,
  lend: 25,
  return_care: 25,
  info: 22,
  ask_info: 22,
  check_in: 22,
  report: 22,
  cancel_request: 22,
  delay_request: 22,
  cancel_meeting: 22,
  chat: 20,
};

const SPEECH_SCORE = { angry: 65, warn: 60 } as const;
/** two people walking out together (rules 260): the leader's walk, one candidate for the pair */
const WALK_SCORE = 66;
/** a woman lying in with a helper beside her (rules 261, birth_help.ts), and a vigil kept beside somebody ill or hurt (vigil.ts) */
const LYING_SCORE = 72;
const VIGIL_SCORE = 66;
/** a dance under way at an occasion (rules 262, dance.ts): one candidate for the occasion */
const DANCE_SCORE = 68;
/** somebody sitting with the bereaved (rules 263, grief_sit.ts): one candidate for each bereaved person, once the visitor has sat down */
const GRIEF_SCORE = 60;
/** a search party out after dark under way (rules 264, fetch_home.ts): one candidate for each search that has somebody with the one who set out */
const SEARCH_SCORE = 66;
/** in real trouble: at risk, fleeing or standing against a threat (the inspector's danger tone) */
const TROUBLE_SCORE = 50;
/** unwell or hurt: the inspector's status line says so */
const HURT_SCORE = 40;
/** a wolf stalking when everybody within WOLF_NEAR is abed: still a real threat, but under LIVE_EXEMPT (70), so the cooldown applies */
export const STALK_ABED_SCORE = 60;
/**
 * Somebody up and outdoors with nothing else on (the lowest band: every score here is under the lowest of any other live thing,
 * plain chat at 20, and far under MIDDLE_FROM). 5 for being there, 6 more when they are at the work itself and not on the way to
 * it, and 2 for each other person up and outdoors within AMBIENT_NEAR tiles, at most 8: company makes a scene. So 5 to 19.
 */
const AMBIENT_BASE = 5;
const AMBIENT_WORK = 6;
const AMBIENT_COMPANY = 2;
const AMBIENT_COMPANY_MAX = 8;
export const AMBIENT_NEAR = 4;

const hyp = (a: number, b: number): number => Math.hypot(a, b);

/** the two wolf sentences: only what the wolf's recorded state says, naming the person it is stalking, else the nearest */
export const wolfSentence = (state: Animal['state'], name: string): string => `A wolf is ${state === 'attack' ? 'attacking' : 'stalking'} near ${name}.`;

/**
 * Where the camera goes when nobody is up: the lit fire (a fire with fuel) nearest the centre of the living people, else the centre
 * itself; null when nobody lives.
 */
export function quietPlace(world: World): { x: number; y: number } | null {
  let n = 0;
  let sx = 0;
  let sy = 0;
  for (const p of world.persons) {
    if (!p.alive) continue;
    n++;
    sx += p.x;
    sy += p.y;
  }
  if (!n) return null;
  const cx = sx / n;
  const cy = sy / n;
  let best: { x: number; y: number } | null = null;
  let bd = Infinity;
  for (const b of world.buildings) {
    if (b.type !== 'fire' || !(b.fuel > 0)) continue;
    const x = b.x + b.w / 2;
    const y = b.y + b.h / 2;
    const d = hyp(x - cx, y - cy);
    if (d < bd) {
      bd = d;
      best = { x, y };
    }
  }
  return best ?? { x: cx, y: cy };
}

/** whether anybody alive is up (not abed): what makes "Everyone is asleep." true */
export const anyoneUp = (world: World): boolean => world.persons.some((p) => p.alive && !abed(p));

/**
 * Every live candidate now, best first. A wolf counts when its state is 'stalk' or 'attack' and it is within WOLF_NEAR tiles of a
 * living person: an attack is shown on the person it records as its target when that is one of them, else the nearest; a stalk on
 * its target when that is one of them and is up, else the nearest who is up, and when everybody near is abed, on the nearest at
 * STALK_ABED_SCORE. Nobody abed is the subject of any other kind that follows a person. Cheap enough for once a second: the one
 * expensive text (describePerson) is only built, through caption(), for the candidate that is shown.
 */
export function scanLive(world: World): LiveCandidate[] {
  const out: LiveCandidate[] = [];

  for (const o of world.occasions ?? []) {
    if (o.status !== 'gathering') continue;
    out.push({ key: `occ:${o.id}`, kind: 'occasion', score: OCCASION_SCORE[o.kind] ?? 45, subjectId: 0, x: o.x, y: o.y, caption: () => occasionNotice(world, o).says });
  }

  for (const a of world.animals) {
    if (a.type !== 'wolf' || (a.state !== 'stalk' && a.state !== 'attack')) continue;
    const attack = a.state === 'attack';
    const target = personById(world, a.targetId);
    const targetNear = !!target && target.alive && hyp(target.x - a.x, target.y - a.y) <= WOLF_NEAR;
    // the nearest person within WOLF_NEAR, and the nearest of those who are up
    let nearest: Person | undefined;
    let nearestUp: Person | undefined;
    let bestAny = WOLF_NEAR;
    let bestUp = WOLF_NEAR;
    for (const p of world.persons) {
      if (!p.alive) continue;
      const d = hyp(p.x - a.x, p.y - a.y);
      if (d <= bestAny) {
        bestAny = d;
        nearest = p;
      }
      if (d <= bestUp && !abed(p)) {
        bestUp = d;
        nearestUp = p;
      }
    }
    let who: Person | undefined;
    let score = attack ? 80 : 70;
    if (attack) who = targetNear ? target : nearest;
    else if (targetNear && !abed(target!)) who = target;
    else if (nearestUp) who = nearestUp;
    else if (nearest) {
      who = nearest;
      score = STALK_ABED_SCORE;
    }
    if (!who) continue;
    const name = who.name;
    out.push({ key: `wolf:${a.id}`, kind: 'wolf', score, subjectId: who.id, x: who.x, y: who.y, caption: () => wolfSentence(a.state, name) });
  }

  const doing = (id: number): string => describePerson(world, id)?.qa.doing ?? '';
  for (const c of world.conversations) {
    const a = personById(world, c.a);
    if (!a || !a.alive || abed(a)) continue;
    out.push({ key: `talk:${c.id}`, kind: 'talk', score: TALK_SCORE[c.purpose] ?? 20, subjectId: a.id, x: a.x, y: a.y, caption: () => doing(a.id) });
  }

  // a walk out under way (courting.ts: a 'wander' whose data.walk is held by both, role 'a' the one who asked): one candidate for the pair,
  // from the leader's side, in the inspector's own words for what they are doing
  for (const p of world.persons) {
    const a = p.alive && !abed(p) ? p.activity : null;
    if (!a || !isCourtWalk(a)) continue;
    const walk = a.data.walk as WalkData;
    if (walk.role !== 'a' || walk.done) continue;
    out.push({ key: `walk:${walk.id}`, kind: 'walk', score: WALK_SCORE, subjectId: p.id, x: p.x, y: p.y, caption: () => doing(p.id) });
  }

  // a search party out after dark under way (fetch_home.ts: a 'visit' whose data.fetch is not settled and who has set out with somebody), one candidate for each search, from the
  // worrier's side, in the inspector's own words for what they are doing
  for (const p of world.persons) {
    const a = p.alive && !abed(p) ? p.activity : null;
    if (!a || !isFetchSearch(a)) continue;
    const d = a.data.fetch as FetchData;
    if (d.done || !d.party.length) continue;
    out.push({ key: `search:${d.for}`, kind: 'search', score: SEARCH_SCORE, subjectId: p.id, x: p.x, y: p.y, caption: () => doing(p.id) });
  }

  // a woman lying in by her door (birth_help.ts: a 'rest' whose data.lyingIn is set) with a helper beside her in work at the visit that promise sent them on:
  // only then is it a scene, and one for her; the birth itself stays a top event. And a vigil under way (vigil.ts: a 'rest' whose data.vigil is set, sitting beside
  // them in work): one for each person sat with, from the sitter's side. Both in the inspector's own words for what they are doing.
  for (const p of world.persons) {
    const a = p.alive ? p.activity : null;
    if (!a || a.kind !== 'rest' || a.phase !== 'work') continue;
    if (a.data.lyingIn !== undefined) {
      const helped = world.persons.some((q) => q.alive && q !== p && q.activity?.kind === 'visit' && q.activity.data.birth === true && q.activity.targetId === p.id && q.activity.phase === 'work' && hyp(q.x - p.x, q.y - p.y) <= HELP_NEAR);
      if (helped) out.push({ key: `lying:${p.id}`, kind: 'lying', score: LYING_SCORE, subjectId: p.id, x: p.x, y: p.y, caption: () => doing(p.id) });
    }
    if (isVigil(a)) {
      const v = a.data.vigil as VigilData;
      if (!v.over) out.push({ key: `vigil:${v.for}`, kind: 'vigil', score: VIGIL_SCORE, subjectId: p.id, x: p.x, y: p.y, caption: () => doing(p.id) });
    }
    // somebody sitting with the bereaved (grief_sit.ts: a 'rest' whose data.grief says they have sat down, in work), one for each bereaved person, from the visitor's side
    if (isGriefSit(a) && (a.data.grief as GriefData).began) out.push({ key: `grief:${(a.data.grief as GriefData).for}`, kind: 'grief', score: GRIEF_SCORE, subjectId: p.id, x: p.x, y: p.y, caption: () => doing(p.id) });
  }

  // a dance under way (dance.ts: an 'attend' activity at the occasion whose data.dance is not over), two or more at one occasion: one candidate for the occasion, from
  // the side of the first of them, in the inspector's own words for what they are doing ("Dancing at the wedding feast")
  for (const o of world.occasions ?? []) {
    if (o.status !== 'gathering' || !o.dance) continue;
    const dancing = world.persons.filter((p) => p.alive && isDancing(p.activity) && p.activity?.data.occasion === o.id);
    if (dancing.length >= 2) out.push({ key: `dance:${o.id}`, kind: 'dance', score: DANCE_SCORE, subjectId: dancing[0].id, x: o.x, y: o.y, caption: () => doing(dancing[0].id) });
  }

  // a person's own state: speaking angrily or in warning, or in real trouble. One candidate per person, the higher score.
  const byPerson = new Map<number, LiveCandidate>();
  const put = (c: LiveCandidate): void => {
    const was = byPerson.get(c.subjectId);
    if (!was || c.score > was.score) byPerson.set(c.subjectId, c);
  };
  for (const p of world.persons) {
    if (!p.alive || abed(p)) continue;
    const sp = p.speech;
    if (sp && sp.until > world.tick && (sp.kind === 'angry' || sp.kind === 'warn')) {
      put({ key: `person:${p.id}`, kind: 'speech', score: SPEECH_SCORE[sp.kind], subjectId: p.id, x: p.x, y: p.y, caption: () => doing(p.id) });
    }
    const st = statusLine(world, p);
    const hurt = st.text.startsWith('Unwell:') || st.text.startsWith('Hurt:');
    if (st.tone === 'danger' || hurt) {
      put({ key: `person:${p.id}`, kind: 'trouble', score: st.tone === 'danger' ? TROUBLE_SCORE : HURT_SCORE, subjectId: p.id, x: p.x, y: p.y, caption: () => statusLine(world, p).text });
    }
  }
  out.push(...byPerson.values());

  // somebody up and outdoors, with nothing else to say about them: one candidate each, the lowest band. Somebody inside a hut cannot be
  // seen, somebody abed is not offered, nor is somebody resting at their own home (turning in). Each is scored by how much there is to
  // watch (the work itself, company close by); those resting at home still count as company for the others.
  const up = world.persons.filter((p) => p.alive && !p.indoors && !abed(p));
  for (const p of up) {
    if (restingAtOwnHome(world, p)) continue;
    let company = 0;
    for (const q of up) if (q !== p && hyp(q.x - p.x, q.y - p.y) <= AMBIENT_NEAR) company++;
    const score = AMBIENT_BASE + (p.activity?.phase === 'work' ? AMBIENT_WORK : 0) + Math.min(AMBIENT_COMPANY_MAX, company * AMBIENT_COMPANY);
    out.push({ key: `amb:${p.id}`, kind: 'ambient', score, subjectId: p.id, x: p.x, y: p.y, caption: () => doing(p.id) });
  }

  // best first; among the ambient ones of one score the lower id, so the order never depends on how the people are listed
  return out.sort((a, b) => b.score - a.score || (a.kind === 'ambient' && b.kind === 'ambient' ? a.subjectId - b.subjectId : 0));
}
