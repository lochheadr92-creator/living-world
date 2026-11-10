// Rules 195: a manageable ordinary metabolism.
//
// Since the first commit hunger has fallen by HUNGER_RATE (0.03) a tick and thirst by THIRST_RATE (0.04): 72 hunger and 96 thirst a
// day for an awake adult, more under heavy work (x1.25 and x1.3) or running (x1.3 and x1.4), less asleep (x0.55 and x0.6). The hunger
// drive starts at 62 and thirst's at 66 (DRIVE_BANDS), so a person fed to the full had about twelve hours before hunger mattered and
// eight and a half before thirst did, and a meal of ordinary food is worth 12 to 28. The task of 11 November 2026 (the owner's
// survival-pressure rebalance brief) asked whether that burden leaves a fed, watered, sheltered person enough discretionary time
// to talk, teach, play, visit and rest, and to measure before changing anything: `docs/ORDINARY_METABOLISM.md` records the
// measurement (the paired lab at rules 194 against 195, twelve ordinary seeds, with the life metrics of scripts/lab/lab.ts).
//
// The screening lab (twelve seeds, 25 days, one run at 195 with the old drains, the brief's 0.020/0.025 and a moderate 0.024/0.032 as
// arms) found the moderate correction sufficient: family time 58 to 85 against 97, child play 51 to 73 against 81, foraging practice 92
// to 123 against 142, coaching 1.6 to 3.2 against 5.3 per settlement, with deaths 10.4 to 2.2 where 0.020/0.025 left 0.25 and no
// hunger death at all in the window. The smaller correction is the one taken, so that scarcity stays visible.
//
// At 195 the two base rates are read here: HUNGER_RATE_195 and THIRST_RATE_195 in a rich world, the old constants everywhere else.
// Every multiplier (child, harsh profile, sleep, heavy work, running, heat), every threshold (DRIVE_BANDS, CRITICAL, the eat and
// drink options' own levels), the critical-need filter of decision.ts, the relief guard, starvation, dehydration, exposure and
// nourishment are unchanged: they take the rate from here and do what they did. Rules 194 and earlier, authored worlds and
// `setMetabolism(false)` keep 0.03 and 0.04. `setLabRates` is the lab's screening switch (never saved or hashed): it sets the two
// rates a rules-195 rich world runs under for one branch, so candidates can be compared in one run.
import { HUNGER_RATE, THIRST_RATE } from './constants';
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

/** Hunger lost a tick by an awake adult at rest, rules 195 (58 a day awake, against 72). */
export const HUNGER_RATE_195 = 0.024;
/** Thirst lost a tick by an awake adult at rest, rules 195 (77 a day awake, against 96). */
export const THIRST_RATE_195 = 0.032;

let enabled = true;
let labRates: { hunger: number; thirst: number } | null = null;
/** Lab switch (never saved or hashed): off, a rules-195 rich world drains at 0.03 and 0.04 again. */
export const metabolismOn = (): boolean => enabled;
export function setMetabolism(on: boolean): void { enabled = on; }
/** Lab screening switch (never saved or hashed): the rates a rules-195 rich world runs under; null restores the 195 constants. */
export function setLabRates(rates: { hunger: number; thirst: number } | null): void { labRates = rates; }
export const labRatesOn = (): { hunger: number; thirst: number } | null => labRates;
export const hasMetabolism = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 195);

/** The base hunger drain a tick for this world (before the multipliers in needs.ts updateNeeds). */
export function hungerRate(w: World): number {
  if (!hasMetabolism(w)) return HUNGER_RATE;
  return labRates ? labRates.hunger : HUNGER_RATE_195;
}

/** The base thirst drain a tick for this world (before the multipliers in needs.ts updateNeeds). */
export function thirstRate(w: World): number {
  if (!hasMetabolism(w)) return THIRST_RATE;
  return labRates ? labRates.thirst : THIRST_RATE_195;
}
