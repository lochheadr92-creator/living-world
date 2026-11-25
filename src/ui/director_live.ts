// What is going on in the world right now, for the story director: a gathering under way, a wolf close to a person, a conversation
// being had, someone who has just spoken angrily or in warning, someone in real trouble. Read from world state, never from the
// feed, so the camera can be there while it happens instead of after.
//
// Presentation only and read-only: nothing here writes to the world or draws from its random state, and the words are the
// simulation's or the inspector's own (occasionNotice for a gathering, the inspector's "what are they doing" and status lines for
// a person), except the two wolf sentences, which say exactly what the wolf's recorded state is. The director calls scanLive at
// most once a UI second.
import { describePerson } from '../sim/inspect';
import { statusLine } from '../sim/inspect_observer';
import { personById } from '../sim/registry';
import type { Animal, ConvPurpose, Occasion, Person, World } from '../sim/types';
import { occasionNotice } from './event_cards_model';

export type LiveKind = 'occasion' | 'wolf' | 'talk' | 'speech' | 'trouble';

export interface LiveCandidate {
  /** what the cooldown is kept by: 'occ:<id>', 'wolf:<id>', 'talk:<id>' or 'person:<id>' */
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

/** a gathering under way: its card's own sentence */
const OCCASION_SCORE: Record<Occasion['kind'], number> = { wedding: 70, funeral: 70, feast: 60, harvest: 60, market: 45 };

/**
 * What a conversation is worth watching: the rarer and more telling purposes above plain talk. Mediation is the most telling, then
 * the lessons, then the children's and the family's time; plain chat is the least.
 */
const TALK_SCORE: Record<ConvPurpose, number> = {
  mediate: 68,
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
/** in real trouble: at risk, fleeing or standing against a threat (the inspector's danger tone) */
const TROUBLE_SCORE = 50;
/** unwell or hurt: the inspector's status line says so */
const HURT_SCORE = 40;

const hyp = (a: number, b: number): number => Math.hypot(a, b);

/** the two wolf sentences: only what the wolf's recorded state says, naming the person it is stalking, else the nearest */
export const wolfSentence = (state: Animal['state'], name: string): string => `A wolf is ${state === 'attack' ? 'attacking' : 'stalking'} near ${name}.`;

/**
 * Every live candidate now, best first. A wolf counts when its state is 'stalk' or 'attack' and it is within WOLF_NEAR tiles of a
 * living person: the person it records as its target when that is one of them, else the nearest. Cheap enough for once a second:
 * the one expensive text (describePerson) is only built, through caption(), for the candidate that is shown.
 */
export function scanLive(world: World): LiveCandidate[] {
  const out: LiveCandidate[] = [];

  for (const o of world.occasions ?? []) {
    if (o.status !== 'gathering') continue;
    out.push({ key: `occ:${o.id}`, kind: 'occasion', score: OCCASION_SCORE[o.kind] ?? 45, subjectId: 0, x: o.x, y: o.y, caption: () => occasionNotice(world, o).says });
  }

  for (const a of world.animals) {
    if (a.type !== 'wolf' || (a.state !== 'stalk' && a.state !== 'attack')) continue;
    let who: Person | undefined = personById(world, a.targetId);
    if (!who || !who.alive || hyp(who.x - a.x, who.y - a.y) > WOLF_NEAR) {
      who = undefined;
      let best = WOLF_NEAR;
      for (const p of world.persons) {
        if (!p.alive) continue;
        const d = hyp(p.x - a.x, p.y - a.y);
        if (d <= best) {
          best = d;
          who = p;
        }
      }
    }
    if (!who) continue;
    const name = who.name;
    out.push({ key: `wolf:${a.id}`, kind: 'wolf', score: a.state === 'attack' ? 80 : 70, subjectId: who.id, x: who.x, y: who.y, caption: () => wolfSentence(a.state, name) });
  }

  const doing = (id: number): string => describePerson(world, id)?.qa.doing ?? '';
  for (const c of world.conversations) {
    const a = personById(world, c.a);
    if (!a || !a.alive) continue;
    out.push({ key: `talk:${c.id}`, kind: 'talk', score: TALK_SCORE[c.purpose] ?? 20, subjectId: a.id, x: a.x, y: a.y, caption: () => doing(a.id) });
  }

  // a person's own state: speaking angrily or in warning, or in real trouble. One candidate per person, the higher score.
  const byPerson = new Map<number, LiveCandidate>();
  const put = (c: LiveCandidate): void => {
    const was = byPerson.get(c.subjectId);
    if (!was || c.score > was.score) byPerson.set(c.subjectId, c);
  };
  for (const p of world.persons) {
    if (!p.alive) continue;
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

  return out.sort((a, b) => b.score - a.score);
}
