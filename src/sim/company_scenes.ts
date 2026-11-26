// Rules 262 (the social scenes stream, `docs/SOCIAL_SCENES_PLAN.md`, bundle C): company.
//
// One version, three separately switched parts, after the pattern of meeting.ts (rules 260) and hearth_scenes.ts (rules 261), so that each
// part's effect can be read by itself in a lab and the bundle has one continuation pin. (The file is not called company.ts: that name,
// `setCompany`, `COMPANY_PARTS` and the lab arm `rich-no-company` already belong to rules 200's room for company, so this bundle's switch
// is `setCompanyScenes` and its whole-bundle arm is `rich-no-company-scenes`.)
//
//   song     At the half-way point of an evening sitting by the fire, on about one evening in three at each fire, a sociable sitter in good
//            spirits starts a song and the others in good spirits join (song.ts; called from act_misc.ts after the thanks and the story, which
//            come first). Built.
//   dance    At a wedding, a feast or a harvest feast with four or more there, those in good spirits walk a small ring round the place for
//            about 120 ticks (dance.ts; called from the attend handler in occasions.ts). Built.
//   reunion  Somebody who sees their partner, child or parent after more than a day and a half apart runs to meet them (reunion.ts; the
//            sighting noted in perception.ts, offered in options_social.ts, played in act_misc.ts). Built.
//
// Nothing here is saved or hashed: the switches are lab switches (`rich-no-company-scenes`, `rich-no-company-<part>` in scripts/lab/lab.ts).
// Rich worlds at rules 262 and later only; rules 261 and earlier, authored worlds and a part switched off keep the old behaviour.
import { moodOf } from './needs';
import { runsRulesVersion } from './rulesversion';
import type { Person, World } from './types';

/** the rules version the bundle begins at */
export const COMPANY_FROM = 262;

const on = { song: true, dance: true, reunion: true };
export type CompanyScenePart = keyof typeof on;
export const COMPANY_SCENE_PARTS = Object.keys(on) as CompanyScenePart[];
/** Lab switches (never saved or hashed): one part, or with no part all three. */
export const companyScenePartOn = (part: CompanyScenePart): boolean => on[part];
export function setCompanyScenes(enabled: boolean, part?: CompanyScenePart): void {
  if (part) on[part] = enabled;
  else for (const k of COMPANY_SCENE_PARTS) on[k] = enabled;
}
const partOn = (w: World, part: CompanyScenePart): boolean => on[part] && w.settings.dynamics === 'rich' && runsRulesVersion(w, COMPANY_FROM);
export const hasSong = (w: World): boolean => partOn(w, 'song');
export const hasDance = (w: World): boolean => partOn(w, 'dance');
export const hasReunion = (w: World): boolean => partOn(w, 'reunion');

/**
 * In good spirits: the mood level at or above the neutral mark, 0 (the inspector shows `70 + 0.7 * level`, so 70 and over): not low, hungry, frightened or hurt.
 * The same line serves the song and the dance. It was first set at 5 and moved to 0 after one look at the first two evenings of an ordinary world: the people who
 * sit at the evening fire are those who want company, whose mood is pulled down by that want, and their levels ran from -8 to 19, mostly between -5 and 8; at 5 no
 * fire in those two evenings had a sociable grown sitter in good spirits, at 0 one of the two had. Read from the person's own mood (before the first mood update
 * has made one, from the needs the mood is made of) and nothing else.
 */
export const GOOD_SPIRITS_FROM = 0;
export const inGoodSpirits = (p: Person): boolean => (p.mood?.level ?? (moodOf(p) - 70) * 0.5) >= GOOD_SPIRITS_FROM;
