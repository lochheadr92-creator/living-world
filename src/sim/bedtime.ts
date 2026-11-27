// Rules 280 (the bedtime stream, `docs/BEDTIME.md`): a little one goes to bed at dark and sleeps till morning.
//
// What stood before: a child under eight went to bed exactly as a grown person does (options_survival.ts optSleep), at its own body clock's bedtime
// (0.8 + chrono of the day, after dark), and woke as soon as it was rested (act_misc.ts: energy 94), in the middle of the night. Then it sat up awake
// at its lean-to, walked to the well, warmed itself at the fire, talked or practised foraging in the dark. Counted at rules 264 (C:\dev\lw_labs\night_watch,
// three fresh worlds and three saves): under-8s were awake outdoors for 41.7% of dark time; of that, 26% sitting up at their own lean-to, 15% walking
// to bed, 9% walking to or at the well, 14% at the fire, 6% talking or practising, 4% pottering about. Counted again at rules 279 by scripts/free_time_split.ts.
//
// Two separately switched parts, so each can be read by itself in a lab (`rich-no-bedtime`, `rich-no-bedtime-bed`, `rich-no-bedtime-home`):
//
//   bed    Once it is dark (world.light under BEDTIME_DARK, the line fetch_home.ts uses for "after dark") a child under BEDTIME_AGE has its bedtime: sleep
//          is offered as at night whatever the child's own clock says, with BEDTIME_PULL more, even when the child is not tired; and a little one asleep
//          does not wake because it is rested while it is still dark: it sleeps till the morning light (the ordinary "morning came" rule). A parched, starving
//          or frozen child still wakes (act_misc.ts), and danger still wakes anybody (decision.ts).
//   home   After dark a child under BEDTIME_AGE takes up nothing but bed, rest, food, drink, warmth, flight or a move of the household: no play, no talk,
//          no practice, no errands, no pottering about, no sitting up at the fire. A child in a critical need may still ask for help. And nobody starts
//          a talk, a family time or a practice with a little one after dark. When the filter would leave a child nothing at all, it is not applied.
//
// What a viewer sees: at dusk the small children walk home and lie down while the grown people are still up; and settle_child.ts (rules 263), the parent
// who sees their little one lying down and sits with them, now has a child lying down at the hour the parents are still awake and at ease.
//
// Nothing here reads anything a person could not know: the child's own age and the light. No draw is made; nothing is saved. Rich worlds at rules 280
// and later only; rules 279 and earlier, authored worlds and a part switched off keep the old behaviour.
import { addBlocked } from './optutil';
import type { Ctx, Option } from './optutil';
import { ageYears } from './people';
import { CHAT_URGENT, hasReviewRepair } from './review_repairs';
import { runsRulesVersion } from './rulesversion';
import type { Activity, Person, World } from './types';

/** the rules version bedtime begins at */
export const BEDTIME_FROM = 280;
/** a child has a bedtime while under this age (years): settle_child.ts SETTLE_AGE, the age of the children who are put to bed */
export const BEDTIME_AGE = 8;
/** "after dark": fetch_home.ts FETCH_DARK, so one line decides when a parent worries about a child out and when the child goes to bed */
export const BEDTIME_DARK = 0.5;
/** what bedtime adds to sleep for a little one after dark, over the ordinary night-time sleep score (options_survival.ts optSleep) */
export const BEDTIME_PULL = 12;
/** the light at which a little one's night ends: act_misc.ts's "morning came" line */
export const BEDTIME_MORNING = 0.55;

const on = { bed: true, home: true };
export type BedtimePart = keyof typeof on;
export const BEDTIME_PARTS = Object.keys(on) as BedtimePart[];
/** Lab switches (never saved or hashed): one part, or with no part both. */
export const bedtimePartOn = (part: BedtimePart): boolean => on[part];
export function setBedtime(enabled: boolean, part?: BedtimePart): void {
  if (part) on[part] = enabled;
  else for (const k of BEDTIME_PARTS) on[k] = enabled;
}
const partOn = (w: World, part: BedtimePart): boolean => on[part] && w.settings.dynamics === 'rich' && runsRulesVersion(w, BEDTIME_FROM);
export const hasBedtimeBed = (w: World): boolean => partOn(w, 'bed');
export const hasBedtimeHome = (w: World): boolean => partOn(w, 'home');

const little = (w: World, p: Person): boolean => ageYears(w, p) < BEDTIME_AGE;
/** a child under eight, after dark: its bedtime (part `bed`) */
export const atBedtime = (w: World, p: Person): boolean => hasBedtimeBed(w) && w.light < BEDTIME_DARK && little(w, p);
/** a little one asleep stays asleep while the night lasts, however rested (part `bed`; act_misc.ts sleep) */
export const sleepsTillMorning = (w: World, p: Person): boolean => hasBedtimeBed(w) && w.light <= BEDTIME_MORNING && little(w, p);

/** what a little one may still take up after dark (part `home`) */
const AFTER_DARK = new Set<Activity['kind']>(['sleep', 'rest', 'eat', 'eat_store', 'drink', 'warm', 'flee', 'defend', 'relocate']);
/** nobody starts these with a little one after dark (part `home`) */
const WITH_A_CHILD = new Set<Activity['kind']>(['converse', 'argue']);

/** Part `home`: the hard filter, in decision.ts rankOptions beside the children's other limits (child_tasks.ts, three_ages.ts). */
export function bedtimeFilter(ctx: Ctx, opts: Option[]): Option[] {
  const { world, p } = ctx;
  if (!hasBedtimeHome(world) || world.light >= BEDTIME_DARK) return opts;
  if (little(world, p)) {
    const kept = opts.filter((o) => AFTER_DARK.has(o.kind) || (o.kind === 'socialize' && ctx.criticals.length > 0 && (o.tag === 'request' || o.tag === 'info')));
    if (!kept.length) return opts;
    if (kept.length < opts.length) for (const o of opts) if (!kept.includes(o)) addBlocked(ctx, o.kind, o.label, o.targetId, 'past bedtime', o.tag);
    return kept;
  }
  const chats = hasReviewRepair(world, 'chat');
  return opts.filter((o) => {
    // rules 282 (review_repairs.ts, part chat): a talk is offered as 'socialize' and only becomes a converse when it opens
    const asChat = chats && o.kind === 'socialize' && !CHAT_URGENT.some((u) => o.key.startsWith(`socialize:${o.targetId}:${u}`));
    if (!WITH_A_CHILD.has(o.kind) && !asChat) return true;
    const t = world.byId.get(o.targetId);
    if (!t || t.ent !== 'person' || !(t as Person).alive || !little(world, t as Person)) return true;
    addBlocked(ctx, o.kind, o.label, o.targetId, 'a little one should be in bed', o.tag);
    return false;
  });
}
