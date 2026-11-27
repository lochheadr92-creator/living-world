// Experimental rules 260 candidate: a larger rain-fed groundwater reserve.
// No water is added at activation and the collection rate remains unchanged.
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

export const WATER_RESERVE_FROM = 260;
export const WATER_RESERVE_CAP = 480;
let enabled = true;
export const waterReserveOn = () => enabled;
export function setWaterReserve(on: boolean): void { enabled = on; }
export const canHoldWaterReserve = (w: World): boolean => w.settings.dynamics === 'rich' && runsRulesVersion(w, WATER_RESERVE_FROM);
export const hasWaterReserve = (w: World): boolean => enabled && canHoldWaterReserve(w);
