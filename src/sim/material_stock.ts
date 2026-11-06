// Remembered raw material in ordinary storage. Beliefs are prospects, not claims:
// only an ordinary physical withdrawal can establish that any stock is available.
import { isHomeType } from './constants';
import { recentFailure } from './knowledge';
import { runsRulesVersion } from './rulesversion';
import { hasQuarryStock } from './shared_stone';
import type { Belief, Building, ItemKind, Person, World } from './types';

let plans = true, promises = true;
export const storedMaterialPlansOn = (): boolean => plans;
export const storedMaterialPromisesOn = (): boolean => promises;
export function setStoredMaterialPlans(on: boolean): void { plans = on; }
export function setStoredMaterialPromises(on: boolean): void { promises = on; }
export function usesMaterialStock(w: World, purpose: 'plan' | 'promise'): boolean {
  return w.settings.dynamics === 'rich' && runsRulesVersion(w, 40) && (purpose === 'promise' ? promises : plans);
}

export const isStoredRawMaterial = (item: ItemKind): boolean => ['wood', 'stone', 'clay', 'ore'].includes(item);
const accessible = (p: Person, type: string | undefined, hh: number | undefined): boolean =>
  type === 'storehouse' || (isHomeType(type) && hh === p.hhId);

/** Rules 162: the cut stone stacked at a quarry yard is open to its owner household and to everyone when the yard is public. What a person
 * may actually draw is still decided at the yard (facilities.ts withdrawAllowance: earmarks, builders' shares). */
const yardOpen = (w: World, p: Person, item: ItemKind, type: string | undefined, hh: number | undefined): boolean =>
  item === 'stone' && type === 'quarry' && (hh === 0 || hh === p.hhId) && hasQuarryStock(w);

/** No world entity/inventory lookup. Own homes and public stores only (and, from rules 162, a quarry yard's stone): workshop
 * earmarks, other homes, granary shares and cart ownership keep their existing rules. */
export function rememberedMaterialStores(w: World, p: Person, item: ItemKind): Belief[] {
  if (!isStoredRawMaterial(item)) return [];
  const found: Belief[] = [];
  for (const id of p.bykind.building ?? []) {
    const b = p.beliefs[id];
    if (b?.kind !== 'building' || !(accessible(p, b.btype, b.hh) || yardOpen(w, p, item, b.btype, b.hh)) || (b.items?.[item] ?? 0) < 1) continue;
    if (recentFailure(w, p, b.id, 320)) continue;
    found.push(b);
  }
  return found;
}

/** The matching execution boundary, checked again if ownership changes mid-walk/work. */
export function mayCollectMaterialStock(p: Person, building: Building, w?: World, item?: ItemKind): boolean {
  return accessible(p, building.type, building.hhId) || (!!w && !!item && yardOpen(w, p, item, building.type, building.hhId));
}
