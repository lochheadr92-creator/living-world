// Rules 172: the recruit cap counts help the asker has themselves, plus help they were told was promised,
// not every living person's true commitment. Before 172 optRecruit called helpersOn, which walks the whole register.
// Below rules 82 there is no expectation memory. A row with no expectation still counts while its outcome is 'promised'.
import { expectedStatus } from './promise_expectations';
import { runsRulesVersion } from './rulesversion';
import type { Person, World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): `rich-no-heard-helpers` restores the global helper count inside a rules-172 rich world. */
export const heardHelpersOn = (): boolean => enabled;
export function setHeardHelpers(on: boolean): void { enabled = on; }
export const hasHeardHelpers = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 172);

const HELPING = new Set(['help_build', 'haul', 'work']);

/** Asker's own active help on that site, plus distinct people the asker still remembers as having promised. */
export function heardHelpers(world: World, asker: Person, siteId: number): number {
  let n = 0;
  if (asker.commitments.some((c) => c.status === 'active' && c.siteId === siteId && HELPING.has(c.kind))) n++;
  const seen = new Set<number>();
  for (const m of asker.socialMemory ?? []) {
    if (m.role !== 'asker' || m.siteId !== siteId) continue;
    const still = m.expectation ? expectedStatus(world, asker, m).status === 'promised' : m.outcome === 'promised';
    if (!still || seen.has(m.otherId)) continue;
    seen.add(m.otherId);
    n++;
  }
  return n;
}
