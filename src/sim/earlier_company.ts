// Experimental separate switch: see company earlier; dose pending measurement.
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';
let enabled = true;
export const setEarlierCompany = (value: boolean): void => { enabled = value; };
export const earlierCompanyOn = (): boolean => enabled;
export const earlierCompanyBands = (world: World): [number, number] | null =>
  enabled && world.settings.dynamics === 'rich' && runsRulesVersion(world, 263) ? [60, 26] : null;
