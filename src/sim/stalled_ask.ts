// Rules 201 (second part, beside shared_yard.ts): a household's site that has stood waiting provokes the ask for what it lacks.
//
// In the census of 11 November 2026 (docs/MECHANISM_CENSUS_20261111.md) about 11,900 sampled decisions per settlement found a site
// "waiting for materials", and hut sites were abandoned for idleness 0.8 times a settlement. The ask that would unstall such a site
// already exists: "building materials for a site I am working on" in optRequest (options_social.ts), made to somebody seen carrying
// the material. It was held back twice: it is not made at all while the asker has a quick trip of their own on the table (a site-tagged
// gather, operate or withdraw under 260 ticks), and it scores a flat 24, level with another trip. A site that has stood for a day shows
// that the trips have not been enough.
//
// At 201 the ask knows how long the site has waited. The wait is read as the asker could know it: the site records when it was last
// worked (Site.lastWorkTick, createdTick), a person who has looked at their own site has seen that, and the wait counts from then; when
// somebody has worked on it since the asker last looked, only the time since their own last look is counted, so the figure is never
// more than they could know, and a site known only by hearsay counts as not waiting. From half a day of waiting the ask gains weight,
// rising to STALL_MAX at two days ("the site has stood waiting"); from a day of waiting it is made even when a quick trip of the
// asker's own is on the table. Who is asked, the cooldowns, the commitments cap and the answer are unchanged. No new field is saved.
// Rules 200 and earlier, authored worlds and `setStalledAsk(false)` keep the old ask.
import { DAY } from './constants';
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): off, a rules-201 rich world asks for site materials as before. */
export const stalledAskOn = (): boolean => enabled;
export function setStalledAsk(on: boolean): void { enabled = on; }
export const hasStalledAsk = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 201);

/** Waiting below this adds nothing. */
export const STALL_FROM = DAY / 2;
/** Waiting at or beyond this adds the whole weight. */
export const STALL_FULL = 2 * DAY;
/** The most the wait adds to the ask. */
export const STALL_MAX = 12;
/** Waiting at or beyond this, the ask is made even when a quick trip of the asker's own is on the table. */
export const STALL_LIFTS_SELF_FETCH = DAY;

/**
 * How long this person can know their site to have waited, in ticks. 0 before 201, and for a site they have only been told of.
 * `lastTouched` is the later of the site's creation and its last work; `lastLooked` is when they last saw it themselves.
 */
export function knownSiteWait(w: World, lastTouched: number, lastLooked: number, sawItThemselves: boolean): number {
  if (!hasStalledAsk(w) || !sawItThemselves) return 0;
  return Math.max(0, w.tick - Math.min(lastTouched, lastLooked));
}

/** What the wait adds to the ask's score: nothing under half a day, rising in a straight line to STALL_MAX at two days. */
export function stalledAskWorth(w: World, waited: number): number {
  if (!hasStalledAsk(w) || waited < STALL_FROM) return 0;
  return STALL_MAX * Math.min(1, (waited - STALL_FROM) / (STALL_FULL - STALL_FROM));
}

/** Is the ask made although a quick trip of the asker's own is on the table? Only at 201, from a day of waiting. */
export function stallLiftsSelfFetch(w: World, waited: number): boolean {
  return hasStalledAsk(w) && waited >= STALL_LIFTS_SELF_FETCH;
}
