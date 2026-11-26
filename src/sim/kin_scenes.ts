// Rules 263 (the social scenes stream, `docs/SOCIAL_SCENES_PLAN.md`, bundle D): kin, growing up.
//
// One version, three separately switched parts, after the pattern of meeting.ts (rules 260), hearth_scenes.ts (261) and company_scenes.ts (262), so that each
// part's effect can be read by itself in a lab and the bundle has one continuation pin. (Nothing else in the code base is called `kin_scenes`, `setKinScenes`,
// `KIN_PARTS` or `rich-no-kin`; checked before the names were taken.)
//
//   grief   A person who learns that their parent, child or sibling has died is bereaved, as a widow or widower always was (lifechanges.ts onKinLost); and a
//           friend or relative who comes to the bereaved sits beside them for a few hundred ticks with a word each, even if the bereaved was already in sight
//           (grief_sit.ts; offered in welfare.ts, kept in act_misc.ts). Built.
//   age     The moment somebody turns 16 a feast is called for them (the engine's own call, given a purpose, as a birth's is for the naming day); at it a parent
//           or the eldest there says a few words and the young person says what they hope for, the hope chosen then by the rule life.ts always used (coming_of_age.ts;
//           called from lifecycle.ts, said in occasions.ts). Built.
//   settle  In the evening a parent who sees their own child under eight visibly tired or lying down to sleep, at home, sits beside them until they have been
//           asleep for a little, with a word (settle_child.ts; offered in options_social.ts, kept in act_misc.ts). It does not change when or how well the child
//           sleeps. Built.
//
// Nothing here is saved or hashed: the switches are lab switches (`rich-no-kin-scenes`, `rich-no-kin-<part>` in scripts/lab/lab.ts).
// Rich worlds at rules 263 and later only; rules 262 and earlier, authored worlds and a part switched off keep the old behaviour.
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

/** the rules version the bundle begins at */
export const KIN_FROM = 263;

const on = { grief: true, age: true, settle: true };
export type KinScenePart = keyof typeof on;
export const KIN_SCENE_PARTS = Object.keys(on) as KinScenePart[];
/** Lab switches (never saved or hashed): one part, or with no part all three. */
export const kinScenePartOn = (part: KinScenePart): boolean => on[part];
export function setKinScenes(enabled: boolean, part?: KinScenePart): void {
  if (part) on[part] = enabled;
  else for (const k of KIN_SCENE_PARTS) on[k] = enabled;
}
const partOn = (w: World, part: KinScenePart): boolean => on[part] && w.settings.dynamics === 'rich' && runsRulesVersion(w, KIN_FROM);
export const hasGriefSitting = (w: World): boolean => partOn(w, 'grief');
export const hasComingOfAge = (w: World): boolean => partOn(w, 'age');
export const hasSettling = (w: World): boolean => partOn(w, 'settle');
