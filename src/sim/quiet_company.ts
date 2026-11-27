// Rules 284 (`docs/QUIET_COMPANY.md`): quiet company. Taken up from an uncommitted draft of 19 November 2026 (`C:\dev\lw-company-candidate-20261119`,
// gated there at 262 and 263, numbers long since taken) on Ryan's word of 28 November 2026 to follow the order: small world, quiet company, water, floor.
//
// What stood before: the want of company (needs.social) eased only through a talk, a gathering, a meal, an evening at the fire or hall or a scene;
// sitting, eating or warming beside somebody without speaking counted for nothing. And the want of company began to draw a person only below 48
// (constants.ts DRIVE_BANDS social [48, 26]), so most people sought company only once they were already lonely.
//
// Two separately switched parts (`rich-no-quiet-company`, `rich-no-quiet-company-quiet`, `rich-no-quiet-company-earlier`):
//
//   quiet    A person awake and at rest, eating, drinking, warming or waiting (an activity in its work phase of those kinds, or blocked, or none) with
//            another such person within QUIET_REACH tiles in the same space has their want of company eased by QUIET_PER_TICK each tick (one point in
//            150 ticks). Nobody talks and no relation changes; it is being together, not an interaction.
//   earlier  The want of company draws a person from EARLIER_BANDS ([60, 26]) in place of [48, 26]: people go looking for company before they are lonely.
//
// The draft's doses are kept as they were ("trial dose, pending measurement"). Nothing saved; the spatial index is a cache kept beside the world, rebuilt
// each tick. Rich worlds at rules 284 and later only.
import { sameSpace } from './habitation';
import { gridInsert, gridQuery, makeGrid } from './registry';
import { runsRulesVersion } from './rulesversion';
import type { Person, SpatialGrid, World } from './types';

export const QUIET_FROM = 284;
export const QUIET_PER_TICK = 1 / 150;
export const QUIET_REACH = 3;
export const EARLIER_BANDS: [number, number] = [60, 26];

const on = { quiet: true, earlier: true };
export type QuietCompanyPart = keyof typeof on;
export const QUIET_COMPANY_PARTS = Object.keys(on) as QuietCompanyPart[];
export const quietCompanyPartOn = (part: QuietCompanyPart): boolean => on[part];
export function setQuietCompany(enabled: boolean, part?: QuietCompanyPart): void {
  if (part) on[part] = enabled;
  else for (const k of QUIET_COMPANY_PARTS) on[k] = enabled;
}
const partOn = (w: World, part: QuietCompanyPart): boolean => on[part] && w.settings.dynamics === 'rich' && runsRulesVersion(w, QUIET_FROM);

/** part earlier: the social drive's bands, or null for the ordinary ones (needs.ts drive) */
export const earlierCompanyBands = (w: World): [number, number] | null => (partOn(w, 'earlier') ? EARLIER_BANDS : null);

const eligible = (p: Person): boolean => p.alive && p.pose !== 'sleep' && (!p.activity ||
  (p.activity.phase === 'work' && p.activity.kind !== 'sleep' &&
    (!!p.activity.blocked || ['rest', 'warm', 'eat', 'eat_store', 'drink'].includes(p.activity.kind))));

/** part quiet: one person's tick, against the given index */
export function quietCompanyTick(w: World, p: Person, grid: SpatialGrid): void {
  if (!partOn(w, 'quiet') || !eligible(p)) return;
  let together = false;
  gridQuery(grid, p.x, p.y, QUIET_REACH, (e) => {
    if (!together && e.ent === 'person' && e.id !== p.id && eligible(e) && sameSpace(w, p, e) && Math.hypot(e.x - p.x, e.y - p.y) <= QUIET_REACH) together = true;
  });
  if (together) p.needs.social = Math.min(100, p.needs.social + QUIET_PER_TICK);
}

/** a disposable index beside the world, never saved */
const grids = new WeakMap<World, SpatialGrid>();
/** part quiet: every person, after movement (world.ts stepWorld) */
export function quietCompanyStep(w: World): void {
  if (!partOn(w, 'quiet')) return;
  let grid = grids.get(w);
  if (!grid) { grid = makeGrid(w.W, w.H); grids.set(w, grid); }
  for (const cell of grid.cells) cell.length = 0;
  for (const p of w.persons) if (eligible(p)) gridInsert(grid, p, p.x, p.y);
  for (const p of w.persons) quietCompanyTick(w, p, grid);
}
