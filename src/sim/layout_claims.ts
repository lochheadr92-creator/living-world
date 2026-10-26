// Execution-boundary arbitration, not an input to personal option scores or beliefs.
// Existing accepted activities are the sole authority; no second claim ledger or timer.
import { BUILD_DEF, isHomeType } from './constants';
import { isRich } from './mood';
import { runsRulesVersion } from './rulesversion';
import type { Activity, BuildingType, Person, World } from './types';

export const LAYOUT_OCCUPANCY_WAIT = 90;
export const hasLayoutClaims = (w: World): boolean => isRich(w) && runsRulesVersion(w, 30);

function footprint(a: Activity) {
  const type = a.data.type as BuildingType;
  const def = BUILD_DEF[type];
  if (!def || !Number.isInteger(a.data.sx) || !Number.isInteger(a.data.sy)) return null;
  return { x: a.data.sx as number, y: a.data.sy as number, w: def.w, h: def.h, home: isHomeType(type) };
}

/** Active, living, unexpired owners only; suspended work has released its claim. */
export function liveLayoutClaims(w: World): { owner: Person; activity: Activity }[] {
  if (!hasLayoutClaims(w)) return [];
  return w.persons.filter(p => p.alive && p.activity?.kind === 'plan_site'
    && p.activity.data.layoutClaimed === true && p.activity.targetId === 0
    && p.activity.expire >= w.tick && p.hhId === p.activity.data.hh)
    .map(p => ({ owner:p, activity:p.activity! }))
    .sort((a,b) => a.activity.start-b.activity.start || a.activity.id-b.activity.id || a.owner.id-b.owner.id);
}

/** A physical scheduling constraint at acceptance/re-acquisition, never a planner's remote knowledge. */
export function layoutClaimBlock(w: World, p: Person, a: Activity): string | null {
  if (!hasLayoutClaims(w) || a.kind !== 'plan_site') return null;
  if (!p.alive || a.expire < w.tick || p.hhId !== a.data.hh) return 'the layout no longer belongs to an available household member';
  const box = footprint(a);
  if (!box) return 'the layout footprint is invalid';
  for (const {owner,activity} of liveLayoutClaims(w)) {
    if (owner.id === p.id) continue;
    const other=footprint(activity);
    if (!other) continue;
    if (box.home && other.home && a.data.hh === activity.data.hh) return 'the household already has a home layout under way';
    // Keep the same one-tile separation that the ordinary placement search requires.
    if (box.x < other.x+other.w+1 && box.x+box.w+1 > other.x
      && box.y < other.y+other.h+1 && box.y+box.h+1 > other.y) return 'another layout already reserves this footprint or its access gap';
  }
  return null;
}

export function footprintOccupied(w: World, x: number, y: number, width: number, height: number): boolean {
  return w.persons.some(p => p.alive && !p.indoors && Math.floor(p.x)>=x && Math.floor(p.x)<x+width
    && Math.floor(p.y)>=y && Math.floor(p.y)<y+height);
}

/** Future-relevant claim/wait state, including a paused activity that may reacquire. */
export function layoutFingerprint(p: Person): string {
  return JSON.stringify([p.activity,p.suspended].map(a => a?.kind==='plan_site'
    ? [a.id,a.data.type,a.data.hh,a.data.sx,a.data.sy,a.data.upgradeOf??0,a.expire,a.data.layoutClaimed??false,a.data.layoutWaitSince??null] : null));
}
