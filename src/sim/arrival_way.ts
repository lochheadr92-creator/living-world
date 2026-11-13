// Rules 238 (the growth stream, `docs/GROWTH_PLAN.md`): only wolves bar a traveller's way in.
//
// Travellers come in from a map edge "away from known wolf dens" (lifecycle.ts immigrationTick): an edge point is refused if
// a wolf is within 14 tiles of it, and so is a way in whose path passes within 12 tiles of a den. Both tests were written
// when wolves were the only animals, and they read every animal in the world. Deer came with hunting and a founding pair of
// sheep with livestock, and each was counted as a wolf, and the place it began as a den. A settlement's own sheep stand
// beside it, so in many worlds every path to the settlement "passes a den" and nobody can ever arrive.
//
// Measured at rules 236 and 237 (`scripts/arrivals_probe.ts`, `review_evidence/growth-20261113/arrivals/`): of twelve ordinary
// worlds run for twenty years, four received no newcomer at all and stood at 35 to 40 people; in those the other gates (food,
// roofs, spacing) passed at most checks and no edge point gave a way in.
//
// From 238 the two tests read wolves only. One switched part. Nothing is saved. Rich worlds at rules 238 and later only.
import { runsRulesVersion } from './rulesversion';
import type { Animal, World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): `rich-no-arrival-way` lets every animal bar the way, as before rules 238. */
export const arrivalWayOn = (): boolean => enabled;
export function setArrivalWay(on: boolean): void { enabled = on; }
export const hasArrivalWay = (world: World): boolean => enabled && world.settings.dynamics === 'rich' && runsRulesVersion(world, 238);

/** Whether this animal counts when a traveller's way in is judged: any animal before rules 238, a wolf from 238. */
export function barsTheWay(world: World, a: Animal): boolean {
  return !hasArrivalWay(world) || a.type === 'wolf';
}
