// Rules 261 (the social scenes stream, `docs/SOCIAL_SCENES_PLAN.md`, bundle B): hearth.
//
// One version, three separately switched parts, after the pattern of meeting.ts (rules 260), so that each part's effect can be read by
// itself in a lab and the bundle has one continuation pin. (The file is not called hearth.ts: that name, `setHearth` and the lab arm
// `rich-no-hearth` already belong to the indoor hearth of rules 123, so this bundle's switch is `setHearthScenes` and its whole-bundle
// arm `rich-no-hearth-scenes`.)
//
//   birth   A woman near her time lies in beside her home; a housemate who sees it goes and asks a neighbour to be with her; the child is
//           born with somebody there, or without (birth_help.ts; offered in options_social.ts optBirthHelp, answered in social.ts, the
//           lying in in act_misc.ts, the helper's visit in welfare.ts, the birth itself in lifecycle.ts giveBirth). Built.
//   naming  The feast a birth already calls becomes the child's naming feast: the parents say the name before those who are there when it
//           opens, and the child sometimes bears the name of somebody who has died (naming.ts; chosen in lifecycle.ts giveBirth, said in
//           occasions.ts). Built.
//   vigil   Kin sit beside somebody visibly feverish or hurt, through the night if need be, bringing water or food they carry
//           (vigil.ts; offered in options_social.ts optVigil, kept in act_misc.ts, a death met in lifecycle.ts killPerson). Built.
//
// Nothing here is saved or hashed: the switches are lab switches (`rich-no-hearth-scenes`, `rich-no-hearth-<part>` in scripts/lab/lab.ts).
// Rich worlds at rules 261 and later only; rules 260 and earlier, authored worlds and a part switched off keep the old behaviour.
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

/** the rules version the bundle begins at */
export const HEARTH_FROM = 261;

const on = { birth: true, naming: true, vigil: true };
export type HearthPart = keyof typeof on;
export const HEARTH_PARTS = Object.keys(on) as HearthPart[];
/** Lab switches (never saved or hashed): one part, or with no part all three. */
export const hearthPartOn = (part: HearthPart): boolean => on[part];
export function setHearthScenes(enabled: boolean, part?: HearthPart): void {
  if (part) on[part] = enabled;
  else for (const k of HEARTH_PARTS) on[k] = enabled;
}
const partOn = (w: World, part: HearthPart): boolean => on[part] && w.settings.dynamics === 'rich' && runsRulesVersion(w, HEARTH_FROM);
export const hasBirthHelp = (w: World): boolean => partOn(w, 'birth');
export const hasNaming = (w: World): boolean => partOn(w, 'naming');
export const hasVigil = (w: World): boolean => partOn(w, 'vigil');
