// Rules 178: the candidate's "enough hands already" refusal of a recruit counts the hands the candidate knows of.
//
// Rules 172 made the asker's cap count what the asker undertook and was promised. The candidate's own refusal in
// `social.ts` (`case 'recruit'`) still tested `helpersOn`, which walks every living person's commitment to the site, so a
// candidate across the settlement refused to help a site because of crews they could not know of. Here the candidate counts
// distinct hands of three kinds: their own active help on the site, people they remember having promised them help there
// (the rules-172 reading of the social memory), and people they currently see building or hauling within a few tiles of it.
// The count replaces `helpersOn` in that one refusal. A candidate who knows of no one is no longer refused on the true count,
// so a site can collect more helpers than its cap; a candidate at the site who sees a full crew still refuses. No benefit is claimed.
import { expectedStatus } from './promise_expectations';
import { runsRulesVersion } from './rulesversion';
import type { Person, World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): `rich-no-known-hands` restores the global helper count inside a rules-178 rich world. */
export const knownHandsOn = (): boolean => enabled;
export function setKnownHands(on: boolean): void { enabled = on; }
export const hasKnownHands = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 178);

const HELPING = new Set(['help_build', 'haul', 'work']);
const VISIBLE_WORK = new Set(['build', 'haul']);
/** How near the site, in tiles, somebody seen building or hauling is taken to be working it. */
export const SITE_NEAR = 4;

/** Distinct people the candidate knows to be helping at the site: themselves, those they remember as promised, those in sight at it. */
export function knownHands(world: World, candidate: Person, siteId: number): number {
  const ids = new Set<number>();
  if (candidate.commitments.some((c) => c.status === 'active' && c.siteId === siteId && HELPING.has(c.kind))) ids.add(candidate.id);
  for (const m of candidate.socialMemory ?? []) {
    if (m.role !== 'asker' || m.siteId !== siteId) continue;
    const still = m.expectation ? expectedStatus(world, candidate, m).status === 'promised' : m.outcome === 'promised';
    if (still) ids.add(m.otherId);
  }
  const site = world.byId.get(siteId);
  if (site) {
    for (const s of candidate.seen) {
      if (s.ent !== 'person' || s.id === candidate.id || !VISIBLE_WORK.has(s.act)) continue;
      if (Math.hypot(s.x - site.x, s.y - site.y) <= SITE_NEAR) ids.add(s.id);
    }
  }
  return ids.size;
}
