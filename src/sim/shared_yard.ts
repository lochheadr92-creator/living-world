// Rules 201: the first timber yard a person knows of is laid out as a shared project.
//
// Fibre, nets, traps, garments, blankets and bedding are made at a timber yard (production.ts), and a yard belongs to the household
// that laid it out: everyone else has access level none unless they built a fifth of it or are close to one of its members
// (facilities.ts accessLevel). In the census of 11 November 2026 (twelve seeds, 25 days, rules 196, docs/MECHANISM_CENSUS_20261111.md)
// a settlement had one yard, and about 8,100 sampled decisions per settlement wanted that work and were blocked "does not know of a
// timber yard they may use". The shared layout has existed since rules 143 (shared_projects.ts, act_build.ts: a site with no
// household, proposed as a civic project, access level communal), but only as a second option for a generous person with neighbours in
// sight, and the workshop planner never offers it.
//
// At 201, when a person lays out a timber yard and believes in no timber yard at all (no building and no site of that type among
// their beliefs) and is not already organising an active shared project, the layout is the shared one: the same spot, the same
// materials, the site without a household, proposed to the township as the first storehouse is. A later yard, laid out by somebody who
// knows of one, is private as before. Rules 200 and earlier, authored worlds and `setSharedYard(false)` keep the private layout.
// The second part of rules 201, a site that has waited provoking the ask for what it lacks, is stalled_ask.ts.
import { runsRulesVersion } from './rulesversion';
import { mayShareType } from './shared_projects';
import type { BuildingType, Person, World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): off, a rules-201 rich world lays out every timber yard privately again. */
export const sharedYardOn = (): boolean => enabled;
export function setSharedYard(on: boolean): void { enabled = on; }
export const hasSharedYard = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 201);

/** Should this layout be the shared one? Only a timber yard, only at 201, only for somebody who believes in no yard yet. */
export function firstYardShared(w: World, p: Person, type: BuildingType): boolean {
  if (type !== 'timber_yard' || !hasSharedYard(w) || !mayShareType(w, type)) return false;
  for (const k in p.beliefs) {
    const b = p.beliefs[k as unknown as number];
    if ((b.kind === 'building' || b.kind === 'site') && b.btype === 'timber_yard') return false;
  }
  return !w.civicProjects?.some((q) => q.organiserId === p.id && q.status === 'active');
}
