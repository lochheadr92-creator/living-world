// Initial proficiency belongs to personal development. This does not grant techniques,
// advance birthdays, or replace the existing work/practice gains.
import { AGE_ADULT } from './constants';
import { isRich } from './mood';
import { runsRulesVersion } from './rulesversion';
import type { Skills, SkillKey, World } from './types';
import {backgroundSkills} from './background';
let enabled = true;
export const developmentOn = (): boolean => enabled;
export function setDevelopment(on: boolean): void { enabled = on; }
export const developmentalSkills = (world: World): boolean => enabled && isRich(world) && runsRulesVersion(world, 17);
export const NOVICE_SKILL = 0.2;
/** Creation only. Adult draws are still made, preserving the random stream and adult competence.
 * Older entrants have an explicit age-scaled starting background; no simulated practice is invented.
 * Once present, only the ordinary actual-work gains improve these saved values. */
export function initialSkills(world: World, age: number, drawn: Skills, personId?:number): Skills {
 if(personId!==undefined)drawn=backgroundSkills(world,personId,drawn);
 if (!developmentalSkills(world) || age >= AGE_ADULT) return drawn;
 const fraction = Math.max(0, age) / AGE_ADULT;
 const skills = { ...drawn };
 for (const key of Object.keys(skills) as SkillKey[]) skills[key] = NOVICE_SKILL + fraction * (drawn[key] - NOVICE_SKILL);
 return skills;
}
export function skillExplanation(world: World): string {
 return developmentalSkills(world)
  ? 'Newborn proficiency starts at ×0.20. Older entrants have an age-adjusted starting background. Skills improve through work; birthdays grant no experience.'
  : 'Skills improve through practice. This world retains its original starting proficiency rules.';
}
