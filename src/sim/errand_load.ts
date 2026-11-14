// Rules 247 (the growth stream, from the audit of 14 November 2026, `review_evidence/audit-20261114/AUDIT.md` F2-02): a load on an errand is not put down on the way.
//
// `Person.errand` was declared in the first commit and is never set to anything: the only writes are the three places that clear it
// (act_resource.ts deposit and haul, social.ts). Five guards that read it (communal_stock.ts twice, leave_heaviest.ts, pack_materials.ts,
// seed_storage.ts) have therefore been false in every world since rules 33, and the guarantee they were written for, that what a person
// is carrying to a site or to somebody who was promised it is not counted as spare, did not hold: a person on their way with wood to a
// building site could be offered to put that wood down at home, to leave it at the storehouse, or to stack it at the communal store.
//
// From 247 the errand is read from what the person is doing, not from a stored field: somebody on a haul to a building site, or on a
// deposit made for a promise, is on an errand, and the kinds named in that activity's `items` are the load. Nothing is saved or hashed
// and the field stays as it was (always null). Rules 246 and earlier, authored worlds and a switch thrown behave as before.
//
// One switched part. Rich worlds at rules 247 and later only.
import { runsRulesVersion } from './rulesversion';
import type { Activity, ItemKind, Person, World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): `rich-no-errand-load` reads the old, never set field again, as before rules 247. */
export const errandLoadOn = (): boolean => enabled;
export function setErrandLoad(on: boolean): void { enabled = on; }
export const hasErrandLoad = (world: World): boolean => enabled && world.settings.dynamics === 'rich' && runsRulesVersion(world, 247);

/** Is this activity an errand: a delivery to a building site (`haul`) or a deposit made for a promise? */
const isErrandActivity = (a: Activity | null | undefined): a is Activity => !!a && (a.kind === 'haul' || (a.kind === 'deposit' && a.data.mode === 'promise'));

/** Is the person on an errand? Before 247 this is the stored field, which nothing ever sets. */
export function onErrand(world: World, p: Person): boolean {
  return hasErrandLoad(world) ? isErrandActivity(p.activity) : !!p.errand;
}

/** Is this kind part of the load of the errand the person is on? Before 247 this is the stored field, which nothing ever sets. */
export function errandCarries(world: World, p: Person, item: ItemKind): boolean {
  if (!hasErrandLoad(world)) return p.errand?.item === item;
  const a = p.activity;
  if (!isErrandActivity(a)) return false;
  const items = a.data.items as Record<string, number> | undefined;
  return (items?.[item] ?? 0) > 0 && (p.inv[item] ?? 0) > 0;
}
