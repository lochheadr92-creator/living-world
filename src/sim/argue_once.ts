// Rules 194: an argument does not start with somebody who is already arguing.
//
// `startArgument` (social.ts) puts both parties' current activity on hold (`suspendActivity`, activities.ts) and starts an
// 'argue' activity for each. It refused only when either party was in a conversation (`convId`). An argument is an activity, not
// a conversation, so a second argument could start on a person in the middle of a first: `suspendActivity` then wrote the first
// argument into the held slot over whatever was already there, and that earlier paused activity vanished without reaching the
// common ending path of rules 116 (`suspended_endings.ts`). Found by `tests/suspended_scan.test.ts` at the rules-193 head (the
// ordinary five-day river world, arrivals off): Alma was eating, was pulled into an argument with Emre, and at tick 7,262 a second
// argument with Arlo overwrote the paused meal. The hole is older than 193; that version's trajectory reached it. A conversation
// cannot open on an arguing person (both carry `convId`), so this is the only nesting the code allowed.
//
// At 194 `startArgument` returns before anything when either party's current activity is an argument: no suspension, no
// cooldown, no grievance, no event. The contest that would have started it still records its own grievance and feed line, as
// before. Rules 193 and earlier, authored worlds and `setArgueOnce(false)` keep the old behaviour.
import { runsRulesVersion } from './rulesversion';
import type { Person, World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): off, a rules-194 rich world lets a second argument start on an arguing person again. */
export const argueOnceOn = (): boolean => enabled;
export function setArgueOnce(on: boolean): void { enabled = on; }
export const hasArgueOnce = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 194);

/** Would this argument land on somebody already arguing? Only asked at 194; before it the answer is always no. */
export function alreadyArguing(w: World, a: Person, b: Person): boolean {
  if (!hasArgueOnce(w)) return false;
  return a.activity?.kind === 'argue' || b.activity?.kind === 'argue';
}
