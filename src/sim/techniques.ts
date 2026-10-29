// Person-held technique knowledge. Proficiency remains in skills; the workshop owns material work.
//
// Rules 18 gave people one held procedure, charcoal firing, taught in a timed lesson between two people who are awake and
// together; rules 41 let a learner ask for it; rules 44 varied who starts knowing it. Rules 52 (docs/TECHNIQUE_TREE.md) makes
// that one procedure a small tree grounded in the smithy's chain, and gives knowledge a way to survive its holders:
//
//   * THREE PROCEDURES. Charcoal firing (the kiln's `burn_charcoal`), iron smelting (`smelt_iron` at the smithy, which cannot be
//     learned by someone who does not know what a charcoal fire does) and iron forging (the smithy's `forge_*`, which cannot be
//     learned without smelting). Knowing a procedure, being quick at the work (`skills.smith`), owning the hammer, having the ore
//     and the standing smithy, and being willing and free are five separate facts, and each is read where it always was.
//   * WHO STARTS KNOWING. The rules-44 background: a specialist smith knows smelting and forging; the experienced sometimes; the
//     inexperienced never. Nothing is granted by skill, by standing near a smithy, or to everyone at once. A world made before
//     52 keeps its people as they were: smelting and forging are read as known there, exactly as before.
//   * TEACHING. The same lesson as charcoal: a holder offers it to a child or apprentice, a learner who wants the work asks a
//     parent, a master or somebody seen at that work; the learner must hold the procedure before it; LESSON_TICKS together.
//   * TRIAL. Knowledge ends when its last holder dies or leaves, and nobody is told. A person who has wanted the work for
//     TRIAL_AFTER with no lesson, who holds the procedure before it, may try the work anyway: the batch costs its real inputs
//     and time, the first TRIALS_NEEDED−1 attempts come to nothing (the inputs are spent, recorded as "a failed attempt"), and
//     the TRIALS_NEEDED-th yields the goods and the procedure, recorded as worked out by trial with what it cost. No draw, no
//     free discovery: the same person at the same work always learns on the same attempt.
import { AGE_ADULT, AGE_CHILD, DAY, TICKS_PER_YEAR } from './constants';
import { isRich } from './mood';
import { runsRulesVersion } from './rulesversion';
import { addEvent, addLog } from './events';
import type { Conversation, Items, Person, SkillKey, World } from './types';
import { hyp } from './util';
import { variedBackgrounds, backgroundKnowsCharcoal, backgroundKnows } from './background';

export type TechniqueKind = 'charcoal' | 'smelting' | 'forging';
export interface TechniqueDef {
  name: string;
  doing: string;
  recipes: string[];
  /** the work a watcher would see somebody at (SeenEntity.work), which makes them a plausible teacher */
  work: SkillKey;
  before: TechniqueKind | null;
  from: number;
}
export const TECHNIQUES: Record<TechniqueKind, TechniqueDef> = {
  charcoal: { name: 'charcoal firing', doing: 'fire charcoal', recipes: ['burn_charcoal'], work: 'kiln', before: null, from: 18 },
  smelting: { name: 'iron smelting', doing: 'smelt iron', recipes: ['smelt_iron'], work: 'smith', before: 'charcoal', from: 52 },
  forging: { name: 'iron forging', doing: 'forge iron', recipes: ['forge_axe', 'forge_pick', 'forge_hoe', 'forge_saw', 'forge_hammer'], work: 'smith', before: 'smelting', from: 52 },
};
export const TECHNIQUE_KINDS = Object.keys(TECHNIQUES) as TechniqueKind[];
const RECIPE_TECHNIQUE = new Map<string, TechniqueKind>();
for (const k of TECHNIQUE_KINDS) for (const r of TECHNIQUES[k].recipes) RECIPE_TECHNIQUE.set(r, k);

let enabled = true;
export const techniquesOn = (): boolean => enabled;
export function setTechniques(on: boolean): void { enabled = on; }
export const heldTechniques = (w: World): boolean => enabled && isRich(w) && runsRulesVersion(w,18);
let learnerInstruction = true;
export const learnerInstructionOn = (): boolean => learnerInstruction;
export function setLearnerInstruction(on: boolean): void { learnerInstruction = on; }
export const hasLearnerInstruction = (w: World): boolean => learnerInstruction && heldTechniques(w) && runsRulesVersion(w,41);
let tree = true;
export const techniqueTreeOn = (): boolean => tree;
/** Lab switch `rich-no-technique-tree`: smelting and forging are read as known by everyone and nobody tries; charcoal unchanged; no effect below 52. */
export function setTechniqueTree(on: boolean): void { tree = on; }
export const hasTechniqueTree = (w: World): boolean => tree && heldTechniques(w) && runsRulesVersion(w, 52);
export const LESSON_TICKS = 180;
/** how long a person must have wanted the work, with no lesson, before trying it untaught */
export const TRIAL_AFTER = 2 * DAY;
/** how many attempts the untaught work takes: the last one yields the goods and the procedure */
export const TRIALS_NEEDED = 3;

