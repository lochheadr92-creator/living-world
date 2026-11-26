// Rules 264 (the social scenes stream, bundle E, part 14 of `docs/SOCIAL_SCENES_PLAN.md`): speaking for a shared building. At the evening fire or at an occasion, somebody
// who has put themselves forward to coordinate a shared building that has nobody yet to coordinate it stands and makes the case, and those there answer then and there.
//
// What stood before: there is no settlement organiser. Each shared building is a `CivicProject` (townships.ts) with a council (civic_decision.ts): whoever proposed it is its
// first candidate, support is asked of one person at a time in private talk (options_social.ts optRecruit, answered in social.ts and recorded by recordProjectResponse), and
// the candidate with at least two accepted supporters and a strict lead has the mandate. Until somebody has it nobody may work the project (councilAllowsWork). In six
// settlements over 25 days 15 were proposed and 13 reached a mandate, typically a day after, over 136 private asks; none was asked at a fire or a gathering.
//
// One part, `speech` (switched in together_scenes.ts, with `side`, standing_up.ts, and `fetch`, fetch_home.ts). From rules 264:
//
//   when     At the half-way point of a person's own evening sitting at the fire (act_misc.ts: a thanks first, as before, then this, then a story, then a song; whichever is done
//            takes the place of the rest), and when a person arrives at an occasion that has begun, not a funeral (occasions.ts: after a thanks, the two moments praise.ts speaks
//            at). The speaker is a candidate of an active shared project whose council has no mandate yet, who is still supporting it.
//   who      The listeners are those there (the sitters at that fire, those who have come to that occasion) within SPEECH_NEAR tiles of the speaker whom the speaker could ask for
//            support: the same test the private ask uses (townships.ts canInvite): a grown member of the project's township who has not yet answered this candidate and does not
//            already support them. At least SPEECH_MIN of them, and at most SPEECH_MAX are asked. With fewer, nothing happens and nothing is written. One speech for a project in
//            SPEECH_QUIET ticks (an evening), whoever speaks: there is no rival speech in this version.
//   the word One spoken line (dialogue.ts SPEECH_LINES, naming the building) and then each listener answers there and then. The answer is the private ask's own answer, not a
//            copy of it: social.ts answerRecruit decides it from the listener's own state and record, settles an ordinary help-build request the speaker is made to have put
//            to them, makes the ordinary promise on a yes and says so aloud, and townships.ts recordProjectResponse records the choice against the project through the same
//            recordChoice a private answer goes through (at the hearing of the company and not the three tiles of a private talk). So a mandate can form in one evening, and it
//            is the mandate the same choices would have made one by one. The yes a listener says is not written to the feed on its own (the speech has its own line).
//   on top   The private asks carry on unchanged. A speech never removes a candidate, never changes who has the mandate except by recording choices the existing rule makes,
//            and cannot leave a project with nobody able to work it.
//   the line One line in the feed, kind `social`, whatever came of it: "At the fire A spoke for a new well; 3 of 5 said they would help." (the building's own name; "At the
//            wedding feast ..." at an occasion), "0 of 4" when nobody was persuaded.
//
// Nothing here reads anybody's true state: the speaker and the listeners are those present, the project is one the speaker has put themselves forward for, and each listener
// answers from their own record of the speaker. No draw from the shared stream is made. Saved: CivicProject.spoke (the tick of the last speech, which is in the fingerprint with
// the civic record, world.ts), the requests and promises an answer makes (as for a private ask) and the listeners' recorded choices (as for a private ask), all checked on
// loading as they were (townships.ts validateTownships) and `spoke` here (validateSpeech). Rich worlds at rules 264 and later only; rules 263 and earlier, authored worlds and a
// part switched off keep the old behaviour.
import { BUILD_DEF, DAY } from './constants';
import { mandate } from './civic_decision';
import { SPEECH_LINES, saying } from './dialogue';
import { addEvent, addLog, say } from './events';
import { sittersAt } from './evening_fire';
import { presentAt } from './market_contact';
import { runsRulesVersion } from './rulesversion';
import { answerRecruit, createRequest } from './social';
import { TOGETHER_FROM, hasSpeech } from './together_scenes';
import type { CivicProject } from './townships';
import { canInvite, recordProjectResponse } from './townships';
import type { Activity, Occasion, Person, World } from './types';
import { hyp } from './util';

