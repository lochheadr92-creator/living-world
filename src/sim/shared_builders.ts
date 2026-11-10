// Rules 186: a shared building remembers everyone who built it (found by the end-to-end trace of 10 November 2026, docs/END_TO_END_TRACE.md link 36).
//
// `Building.builtBy` was meant to list the builders, and was filled from the site's contribution shares. Those shares are keyed by household id
// and the list keeps person ids only, so nothing in them ever matched and the list held just the person who struck the last blow. A storehouse
// three people built said "Built by: Mona". For a building finished as a township's shared project the people are known: the project record
// keeps each participant's work and materials. At 186 such a building's `builtBy` is every participant who gave work or materials, in the
// order they joined, then the finisher if not already there, and `builtAll` marks the list as complete. It is written after the completion
// aftermath has run, so who is pleased at the finish and in what order is exactly as before: that set was already the finisher and the
// contributing participants. Buildings with no project behind them (homes, a quarry, a timber yard) still record the finisher only, because
// work on a site is credited to a household where it is done (act_build.ts); the inspector calls that "Finished by".
import { runsRulesVersion } from './rulesversion';
import { projectAt } from './townships';
import type { Building, Site, World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): off, a rules-186 rich world records the finisher only, as before. */
export const sharedBuildersOn = (): boolean => enabled;
export function setSharedBuilders(on: boolean): void { enabled = on; }
export const hasSharedBuilders = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 186);

/** Called last in `completeSite` for a new building. Records only; allocates no id and draws no random number. */
export function noteSharedBuilders(world: World, site: Site, b: Building): void {
  if (!hasSharedBuilders(world) || b.built !== world.tick) return;
  const project = projectAt(world, site.id);
  if (!project) return;
  const all: number[] = [];
  for (const m of project.participants) {
    if (!(m.work > 0 || Object.values(m.materials).some((n) => n && n > 0))) continue;
    if (world.byId.get(m.personId)?.ent === 'person' && !all.includes(m.personId)) all.push(m.personId);
  }
  for (const id of b.builtBy ?? []) if (!all.includes(id)) all.push(id);
  b.builtBy = all;
  b.builtAll = true;
}