/** Whether this procedure is held knowledge in this world at all (otherwise it is read as known, as it always was). */
export function techniqueApplies(w: World, kind: TechniqueKind): boolean {
  if (!heldTechniques(w)) return false;
  return kind === 'charcoal' ? true : hasTechniqueTree(w);
}
export const techniqueOfRecipe = (recipe: string): TechniqueKind | undefined => RECIPE_TECHNIQUE.get(recipe);
export function knowsTechnique(w: World, p: Person, kind: TechniqueKind): boolean {
  return !techniqueApplies(w, kind) || !!p.techniques?.[kind];
}
export function initialiseTechniques(w: World,p: Person,age: number): void {
 if (!heldTechniques(w)) return;
 p.techniques = age >= AGE_ADULT&&(!variedBackgrounds(w)||backgroundKnowsCharcoal(w,p.id)) ? {charcoal:{source:'initial',learned:w.tick,teacher:0}} : {};
 // rules 52: who starts knowing the smithy's procedures is the same creation-time background, read with its own salts; a smith
 // knows the fire, so one who arrives knowing smelting arrives knowing charcoal firing too (the tree holds for everyone)
 if (hasTechniqueTree(w) && age >= AGE_ADULT && backgroundKnows(w, p.id, 'smelting')) {
  p.techniques.charcoal ??= { source: 'initial', learned: w.tick, teacher: 0 };
  p.techniques.smelting = { source: 'initial', learned: w.tick, teacher: 0 };
  if (backgroundKnows(w, p.id, 'forging')) p.techniques.forging = { source: 'initial', learned: w.tick, teacher: 0 };
 }
}
export function knowsCharcoal(w: World,p: Person): boolean { return knowsTechnique(w, p, 'charcoal'); }
/** Why this person cannot run this recipe ('' if they can): the procedure is held knowledge and they do not hold it. */
export function techniqueBlocker(w: World,p: Person,recipe: string): string {
 const kind = techniqueOfRecipe(recipe);
 return kind && !knowsTechnique(w, p, kind) ? `has not learned ${TECHNIQUES[kind].name}` : '';
}
/** The procedure this recipe needs that this person lacks, or undefined. */
export function techniqueLacking(w: World, p: Person, recipe: string): TechniqueKind | undefined {
 const kind = techniqueOfRecipe(recipe);
 return kind && !knowsTechnique(w, p, kind) ? kind : undefined;
}
/** The first procedure on the way to this one that the person lacks: what they could learn or try next. */
export function firstLacking(w: World, p: Person, kind: TechniqueKind): TechniqueKind {
 let k = kind;
 for (;;) {
  const before = TECHNIQUES[k].before;
  if (!before || knowsTechnique(w, p, before)) return k;
  k = before;
 }
}
/** Why this person could not be taught this procedure now, whoever the teacher ('' if they could): the one before it is not theirs. */
export function learnBlocker(w: World, p: Person, kind: TechniqueKind): string {
 const before = TECHNIQUES[kind].before;
 return before && !knowsTechnique(w, p, before) ? `must learn ${TECHNIQUES[before].name} first` : '';
}
export function lessonContact(a: Person,b: Person): boolean {
 return a.alive&&b.alive&&a.pose!=='sleep'&&b.pose!=='sleep'&&(a.indoors??0)===(b.indoors??0)&&hyp(a.x-b.x,a.y-b.y)<=3;
}
export function lessonProblem(w: World,a: Person,b: Person,kind: TechniqueKind = 'charcoal'): string {
 if (!heldTechniques(w)) return 'technique instruction is unavailable';
 if (!lessonContact(a,b)) return 'no longer awake and together';
 if (!a.techniques?.[kind]) return `the teacher does not know ${TECHNIQUES[kind].name}`;
 if ([a,b].some(p=>p.needs.hunger<30||p.needs.thirst<30||p.needs.energy<20||p.needs.safety<25)) return 'urgent needs interrupted the lesson';
 return '';
}
const kindOf = (c: Conversation): TechniqueKind => ((c.data as { technique?: TechniqueKind }).technique ?? 'charcoal');
export function offerLesson(w: World,a: Person,b: Person,kind: TechniqueKind = 'charcoal'): void {
 a.cooldowns['teach:'+b.id]=w.tick+2*DAY;
 addLog(w,a,'social',`Offered to teach ${b.name} ${TECHNIQUES[kind].name}.`);
}
export function answerLesson(w: World,c: Conversation,a: Person,b: Person): string {
 const kind = kindOf(c);
 const name = TECHNIQUES[kind].name;
 let why=lessonProblem(w,a,b,kind);
 if (!why&&b.techniques?.[kind]) why=`already knows ${name}`;
 if (!why) why = learnBlocker(w, b, kind);
 if (!why&&(w.tick-b.birthTick)/TICKS_PER_YEAR<AGE_CHILD) why=kind==='charcoal'?'too young for kiln instruction':'too young for smithy instruction';
 if (!why&&((b.relations[a.id]?.trust??0)<0||(b.relations[a.id]?.affinity??0)<-5)) why='does not want instruction from this teacher';
 if (!why&&b.traits.curiosity+Math.max(0,b.relations[a.id]?.affinity??0)/100<0.45) why='would rather do something else';
 c.lesson={since:w.tick,until:w.tick+LESSON_TICKS,outcome:why?'declined':'learning',reason:why||`accepted ${name} instruction`,...(kind==='charcoal'?{}:{kind})};
 addLog(w,b,'social',why?`Declined ${a.name}'s lesson: ${why}.`:`Accepted ${name} instruction from ${a.name}.`);
 return why;
}
/** The recipient answers a learner's request. No teacher knowledge is read by the
 * learner's chooser; it is checked here, at actual conversational contact. */
