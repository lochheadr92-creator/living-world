import { TICKS_PER_YEAR } from './constants';
import { hashUnit } from './rng';
import type { Person, Relation } from './types';
import { clamp } from './util';

export function newRelation(): Relation {
  return { affinity: 0, trust: 10, familiarity: 0, lastMet: -99999, kin: '', avoidUntil: 0, debt: 0, history: [], grievance: null, settledAt: -99999, hearsay: 0 };
}

export function relOf(p: Person, otherId: number): Relation {
  let r = p.relations[otherId];
  if (!r) {
    r = newRelation();
    p.relations[otherId] = r;
  }
  return r;
}

export function peekRel(p: Person, otherId: number): Relation | undefined {
  return p.relations[otherId];
}

export function affinityOf(p: Person, otherId: number): number {
  return p.relations[otherId]?.affinity ?? 0;
}

export function trustOf(p: Person, otherId: number): number {
  return p.relations[otherId]?.trust ?? 10;
}

export function familiarityOf(p: Person, otherId: number): number {
  return p.relations[otherId]?.familiarity ?? 0;
}

/**
 * Is there a spark between these two? A fixed, symmetric property of the pair: most pairs of adults are only ever
 * friends; some click. (Pairs of the same sex click less often than mixed pairs.)
 */
export function spark(a: Person, b: Person): boolean {
  const lo = Math.min(a.id, b.id);
  const hi = Math.max(a.id, b.id);
  if (hashUnit(lo, hi, 11) >= 0.5) return false;
  if (Math.abs(a.birthTick - b.birthTick) > 18 * TICKS_PER_YEAR) return false;
  return a.sex !== b.sex || hashUnit(lo, hi, 13) < 0.14;
}

export interface RelChange {
  aff?: number;
  trust?: number;
  fam?: number;
  debt?: number;
  note?: string;
}

/** Apply an experience-based change to how `p` regards `otherId`. */
export function adjustRel(p: Person, otherId: number, tick: number, ch: RelChange): Relation {
  const r = relOf(p, otherId);
  if (ch.aff) r.affinity = clamp(r.affinity + ch.aff, -100, 100);
  if (ch.trust) r.trust = clamp(r.trust + ch.trust, -100, 100);
  if (ch.fam) r.familiarity = clamp(r.familiarity + ch.fam, 0, 60);
  if (ch.debt) r.debt = clamp(r.debt + ch.debt, -10, 10);
  r.lastMet = tick;
  if (ch.note) {
    r.history.push({ tick, text: ch.note });
    if (r.history.length > 6) r.history.shift();
  }
  return r;
}

export function relLabel(r: Relation | undefined): string {
  if (!r) return 'Stranger';
  if (r.kin === 'partner') return 'Partner';
  if (r.kin === 'parent') return 'Parent';
  if (r.kin === 'child') return 'Child';
  if (r.kin === 'sibling') return 'Sibling';
  if (r.familiarity < 1 && r.affinity === 0) return 'Stranger';
  if (r.affinity >= 60) return 'Close friend';
  if (r.affinity >= 32) return 'Friend';
  if (r.affinity >= 10) return 'Friendly';
  if (r.affinity > -12) return 'Acquaintance';
  if (r.affinity > -38) return 'Wary';
  return 'Hostile';
}

/** relationships soften or fade slowly when not reinforced */
export function driftRelations(p: Person): void {
  for (const k in p.relations) {
    const r = p.relations[k as unknown as number];
    if (r.kin) continue;
    r.affinity *= 0.9965;
    if (r.affinity < 0 && r.affinity > -50) r.affinity *= 0.9965; // grudges fade a little faster
    if (Math.abs(r.affinity) < 0.4) r.affinity = 0;
    r.trust += (10 - r.trust) * 0.004;
    if (r.hearsay) r.hearsay = Math.abs(r.hearsay) < 0.05 ? 0 : r.hearsay * 0.998; // the cap hearsay puts on a pair relaxes with time
  }
}
