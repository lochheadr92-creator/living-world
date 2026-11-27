// Experimental candidate: quiet company is not an interaction or relationship memory.
import { sameSpace } from './habitation';
import { gridInsert, gridQuery, makeGrid } from './registry';
import { runsRulesVersion } from './rulesversion';
import type { Person, SpatialGrid, World } from './types';

let enabled = true;
export const setQuietCompany = (value: boolean): void => { enabled = value; };
export const quietCompanyOn = (): boolean => enabled;
// Trial dose: one point per 150 ticks together. A proposal pending measurement.
export const QUIET_COMPANY_PER_TICK = 1 / 150;
const eligible = (p: Person): boolean => p.alive && p.pose !== 'sleep' && (!p.activity ||
  (p.activity.phase === 'work' && p.activity.kind !== 'sleep' &&
    (!!p.activity.blocked || ['rest', 'warm', 'eat', 'eat_store', 'drink'].includes(p.activity.kind))));
export function quietCompanyTick(w: World, p: Person, grid: SpatialGrid = w.pgrid): void {
  if (!enabled || w.settings.dynamics !== 'rich' || !runsRulesVersion(w, 262) || !eligible(p)) return;
  let together = false;
  gridQuery(grid, p.x, p.y, 3, e => {
    if (e.ent === 'person' && e.id !== p.id && eligible(e) && sameSpace(w, p, e) && Math.hypot(e.x - p.x, e.y - p.y) <= 3) together = true;
  });
  if (together) p.needs.social = Math.min(100, p.needs.social + QUIET_COMPANY_PER_TICK);
}


/** The private index is a disposable cache, never saved or shared between worlds. */
const grids = new WeakMap<World, SpatialGrid>();
/** Refresh positions after movement, so cell boundaries cannot hide a nearby companion. */
export function quietCompanyStep(w: World): void {
  if (!enabled || w.settings.dynamics !== 'rich' || !runsRulesVersion(w, 262)) return;
  let grid = grids.get(w);
  if (!grid) { grid = makeGrid(w.W, w.H); grids.set(w, grid); }
  for (const cell of grid.cells) cell.length = 0;
  for (const p of w.persons) if (eligible(p)) gridInsert(grid, p, p.x, p.y);
  for (const p of w.persons) quietCompanyTick(w, p, grid);
}
