// One physical hand-over: stay with a recipient in the same home, retain contact, and count only actual receipt.
// No new admission permission, saved state or direct-control path.
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';
let enabled = true;
export const localGivingOn = (): boolean => enabled;
export function setLocalGiving(on: boolean): void { enabled = on; }
export const hasLocalGiving = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 62);
