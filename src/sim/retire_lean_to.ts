import { newActivity } from './activities';
import { isSolidHome } from './constants';
import { invRoom, isEmptyItems } from './economy';
import { addEvent } from './events';
import { delBelief, noteFailure, recentFailure } from './knowledge';
import { addOption, beliefsByKind, eta, pen, spotNear, type Ctx } from './optutil';
import { isWalkable, unregisterBuilding } from './registry';
import { currentRelocation } from './relocation';
import { runsRulesVersion } from './rulesversion';
import type { Building, ItemKind, Person, World } from './types';

export const DISMANTLE_TICKS = 40;
const enabled = (w: World) => w.settings.dynamics === 'rich' && runsRulesVersion(w, 273);

function knowsReplacement(ctx: Ctx): boolean {
  if (!ctx.hh || !enabled(ctx.world) || currentRelocation(ctx.hh)) return false;
  const home = ctx.p.beliefs[ctx.hh.homeId];
  return !!home && home.hh === ctx.hh.id && isSolidHome(home.btype) && home.cond !== 0;
}

export function remembersRetiredShelter(ctx: Ctx, b: { btype?: string; hh?: number }): boolean {
  return b.btype === 'lean_to' && b.hh === ctx.p.hhId && knowsReplacement(ctx);
}

export function oldShelterOptions(ctx: Ctx): void {
  const { world, p } = ctx;
  if (!knowsReplacement(ctx)) return;
  for (const old of beliefsByKind(p, ['building'])) {
    if (old.btype !== 'lean_to' || old.hh !== p.hhId) continue;
    ctx.options = ctx.options.filter(o => !(o.targetId === old.id && o.kind === 'deposit' && o.tag === 'store'));
    if (ctx.stage === 'child' || ctx.critical || recentFailure(world, p, old.id, 320)) continue;
    const items = old.items ?? {};
    if (!isEmptyItems(items) && !Object.entries(items).some(([k,n]) => n > 0 && invRoom(world,p,k as ItemKind) > 0)) continue;
    const travel = eta(ctx, old.x, old.y);
    const utility = 58 - pen(travel);
    const goal = 'We have a permanent home and can take down our old shelter';
    addOption(ctx, {
      kind: 'withdraw', key: `clear-lean-to:${old.id}`, label: 'Clear the old lean-to',
      goal, need: null, util: utility, parts: [['clear our old shelter', 58], ['walking', -pen(travel)]],
      eta: travel + DISMANTLE_TICKS, targetId: old.id, tag: 'home',
      make: () => {
        const spot = spotNear(world, p, old);
        return spot && newActivity(world, p, {
          kind: 'withdraw', label: 'Clearing the old lean-to', goal, targetId: old.id, targetType: 'building',
          tx: old.x, ty: old.y, spotX: spot.x, spotY: spot.y, utility, maxTicks: 800,
          data: { clearLeanTo: true, items: { ...items } },
        });
      },
    });
  }
}

// Check both at arrival and immediately before moving any stock or releasing the footprint.
export function clearanceBlocker(w: World, p: Person, b: Building): string | undefined {
  const hh = w.households.find(h => h.id === p.hhId);
  const home = hh && w.byId.get(hh.homeId);
  let reason: string | undefined;
  if (!enabled(w) || !hh || b.type !== 'lean_to' || b.hhId !== hh.id ||
      home?.ent !== 'building' || home.hhId !== hh.id || !isSolidHome(home.type) ||
      home.condition <= 0 || !isWalkable(w, home.doorX, home.doorY) ||
      w.households.some(h => h.homeId === b.id)) reason = 'the household still needs this shelter';
  else if (currentRelocation(hh) || b.upgrading || b.inside.length ||
      w.meals.some(m => m.placeId === b.id && m.status !== 'done' && m.status !== 'cancelled') ||
      w.persons.some(q => q.alive && (q.indoors === b.id ||
        (q.activity?.targetId === b.id && !q.activity.data.clearLeanTo) ||
        q.commitments.some(c => c.status === 'active' && c.destId === b.id)))) reason = 'the old shelter is still in use';
  if (reason) noteFailure(w, p, b.id, reason);
  return reason;
}

export function takeDownEmptyShelter(w: World, p: Person, b: Building): boolean {
  if (!isEmptyItems(b.store.items)) return false;
  unregisterBuilding(w, b);
  delBelief(p, b.id);
  addEvent(w, 'build', `${p.name} took down the household’s old lean-to.`, [p.id, b.id], b.x, b.y);
  return true;
}
