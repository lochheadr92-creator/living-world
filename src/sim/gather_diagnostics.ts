import type { Activity, ItemKind } from './types';

/** Optional, unsaved measurements for a chosen gather's uncapped plan. Off by default. */
export interface GatherDiagnostic {
  item: ItemKind;
  requestedUnits: number;
  believedSourceUnits: number;
  wantedUnits: number;
  roomUnits: number;
  plannedUnits: number;
}

let enabled = false;
const byActivity = new WeakMap<Activity, GatherDiagnostic>();
export const gatherDiagnosticsOn = (): boolean => enabled;
export const setGatherDiagnostics = (on: boolean): void => { enabled = on; };
export const recordGatherDiagnostic = (activity: Activity, value: GatherDiagnostic): void => { if (enabled) byActivity.set(activity, value); };
export const readGatherDiagnostic = (activity: Activity): GatherDiagnostic | null => byActivity.get(activity) ?? null;
