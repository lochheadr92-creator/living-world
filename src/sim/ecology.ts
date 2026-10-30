import { DAY } from './constants';
import { runsRulesVersion } from './rulesversion';
import type { Belief, Plot, Source, World } from './types';

/** Productive condition belongs to a tile, not the replaceable plant or crop on it.
 * Stock remains in the existing source/plot and its material ledger. */
export interface EcologicalCondition {
  condition: number;
  lastUse: number;
  lastTended?: number;
}
export type EcologicalSign = 'vigorous' | 'strained' | 'worn';
let ecologyOn = true;
export function setEcology(on: boolean): void { ecologyOn = on; }
export const ecologyEnabled = (): boolean => ecologyOn;
export const hasEcology = (w: World): boolean => ecologyOn && w.settings.dynamics === 'rich' && runsRulesVersion(w, 86);
export const biological = (s: Pick<Source, 'type'>): boolean => ['tree', 'berry_bush', 'fruit_tree', 'wild_grain', 'fish_spot'].includes(s.type);
const tile = (w: World, x: number, y: number): number => Math.floor(y) * w.W + Math.floor(x);
export function conditionAt(w: World, x: number, y: number): number {
  return hasEcology(w) ? w.ecology?.[tile(w, x, y)]?.condition ?? 1 : 1;
}
export const ecologicalSign = (condition: number): EcologicalSign => condition < 0.45 ? 'worn' : condition < 0.8 ? 'strained' : 'vigorous';
export function productiveRate(w: World, x: number, y: number): number { return 0.25 + 0.75 * conditionAt(w, x, y); }
function place(w: World, x: number, y: number): EcologicalCondition {
  return (w.ecology ??= {})[tile(w, x, y)] ??= { condition: 1, lastUse: w.tick };
}
/** Called only after actual extraction; reservations and subsequent transfers have no ecological cost. */
export function harvestPressure(w: World, s: Source, n: number): void {
  if (!hasEcology(w) || !biological(s) || n <= 0) return;
  const c = place(w, s.x, s.y);
  // Reconstruct each removed unit's remaining stock so a multi-unit transfer has the same cost.
  for (let i = 0; i < n; i++) c.condition = Math.max(0.15, c.condition - (s.amount + n - i - 1 < s.max / 2 ? 0.035 : 0.008));
  c.lastUse = w.tick;
}
export function cultivationPressure(w: World, pl: Plot): void {
  if (!hasEcology(w)) return;
  const c = place(w, pl.x, pl.y);
  c.condition = Math.max(0.15, c.condition - 0.16);
  c.lastUse = w.tick;
}
export function fieldResting(w: World, pl: Plot): boolean {
  return hasEcology(w) && pl.state === 'tilled' && (pl.fallowUntil ?? 0) > w.tick;
}
/** Soil care is real weeding/loosening/watering work; repeated callbacks cannot multiply it. */
export function tendCondition(w: World, pl: Plot, watered: boolean): void {
  if (!hasEcology(w)) return;
  const c = w.ecology?.[tile(w, pl.x, pl.y)];
  if (!c) return;
  if (c.lastTended !== undefined && w.tick - c.lastTended < 900) return;
  c.condition = Math.min(1, c.condition + (watered ? 0.04 : 0.015));
  c.lastTended = w.tick;
}
/** At most one entry per map tile; a single deterministic pass each 60 ticks.
 * A covered place or a growing/standing crop cannot recover by being called "rested". */
