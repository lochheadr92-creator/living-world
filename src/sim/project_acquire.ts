// Rules 117, F1: project steps already express the remaining input quantity.
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';
let enabled = true;
export const projectAcquireOn = () => enabled;
export function setProjectAcquire(on: boolean): void { enabled = on; }
export const hasProjectAcquire = (w: World) => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 117);