export function answerRequestedLesson(w: World,c: Conversation,teacher: Person,learner: Person): string {
 if(c.lesson)return c.lesson.outcome==='declined'?c.lesson.reason:'';
 const kind = kindOf(c);
 let why=!hasLearnerInstruction(w)?'requested instruction is unavailable':lessonProblem(w,teacher,learner,kind);
 if(!why&&teacher.commitments.some(x=>x.status==='active'))why='has an outstanding commitment to attend to';
 if(!why&&((teacher.relations[learner.id]?.trust??10)<0||(teacher.relations[learner.id]?.affinity??0)<-5))why='does not want to teach this person';
 if(!why&&teacher.traits.generosity+Math.max(0,teacher.relations[learner.id]?.affinity??0)/100<0.45)why='does not want to spend time teaching now';
 if(!why)return answerLesson(w,c,teacher,learner);
 c.lesson={since:w.tick,until:w.tick+LESSON_TICKS,outcome:'declined',reason:why,...(kind==='charcoal'?{}:{kind})};
 addLog(w,learner,'social',`${teacher.name} declined my request for instruction: ${why}.`);
 return why;
}
export function finishLesson(w: World,c: Conversation,a: Person,b: Person): boolean {
 const kind = c.lesson?.kind ?? kindOf(c);
 if(c.lesson?.outcome!=='learning'||w.tick<c.lesson.until||lessonProblem(w,a,b,kind))return false;
 const name = TECHNIQUES[kind].name;
 b.techniques??={};b.techniques[kind]={source:'taught',learned:w.tick,teacher:a.id,lesson:c.id,started:c.lesson.since};
 c.lesson.outcome='learned';c.lesson.reason=`learned ${name} after ${LESSON_TICKS} ticks together`;
 addEvent(w,'work',`${b.name} learned ${name} from ${a.name}.`,[b.id,a.id],b.x,b.y);
 addLog(w,b,'work',`Learned ${name} from ${a.name}; ${TECHNIQUES[kind].work === 'kiln' ? 'kiln' : 'smithy'} proficiency still comes from practice.`);
 return true;
}
export function interruptLesson(c: Conversation,why: string): void {
 if(c.lesson?.outcome==='learning'){c.lesson.outcome='interrupted';c.lesson.reason=why;}
}

/**
 * Whether this person may try this procedure untaught now: it is held knowledge they lack, they hold the one before it, they
 * have wanted the work for TRIAL_AFTER (the decision writes `cooldowns['techWant:<kind>']` when the want first stands), and no
 * lesson is under way. Pure.
 */
