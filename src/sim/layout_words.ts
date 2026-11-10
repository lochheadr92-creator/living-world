// Rules 191: the feed line for a laid-out site says who it is for from the site that was made, not from the actor's household.
//
// `plan_site` (act_build.ts) ended with "<name> marked out a <building> for the <household> household" unless the activity carried the
// communal flag. A storehouse laid out through the ordinary option in a township world is made public the moment it exists
// (`proposeProject` sets `site.hhId` to 0 and the same tick's feed says "<name> proposed a shared storehouse for <town>"), and a well is
// public from `createSite`, yet both lines named the actor's household. The end-to-end trace of 10 November 2026 recorded it as a wrong
// record (`docs/END_TO_END_TRACE.md`, link 4): "Dax marked out a storehouse for the Hazel household" beside "Dax proposed a shared
// storehouse for Willowbank". At 191 the words follow the site: a site that belongs to no household reads "for shared use", as a
// communal layout has since rules 144; a household's site still names the household. Text only; nothing reads it. Rules 190 and
// earlier, authored worlds and `setLayoutWords(false)` keep the old line.
import { runsRulesVersion } from './rulesversion';
import type { Household, Site, World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): off, a rules-191 rich world names the actor's household on a public site again. */
export const layoutWordsOn = (): boolean => enabled;
export function setLayoutWords(on: boolean): void { enabled = on; }
export const hasLayoutWords = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 191);

/** The words after "<name> marked out a <building>": whose it is, as the feed should say it. */
export function layoutForWords(world: World, site: Site, hh: Household | undefined, communal: boolean): string {
  if (communal && runsRulesVersion(world, 144)) return ' for shared use';
  if (hasLayoutWords(world) && site.hhId === 0) return ' for shared use';
  return hh ? ` for the ${hh.name} household` : '';
}
