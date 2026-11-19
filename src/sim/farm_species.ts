import { DAY, TICKS_PER_YEAR } from './constants';
import { runsRulesVersion } from './rulesversion';
import type { Animal, BuildingType, FarmSpecies, World } from './types';

export const farmEnabled = (w: World) => w.settings.dynamics === 'rich' && runsRulesVersion(w, 260);
const days = (days: number) => Math.round(days * TICKS_PER_YEAR / 365);
// Calendar days scaled to the world's twelve-day year. Litter sizes are settlement-scale design values.
export const FARM_SPECIES = {
  cow: { gestation: days(283), mature: days(450), recovery: days(80), litter: 1, meat: 12, feed: 1.5 },
  pig: { gestation: days(114), mature: days(210), recovery: days(35), litter: 5, meat: 7, feed: 1 },
  chicken: { gestation: days(21), mature: days(150), recovery: days(21), litter: 3, meat: 1, feed: .25 },
  goat: { gestation: days(150), mature: days(210), recovery: days(90), litter: 2, meat: 3, feed: .7 },
  sheep: { gestation: days(150), mature: days(240), recovery: days(90), litter: 2, meat: 4, feed: .8 },
} as const;
export function adultMeatPortions(w: World, species: FarmSpecies): number {
  const portions = FARM_SPECIES[species].meat;
  return runsRulesVersion(w, 263) ? portions * 4 : portions;
}

export function breedingSeason(w:World,species:FarmSpecies){
  if(species!=='goat'&&species!=='sheep')return true;
  return w.tick%TICKS_PER_YEAR>=TICKS_PER_YEAR/2;
}
export const speciesOf = (a: Animal): FarmSpecies => {
  if (a.type === 'wolf' || a.type === 'deer') throw Error('Wild animal has no farm profile');
  return a.type;
};
export const maturity = (w: World, a: Animal) => farmEnabled(w) ? FARM_SPECIES[speciesOf(a)].mature : 8 * DAY;
export const housingCapacity = (kind: BuildingType) => kind === 'barn' ? 8 : kind === 'paddock' ? 6 : kind === 'chicken_cage' ? 12 : 0;
export function houses(kind: BuildingType, species: FarmSpecies) {
  return species === 'chicken' ? kind === 'chicken_cage' : kind === 'barn' || kind === 'paddock';
}
export function homeForAnimal(w: World, a: Animal) {
  const home = w.byId.get(a.sheep?.housing ?? 0);
  return home?.ent === 'building' && home.hhId === a.sheep?.hhId && home.condition > 0 && houses(home.type, speciesOf(a)) ? home : undefined;
}