/** how near the speaker a listener is to be asked (as far as praise.ts's company reaches) */
export const SPEECH_NEAR = 6;
/** at least this many to speak to, and at most this many answered */
export const SPEECH_MIN = 2;
export const SPEECH_MAX = 8;
/** one speech for a project in this long: an evening */
export const SPEECH_QUIET = DAY / 2;

/** what the project is called in the feed */
export const buildingName = (q: CivicProject): string => (q.type ? BUILD_DEF[q.type].label : 'storehouse');

/**
 * `speaker` is in company at `label` ("the fire", "the wedding feast") with `present` (everybody else there, alive). If they are a candidate to coordinate a shared building that
 * has no mandate yet and have enough there to ask, they speak for it and those there answer. One project at most; returns true if a speech was made.
 */
export function speakFor(w: World, speaker: Person, label: string, present: Person[]): boolean {
  if (!hasSpeech(w) || !speaker.alive || speaker.indoors || !w.civicProjects?.length) return false;
  for (const q of w.civicProjects) {
    if (q.status !== 'active' || !q.council || !q.council.candidates.some((c) => c.personId === speaker.id)) continue;
    if (q.spoke !== undefined && w.tick - q.spoke < SPEECH_QUIET) continue;
    if (mandate(w, q) !== 0) continue; // it has its coordinator: nothing to speak for
    const listeners = present.filter((l) => l.alive && l.id !== speaker.id && hyp(l.x - speaker.x, l.y - speaker.y) <= SPEECH_NEAR && canInvite(w, speaker, l, q.siteId)).slice(0, SPEECH_MAX);
    if (listeners.length < SPEECH_MIN) continue;
    const what = buildingName(q);
    q.spoke = w.tick;
    say(w, speaker, saying(SPEECH_LINES, speaker.id, q.id, w.tick, { what }), 'say', 120);
    let yes = 0;
    for (const l of listeners) {
      // the same ask, put to each of them in the hearing of the others; the same answer; the same record
      const req = createRequest(w, speaker, l, { kind: 'help_build', siteId: q.siteId, amount: 1 });
      answerRecruit(w, speaker, l, req, q.siteId, 0, true);
      recordProjectResponse(w, speaker, l, req, SPEECH_NEAR);
      if (req.status === 'promised') yes++;
    }
    addEvent(w, 'social', `At ${label} ${speaker.name} spoke for a new ${what}; ${yes} of ${listeners.length} said they would help.`, [speaker.id, ...listeners.map((l) => l.id)], speaker.x, speaker.y);
    addLog(w, speaker, 'social', `Spoke for the new ${what} at ${label}; ${yes} of ${listeners.length} said they would help.`);
    return true;
  }
  return false;
}

/** The half-way point of a person's own evening sitting (act_misc.ts, after a thanks, before a story): a candidate may speak for the building here. */
export function speakAtFire(w: World, p: Person, a: Activity): boolean {
  if (!hasSpeech(w) || a.progress !== Math.floor(a.duration / 2) || !w.civicProjects?.length) return false;
  const fire = w.byId.get(a.data.fireId as number);
  if (!fire || fire.ent !== 'building') return false;
  return speakFor(w, p, 'the fire', sittersAt(w, fire, p.id));
}

/** Somebody has just arrived at an occasion that has begun (occasions.ts arrive, when no thanks was spoken): those there, in the place, are who they speak before. Never at a funeral. */
export function speakAtOccasion(w: World, p: Person, o: Occasion, label: string): boolean {
  if (!hasSpeech(w) || o.kind === 'funeral' || o.status !== 'gathering' || !w.civicProjects?.length || !presentAt(w, p, o)) return false;
  const present: Person[] = [];
  for (const id of o.attended) {
    const q = w.byId.get(id);
    if (id !== p.id && q && q.ent === 'person' && q.alive && presentAt(w, q, o)) present.push(q);
  }
  return speakFor(w, p, label, present);
}

// ───────────────────────── saved state ─────────────────────────
/** What a save may hold of this (rules 264, rich only); anything else is refused on loading. */
export function validateSpeech(w: World): void {
  const allowed = w.settings.dynamics === 'rich' && runsRulesVersion(w, TOGETHER_FROM);
  for (const q of w.civicProjects ?? []) {
    if (q.spoke === undefined) continue;
    if (!allowed || !q.council || !Number.isSafeInteger(q.spoke) || q.spoke < 0 || q.spoke > w.tick) throw new Error('Invalid speech record');
  }
}
