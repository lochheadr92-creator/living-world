// A READ-ONLY WATCH ON "EAT FROM A STORE".
//
// The household food loop only counts if the food a household keeps can actually be eaten by the people it was kept for. This
// watches every finished `eat_store` activity of a world and says WHY the ones that failed failed, at the moment they failed:
//
//   packFull   the store held food and the person's pack had no room for even one unit of it
//   empty      the store really held no food (a stale belief)
//   gone       the building or pile was no longer there
//   other      the store held food and the pack had room, and it still failed (unexplained)
//
// It only reads. It installs `world.hooks.onActivityStart` (hooks are not saved and not hashed: `src/app/save.ts` NOT_SAVED), reads
// `p.lastResult` and the target's store after each tick, and writes nothing to the world. `tests/storewatch.test.ts` holds that
// to a hash comparison against an unwatched run.
import { foodUnits, invRoom } from '../../src/sim/economy';
import type { World } from '../../src/sim/types';

export interface StoreMeals {
  /** finished eat_store activities that fed somebody */
  ok: number;
  /** finished eat_store activities that failed, by the reason they failed */
  failed: number;
  packFull: number;
  empty: number;
  gone: number;
  other: number;
  /** set aside for something else before they finished: not a success and not a failure of the store */
  interrupted: number;
  /** of the failures, how many were by somebody already hungry enough to be in trouble (hunger below 25) */
  failedWhileStarving: number;
}

export const emptyStoreMeals = (): StoreMeals => ({ ok: 0, failed: 0, packFull: 0, empty: 0, gone: 0, other: 0, interrupted: 0, failedWhileStarving: 0 });

export interface StoreWatch {
  meals: StoreMeals;
  /** point the watch at a world (again after a save and load, which builds a new world object) */
  attach(world: World): void;
  /** read what finished this tick; call once after each `stepWorld` */
  scan(world: World): void;
}

/** One finished store meal, for a caller that wants the story and not only the counts. */
export interface StoreMealEvent {
  tick: number;
  personId: number;
  hhId: number;
  outcome: 'success' | 'failed' | 'interrupted';
  /** why it failed (absent unless it failed) */
  why?: 'packFull' | 'empty' | 'gone' | 'other';
  /** the store or pile it was about */
  targetId: number;
  /** hunger when the result was written, 0 = starving */
  hunger: number;
  detail: string;
}

export function watchStoreMeals(onMeal?: (e: StoreMealEvent) => void): StoreWatch {
  const meals = emptyStoreMeals();
  const target = new Map<number, { kind: string; id: number }>();
  const seen = new Map<number, number>();
  return {
    meals,
    attach(world) {
      const before = world.hooks?.onActivityStart;
      world.hooks = {
        ...world.hooks,
        onActivityStart: (p, a) => {
          before?.(p, a);
          target.set(p.id, { kind: a.kind, id: a.targetId });
        },
      };
    },
    scan(world) {
      for (const p of world.persons) {
        const r = p.lastResult;
        if (!r || r.tick === seen.get(p.id)) continue;
        seen.set(p.id, r.tick);
        const t = target.get(p.id);
        if (!t || t.kind !== 'eat_store') continue;
        const told = (why?: StoreMealEvent['why']) =>
          onMeal?.({ tick: r.tick, personId: p.id, hhId: p.hhId, outcome: r.outcome === 'success' ? 'success' : r.outcome === 'interrupted' ? 'interrupted' : 'failed', why, targetId: t.id, hunger: Math.round(p.needs.hunger), detail: r.detail });
        if (r.outcome === 'success') {
          meals.ok++;
          told();
        } else if (r.outcome === 'interrupted') {
          meals.interrupted++;
          told();
        } else {
          meals.failed++;
          if (p.needs.hunger < 25) meals.failedWhileStarving++;
          const e = world.byId.get(t.id);
          const items = e && e.ent === 'building' ? e.store.items : e && e.ent === 'pile' ? e.items : null;
          if (!items) {
            meals.gone++;
            told('gone');
          } else if (foodUnits(items) <= 0) {
            meals.empty++;
            told('empty');
          } else if (invRoom(world, p, 'berries') <= 0) {
            meals.packFull++;
            told('packFull');
          } else {
            meals.other++;
            told('other');
          }
        }
      }
    },
  };
}
