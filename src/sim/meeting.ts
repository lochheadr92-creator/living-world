// Rules 260 (the social scenes stream, `docs/SOCIAL_SCENES_PLAN.md`, bundle A): meeting.
//
// One version, three separately switched parts, after the pattern of evening_fire.ts (rules 216), so that each part's effect can be
// read by itself in a lab and the bundle has one continuation pin:
//
//   courting  Two unpartnered grown people who have grown close may ask each other to walk out, more than once, before one of them
//             proposes (courting.ts; options_social.ts optCourt; social.ts, the answer; act_misc.ts, the walk). Built.
//   welcome   A resident goes to people who have just arrived, tells them where water and food are and hands over food to spare
//             (welcome.ts; offered in options_social.ts optWelcome, answered in social.ts, a household's arrival recorded in lifecycle.ts). Built.
//   praise    A rescued person thanks their rescuer on the spot and later speaks up for them in company, and the builders of a shared building
//             are thanked in company (praise.ts; owed in defence.ts, due in buildings.ts, spoken at an evening fire and at an occasion). Built.
//
// Nothing here is saved or hashed: the switches are lab switches (`rich-no-meeting`, `rich-no-meeting-<part>` in scripts/lab/lab.ts).
// Rich worlds at rules 260 and later only; rules 257 and earlier, authored worlds and a part switched off keep the old behaviour.
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

/** the rules version the bundle begins at (258 and 259 are unused: docs/RULES_RANGES.md) */
export const MEETING_FROM = 260;

const on = { courting: true, welcome: true, praise: true };
export type MeetingPart = keyof typeof on;
export const MEETING_PARTS = Object.keys(on) as MeetingPart[];
/** Lab switches (never saved or hashed): one part, or with no part all three. */
export const meetingPartOn = (part: MeetingPart): boolean => on[part];
export function setMeeting(enabled: boolean, part?: MeetingPart): void {
  if (part) on[part] = enabled;
  else for (const k of MEETING_PARTS) on[k] = enabled;
}
const partOn = (w: World, part: MeetingPart): boolean => on[part] && w.settings.dynamics === 'rich' && runsRulesVersion(w, MEETING_FROM);
export const hasCourting = (w: World): boolean => partOn(w, 'courting');
export const hasWelcome = (w: World): boolean => partOn(w, 'welcome');
export const hasPraise = (w: World): boolean => partOn(w, 'praise');
