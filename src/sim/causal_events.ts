// Rules 182: a grievance remembers the event that caused it (first slice of gap G01, the causal link).
//
// Events carry an id (`addEvent` allocates it) that nothing kept, so a grievance and the history notes beside it recorded a sentence and no
// "because of". At 182, where an incident also records an event (a broken promise, a refusal that makes the feed, a contest lost on a feed
// day, an argument), that event's id is stored on the grievance (`Grievance.eventId`) and on the relation history notes written for it
// (`eventId`). An id can outlive its event: the feed rolls events out after a while, the chronicle keeps the worthy ones. A theft has no
// event at that point and is not linked. Nothing reads the id yet, so no decision changes; thoughts, life events, rumours and the personal
// log are later slices. The incident code is untouched and in its old order: the link is made after the event is recorded, on what was
// just written.
import { runsRulesVersion } from './rulesversion';
import type { Person, World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): `rich-no-causal-events` stops the ids being kept inside a rules-182 rich world. */
export const causalEventsOn = (): boolean => enabled;
export function setCausalEvents(on: boolean): void { enabled = on; }
export const hasCausalEvents = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 182);

/**
 * Tie what `holder` just wrote about `otherId` to the event that was recorded for the same incident: the history notes with exactly these
 * texts written this tick, and the grievance whose detail is `detail`. Does nothing below 182 or when the switch is off.
 */
export function linkCause(world: World, holder: Person, otherId: number, eventId: number, what: { notes?: string[]; detail?: string }): void {
  if (!hasCausalEvents(world)) return;
  const r = holder.relations[otherId];
  if (!r) return;
  const notes = what.notes ?? [];
  const soreText = what.detail === undefined ? undefined : `sore: ${what.detail}`;
  for (let i = r.history.length - 1; i >= 0; i--) {
    const h = r.history[i];
    if (h.tick !== world.tick) break;
    if (h.eventId === undefined && (notes.includes(h.text) || h.text === soreText)) h.eventId = eventId;
  }
  if (what.detail !== undefined && r.grievance && r.grievance.detail === what.detail) r.grievance.eventId = eventId;
}
