// Rules 196: a shared project never takes a thirteenth participant.
//
// A civic project (townships.ts) is asked for at most twelve participants: `canInvite` refuses the ask once twelve are on the record.
// The answer is recorded later, when the conversation reaches its response phase (`recordProjectResponse`), and it was pushed without
// looking at the count again. Two asks in flight at once (a council lets any candidate ask; a refusal counts as a participant too)
// could both pass the gate at eleven and both land, and the project held thirteen. The live world ran on; the load boundary
// (`validateTownships`, "Invalid project participants", more than twelve) refused the save, so such a world could never be loaded
// again. Found by `tests/save_told.test.ts` at the rules-195 head: the ordinary product world told-beliefs-legacy (arrivals off)
// reaches thirteen on the first shared storehouse at tick 12,031 under 195's larger settlements; at 194 the same world stays inside
// twelve for the test's span. The hole is older than 195; that version's trajectory reached it.
//
// At 196 a response from somebody not yet on the record is not recorded when the project already holds twelve: no participation, no
// civic choice; the request itself keeps its own status, as before. A renewed answer from somebody already on the record is recorded
// as before. Rules 195 and earlier, authored worlds and `setProjectRoom(false)` keep the old push.
import { runsRulesVersion } from './rulesversion';
import type { CivicProject } from './townships';
import type { World } from './types';

/** The most participants a shared project records, asked for by canInvite and enforced at load by validateTownships. */
export const PROJECT_CAP = 12;

let enabled = true;
/** Lab switch (never saved or hashed): off, a rules-196 rich world records a thirteenth participant again. */
export const projectRoomOn = (): boolean => enabled;
export function setProjectRoom(on: boolean): void { enabled = on; }
export const hasProjectRoom = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 196);

/** May this person's answer be added to the project's record? Always before 196; at 196 only inside the cap, or when already on it. */
export function projectHasRoom(w: World, project: CivicProject, personId: number): boolean {
  if (!hasProjectRoom(w)) return true;
  return project.participants.length < PROJECT_CAP || project.participants.some((m) => m.personId === personId);
}