export function trialAllowed(w: World, p: Person, kind: TechniqueKind): boolean {
 if (!hasTechniqueTree(w) || kind === 'charcoal' || knowsTechnique(w, p, kind) || learnBlocker(w, p, kind)) return false;
 const since = p.cooldowns['techWant:' + kind];
 if (since === undefined || w.tick - since < TRIAL_AFTER) return false;
 const c = w.conversations.find((x) => x.id === p.convId);
 return !(c?.lesson && c.lesson.outcome === 'learning');
}
/** The decision (not an observer) notes when a technique first stood in the way of wanted work. */
export function noteTechniqueWant(w: World, p: Person, kind: TechniqueKind | undefined): void {
 if (!hasTechniqueTree(w)) return;
 if (kind && p.cooldowns['techWant:' + kind] === undefined) p.cooldowns['techWant:' + kind] = w.tick;
}
/** A batch run untaught has finished (facilities.ts): the attempt is counted, and the last one yields the procedure. Returns whether the goods are produced. */
export function trialFinished(w: World, p: Person, kind: TechniqueKind, spent: Items, at: string): boolean {
 const trials = (p.trials ??= {});
 const t = (trials[kind] ??= { attempts: 0, spent: {} });
 t.attempts++;
 for (const k of Object.keys(spent) as (keyof Items)[]) t.spent[k] = (t.spent[k] ?? 0) + (spent[k] ?? 0);
 const name = TECHNIQUES[kind].name;
 const cost = Object.entries(t.spent).map(([k, n]) => `${n} ${k}`).join(', ');
 if (t.attempts < TRIALS_NEEDED) {
  addLog(w, p, 'work', `Tried to ${TECHNIQUES[kind].doing} at the ${at} without knowing how: the batch came to nothing (attempt ${t.attempts}; ${cost} spent so far).`);
  return false;
 }
 p.techniques ??= {};
 p.techniques[kind] = { source: 'trial', learned: w.tick, teacher: 0, attempts: t.attempts, spent: { ...t.spent } };
 delete trials[kind];
 if (!Object.keys(trials).length) delete p.trials;
 delete p.cooldowns['techWant:' + kind];
 addEvent(w, 'work', `${p.name} worked out ${name} by trial at the ${at}, after ${t.attempts} attempts.`, [p.id], p.x, p.y);
 addLog(w, p, 'work', `Worked out ${name} by trial at the ${at}: ${t.attempts} attempts, ${cost} spent; nobody taught me.`);
 return true;
}

export function describeTechniques(w: World,p: Person): string[] {
 if(!heldTechniques(w))return [];
 const out: string[] = [];
 for (const kind of TECHNIQUE_KINDS) {
  if (!techniqueApplies(w, kind)) continue;
  const def = TECHNIQUES[kind];
  const label = def.name.charAt(0).toUpperCase() + def.name.slice(1);
  const k=p.techniques?.[kind];
  if(!k){
   const t = p.trials?.[kind];
   const before = learnBlocker(w, p, kind);
   out.push(t ? `${label}: not learned; tried ${t.attempts} time${t.attempts === 1 ? '' : 's'} untaught (${Object.entries(t.spent).map(([a, n]) => `${n} ${a}`).join(', ')} spent).` : before ? `${label}: not learned (${before}).` : kind === 'charcoal' ? 'Charcoal firing: not learned. Kiln proficiency alone does not supply this technique.' : `${label}: not learned. Smithy proficiency alone does not supply this technique.`);
   continue;
  }
  const teacher=w.persons.find(q=>q.id===k.teacher);
  out.push(k.source==='initial'?`${label}: known on arrival (initial background).`:k.source==='trial'?`${label}: worked out by trial at tick ${k.learned}, after ${k.attempts} attempts (${Object.entries(k.spent ?? {}).map(([a, n]) => `${n} ${a}`).join(', ')} spent); nobody taught it.`:`${label}: learned from ${teacher?.name??'person '+k.teacher} at tick ${k.learned}, after ${LESSON_TICKS} ticks of instruction.`);
 }
 return out;
}

/** Pure observer progress from the authoritative live lesson interval. */
export function lessonProgress(w: World,p: Person): number | undefined {
 const lesson=w.conversations.find(c=>c.id===p.convId)?.lesson;
 if(!lesson||lesson.outcome==='declined'||lesson.outcome==='interrupted')return undefined;
 return Math.max(0,Math.min(1,(w.tick-lesson.since)/Math.max(1,lesson.until-lesson.since)));
}

export function validateTechniques(w: World): void {
 for (const p of w.persons) {
  for (const k of Object.keys(p.techniques ?? {})) if (!TECHNIQUE_KINDS.includes(k as TechniqueKind) || (k !== 'charcoal' && !runsRulesVersion(w, 52))) throw new Error('Invalid technique record');
  for (const k of Object.keys(p.trials ?? {})) if (!TECHNIQUE_KINDS.includes(k as TechniqueKind) || !runsRulesVersion(w, 52) || !(p.trials![k as TechniqueKind]!.attempts >= 1)) throw new Error('Invalid trial record');
 }
}
