// What a building is really doing right now, read from the simulation's own state (never invented):
// a workshop is "working" when someone has put work into its running batch in the last moments, "burning" while the batch is in
// its fire phase; a home is "occupied" when its household is nearby; a hall is "occupied" when a meal is under way or people are
// gathered at it. Smoke, forge glow, lit windows and sawdust are drawn from these.
import type { Building, World } from '../sim/types';

export interface WorkState {
  /** a batch is in progress */
  job: boolean;
  /** somebody worked on it very recently (the work phase) */
  working: boolean;
  /** its fire is burning (the batch is in the burn phase) */
  burning: boolean;
  recipe: string;
}

const NONE: WorkState = { job: false, working: false, burning: false, recipe: '' };
const RECENT = 24;

export function workState(world: World, b: Building): WorkState {
  const ops = b.ops;
  const job = ops ? ops.job : null;
  if (!ops || !job) return NONE;
  let working = false;
  if (job.phase === 'work') {
    for (const k in ops.present) {
      if (world.tick - ops.present[k as unknown as number] < RECENT) {
        working = true;
        break;
      }
    }
  }
  return { job: true, working, burning: job.phase === 'burn', recipe: job.recipe };
}

/** is the household of a home nearby (so the hearth is lit and the windows glow in the evening)? */
export function homeOccupied(world: World, b: Building): boolean {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  for (const p of world.persons) {
    if (p.hhId === b.hhId && Math.hypot(p.x - cx, p.y - (cy + 0.8)) < 3.6) return true;
  }
  return false;
}

/** people gathered at a hall, or a meal being served in it */
export function hallOccupied(world: World, b: Building): boolean {
  for (const m of world.meals) if (m.placeId === b.id && (m.status === 'gathering' || m.status === 'eating')) return true;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h + 0.4;
  for (const p of world.persons) {
    if (!p.alive || p.pose === 'walk' || p.pose === 'run' || p.pose === 'sleep') continue;
    if (Math.hypot(p.x - cx, p.y - cy) < 3.2) return true;
  }
  return false;
}
