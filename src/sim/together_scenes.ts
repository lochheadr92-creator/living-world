// Rules 264 (the social scenes stream, `docs/SOCIAL_SCENES_PLAN.md`, bundle E): standing together.
//
// One version, three separately switched parts, after the pattern of meeting.ts (rules 260), hearth_scenes.ts (261), company_scenes.ts (262) and kin_scenes.ts (263), so
// that each part's effect can be read by itself in a lab and the bundle has one continuation pin. (Nothing else in the code base is called `together_scenes`,
// `setTogetherScenes`, `TOGETHER_PARTS` or `rich-no-together`; checked before the names were taken.)
//
//   side    A person who sees two people quarrelling, and who by their own relations is kin or fond of exactly one of them, walks over and speaks up for that one, once
//           for each quarrel and no more than once a day (standing_up.ts; offered in options_social.ts, kept in act_misc.ts, the quarrel noticed in social.ts startArgument).
//           Built.
//   speech  At the half-way point of an evening sitting by the fire, and when somebody arrives at an occasion that has begun (not a funeral), a candidate to coordinate a
//           shared building that has no mandate yet speaks for it to those there, and each who has not yet answered answers there and then by the rule a private ask is
//           answered by (speak_for.ts; the one answer is social.ts answerRecruit, shared with the private ask; called from act_misc.ts and occasions.ts). Built.
//   fetch   When it is dark or nearly dark and somebody holds the worry that a member of their own household is missing, they first ask a grown person in sight to come
//           with them; the two walk out together to where the worrier last saw them and walk back with them (fetch_home.ts; the ask in options_social.ts and social.ts, the
//           promise kept from options_work.ts, the walk in welfare.ts's visit handler, the walking home offered in options_social.ts). Built, with one companion.
//
// Nothing here is saved or hashed: the switches are lab switches (`rich-no-together-scenes`, `rich-no-together-<part>` in scripts/lab/lab.ts).
// Rich worlds at rules 264 and later only; rules 263 and earlier, authored worlds and a part switched off keep the old behaviour.
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

/** the rules version the bundle begins at */
export const TOGETHER_FROM = 264;

const on = { side: true, speech: true, fetch: true };
export type TogetherScenePart = keyof typeof on;
export const TOGETHER_SCENE_PARTS = Object.keys(on) as TogetherScenePart[];
/** Lab switches (never saved or hashed): one part, or with no part all three. */
export const togetherScenePartOn = (part: TogetherScenePart): boolean => on[part];
export function setTogetherScenes(enabled: boolean, part?: TogetherScenePart): void {
  if (part) on[part] = enabled;
  else for (const k of TOGETHER_SCENE_PARTS) on[k] = enabled;
}
const partOn = (w: World, part: TogetherScenePart): boolean => on[part] && w.settings.dynamics === 'rich' && runsRulesVersion(w, TOGETHER_FROM);
export const hasTakingSides = (w: World): boolean => partOn(w, 'side');
export const hasSpeech = (w: World): boolean => partOn(w, 'speech');
export const hasFetching = (w: World): boolean => partOn(w, 'fetch');
