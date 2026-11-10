// Rules 188: what was taken, from where, and where salvage for a shared building came from (first slice of gap G133; end-to-end trace links 17 and 32).
//
// Taking goods out of a store, a cart or a pile logged "Took 1 item from storage." and kept nothing else, so a storehouse finished with stone
// salvaged from the hut sites of people the cold had killed left no trace of that anywhere. At 188:
//  - the log line names the goods and the place: "Took 1 stone from a pile of abandoned building materials, there since day 24.";
//  - the person keeps their last taking (`lastTaken`: tick, activity, goods, place, whether it was from a pile);
//  - when goods of a kind they took from a pile within the last half day are delivered to a township's shared project, the participation
//    record keeps where they came from (`salvaged`, at most six lines), and the project history prints it after what they supplied.
// Nothing reads any of this for a decision. It is not a full transfer ledger: no route, no ownership, one remembered taking per person, and a
// stone taken from a pile and a stone already in the pack are not told apart at delivery.
import { DAY } from './constants';
import { runsRulesVersion } from './rulesversion';
import { participation } from './townships';
import type { Entity, ItemKind, Person, World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): off, a rules-188 rich world logs "from storage" and keeps nothing, as before. */
export const takenFromOn = (): boolean => enabled;
export function setTakenFrom(on: boolean): void { enabled = on; }
export const hasTakenFrom = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 188);

/** How long after a taking a delivery of the same kind is put down to it. */
export const SALVAGE_WINDOW = DAY / 2;
const SALVAGE_LINES = 6;

/** The place, in words a log line can end with. */
export function placeWords(e: Entity | undefined): string {
  if (!e) return 'storage';
  if (e.ent === 'pile') return `a pile${e.note ? ` of ${e.note}` : ''}, there since day ${Math.floor(e.since / DAY)}`;
  if (e.ent === 'building') return `the ${e.type.replaceAll('_', ' ')}`;
  if (e.ent === 'cart') return 'a cart';
  return 'storage';
}
const goodsWords = (took: Record<string, number>): string => Object.keys(took).sort().map((k) => `${took[k]} ${k}`).join(', ');

/** Called by the taking action once the goods have moved. Records only. */
export function noteTaken(world: World, p: Person, e: Entity | undefined, took: Record<string, number>, activityId: number): void {
  if (!hasTakenFrom(world) || !Object.keys(took).length) return;
  p.lastTaken = { tick: world.tick, activityId, what: goodsWords(took), kinds: Object.keys(took).sort().join(','), place: placeWords(e), pile: e?.ent === 'pile' };
}

/** The log line for a finished taking, or undefined to keep the old one. */
export function takenLine(world: World, p: Person, activityId: number): string | undefined {
  const t = p.lastTaken;
  if (!hasTakenFrom(world) || !t || t.activityId !== activityId) return undefined;
  return `Took ${t.what} from ${t.place}.`;
}

/** Called when `m` of `item` has just been delivered to a site and credited. Records only. */
export function noteSalvageDelivered(world: World, p: Person, siteId: number, item: ItemKind, m: number): void {
  const t = p.lastTaken;
  if (!hasTakenFrom(world) || m <= 0 || !t || !t.pile || world.tick - t.tick > SALVAGE_WINDOW || !t.kinds.split(',').includes(item)) return;
  const part = participation(world, p, siteId);
  if (!part) return;
  const line = `${item} from ${t.place}`;
  const lines = part.salvaged ??= [];
  if (lines.length < SALVAGE_LINES && !lines.includes(line)) lines.push(line);
}