export function updateEcology(w: World): void {
  if (!hasEcology(w) || !w.ecology || w.tick % 60 !== 0) return;
  for (const key of Object.keys(w.ecology)) {
    const i = Number(key), c = w.ecology[i];
    if (c.condition >= 1 || w.tick - c.lastUse < DAY / 2) continue;
    const e = w.byId.get(w.occ[i]);
    if (e && e.ent !== 'source' && e.ent !== 'plot') continue;
    if (e?.ent === 'source' && !biological(e)) continue;
    if (e?.ent === 'plot' && (e.state === 'growing' || e.state === 'ripe' || e.state === 'tilling')) continue;
    const moisture = e?.ent === 'source' && e.type === 'fish_spot' ? 1 : Math.min(1.5, 0.5 + w.weather.rain + (w.waterDist[i] < 9 ? 0.25 : 0));
    const climate = (w.weather.temp < 4 ? 0.25 : 1) * (w.hardship?.kind === 'dry' ? 0.3 : 1);
    const rested = e?.ent === 'plot' && fieldResting(w, e) ? 2 : 1;
    c.condition = Math.min(1, c.condition + (0.06 * 60 / DAY) * moisture * climate * rested);
  }
}
/** Choice reads a dated coarse observation, never the hidden tile record. */
export function rememberedConditionCost(w: World, b: Belief): number {
  if (!hasEcology(w) || !b.ecology) return 0;
  const stale = Math.max(0, 1 - Math.max(0, w.tick - b.seen) / (4 * DAY));
  return (b.ecology === 'worn' ? 5 : b.ecology === 'strained' ? 2 : 0) * stale;
}
export function rememberedGrowth(w: World, b: Belief): number {
  if (!hasEcology(w) || !b.ecology) return 1;
  return b.ecology === 'worn' ? 0.45 : b.ecology === 'strained' ? 0.7 : 1;
}
export function ecologyNotes(w: World, x: number, y: number): string[] {
  if (!hasEcology(w)) return [];
  const c = w.ecology?.[tile(w, x, y)];
  const age = (t: number): string => w.tick-t < 60 ? 'just now' : `${((w.tick-t)/DAY).toFixed(1)} days ago`;
  return [`Productive condition: ${ecologicalSign(c?.condition ?? 1)}. Repeated use slows future growth; rest and field care help recovery.`, ...(c ? [`Last harvested or sown ${age(c.lastUse)}${c.lastTended === undefined ? '' : `; last soil care ${age(c.lastTended)}`}. Recovery depends on weather and use, with no fixed completion time.`] : [])];
}
export function validateEcology(w: World): void {
  const eligible = w.settings.dynamics === 'rich' && runsRulesVersion(w, 86);
  const fail = (): never => { throw new Error('invalid saved ecological condition'); };
  const tick = (x: unknown): x is number => Number.isInteger(x) && (x as number) >= 0 && (x as number) <= w.tick;
  if (w.ecology !== undefined) {
    if (!eligible || !w.ecology || typeof w.ecology !== 'object' || Array.isArray(w.ecology) || Object.keys(w.ecology).length > w.W * w.H) fail();
    for (const [key, c] of Object.entries(w.ecology)) {
      const i = Number(key);
      if (!Number.isInteger(i) || String(i) !== key || i < 0 || i >= w.W * w.H || !c || Object.keys(c).some(k => !['condition','lastUse','lastTended'].includes(k)) || !Number.isFinite(c.condition) || c.condition < 0.15 || c.condition > 1 || !tick(c.lastUse) || (c.lastTended !== undefined && !tick(c.lastTended))) fail();
    }
  }
  for (const pl of w.plots) if (pl.fallowUntil !== undefined && (!eligible || pl.state !== 'tilled' || !Number.isInteger(pl.fallowUntil) || pl.fallowUntil < 0 || pl.fallowUntil > w.tick + 3 * DAY)) fail();
  for (const p of w.persons) for (const b of Object.values(p.beliefs)) {
    if (b.ecology !== undefined && (!eligible || (!Number.isSafeInteger(b.seen) || b.seen > w.tick || !['vigorous','strained','worn'].includes(b.ecology)) || (b.kind !== 'plot' && !biological({ type: b.kind as Source['type'] })))) fail();
    if (b.fallowUntil !== undefined && (!eligible || b.kind !== 'plot' || b.state !== 'tilled' || !Number.isInteger(b.fallowUntil) || b.fallowUntil < 0 || b.fallowUntil > b.seen + 3 * DAY)) fail();
  }
}
