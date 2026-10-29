// Person-held technique knowledge. Proficiency remains in skills; the kiln owns material work.
import { AGE_ADULT, AGE_CHILD, DAY, TICKS_PER_YEAR } from './constants';
import { isRich } from './mood';
import { runsRulesVersion } from './rulesversion';
import { addEvent, addLog } from './events';
import type { Conversation, Person, World } from './types';
import { hyp } from './util';
import {variedBackgrounds,backgroundKnowsCharcoal} from './background';
let enabled = true;
export const techniquesOn = (): boolean => enabled;
export function setTechniques(on: boolean): void { enabled = on; }
export const heldTechniques = (w: World): boolean => enabled && isRich(w) && runsRulesVersion(w,18);
let learnerInstruction = true;
export const learnerInstructionOn = (): boolean => learnerInstruction;
export function setLearnerInstruction(on: boolean): void { learnerInstruction = on; }
export const hasLearnerInstruction = (w: World): boolean => learnerInstruction && heldTechniques(w) && runsRulesVersion(w,41);
export const LESSON_TICKS = 180;
export function initialiseTechniques(w: World,p: Person,age: number): void {
 if (!heldTechniques(w)) return;
 p.techniques = age >= AGE_ADULT&&(!variedBackgrounds(w)||backgroundKnowsCharcoal(w,p.id)) ? {charcoal:{source:'initial',learned:w.tick,teacher:0}} : {};
}
export function knowsCharcoal(w: World,p: Person): boolean { return !heldTechniques(w) || !!p.techniques?.charcoal; }
export function techniqueBlocker(w: World,p: Person,recipe: string): string {
 return recipe==='burn_charcoal'&&!knowsCharcoal(w,p) ? 'has not learned charcoal firing' : '';
}
export function lessonContact(a: Person,b: Person): boolean {
 return a.alive&&b.alive&&a.pose!=='sleep'&&b.pose!=='sleep'&&(a.indoors??0)===(b.indoors??0)&&hyp(a.x-b.x,a.y-b.y)<=3;
}
export function lessonProblem(w: World,a: Person,b: Person): string {
 if (!heldTechniques(w)) return 'technique instruction is unavailable';
 if (!lessonContact(a,b)) return 'no longer awake and together';
 if (!a.techniques?.charcoal) return 'the teacher does not know charcoal firing';
 if ([a,b].some(p=>p.needs.hunger<30||p.needs.thirst<30||p.needs.energy<20||p.needs.safety<25)) return 'urgent needs interrupted the lesson';
 return '';
}
export function offerLesson(w: World,a: Person,b: Person): void {
 a.cooldowns['teach:'+b.id]=w.tick+2*DAY;
 addLog(w,a,'social',`Offered to teach ${b.name} charcoal firing.`);
}
export function answerLesson(w: World,c: Conversation,a: Person,b: Person): string {
 let why=lessonProblem(w,a,b);
 if (!why&&b.techniques?.charcoal) why='already knows charcoal firing';
 if (!why&&(w.tick-b.birthTick)/TICKS_PER_YEAR<AGE_CHILD) why='too young for kiln instruction';
 if (!why&&((b.relations[a.id]?.trust??0)<0||(b.relations[a.id]?.affinity??0)<-5)) why='does not want instruction from this teacher';
 if (!why&&b.traits.curiosity+Math.max(0,b.relations[a.id]?.affinity??0)/100<0.45) why='would rather do something else';
 c.lesson={since:w.tick,until:w.tick+LESSON_TICKS,outcome:why?'declined':'learning',reason:why||'accepted charcoal firing instruction'};
 addLog(w,b,'social',why?`Declined ${a.name}'s lesson: ${why}.`:`Accepted charcoal firing instruction from ${a.name}.`);
 return why;
}
/** The recipient answers a learner's request. No teacher knowledge is read by the
 * learner's chooser; it is checked here, at actual conversational contact. */
export function answerRequestedLesson(w: World,c: Conversation,teacher: Person,learner: Person): string {
 if(c.lesson)return c.lesson.outcome==='declined'?c.lesson.reason:'';
 let why=!hasLearnerInstruction(w)?'requested instruction is unavailable':lessonProblem(w,teacher,learner);
 if(!why&&teacher.commitments.some(x=>x.status==='active'))why='has an outstanding commitment to attend to';
 if(!why&&((teacher.relations[learner.id]?.trust??10)<0||(teacher.relations[learner.id]?.affinity??0)<-5))why='does not want to teach this person';
 if(!why&&teacher.traits.generosity+Math.max(0,teacher.relations[learner.id]?.affinity??0)/100<0.45)why='does not want to spend time teaching now';
 if(!why)return answerLesson(w,c,teacher,learner);
 c.lesson={since:w.tick,until:w.tick+LESSON_TICKS,outcome:'declined',reason:why};
 addLog(w,learner,'social',`${teacher.name} declined my request for instruction: ${why}.`);
 return why;
}
export function finishLesson(w: World,c: Conversation,a: Person,b: Person): boolean {
 if(c.lesson?.outcome!=='learning'||w.tick<c.lesson.until||lessonProblem(w,a,b))return false;
 b.techniques??={};b.techniques.charcoal={source:'taught',learned:w.tick,teacher:a.id,lesson:c.id,started:c.lesson.since};
 c.lesson.outcome='learned';c.lesson.reason=`learned charcoal firing after ${LESSON_TICKS} ticks together`;
 addEvent(w,'work',`${b.name} learned charcoal firing from ${a.name}.`,[b.id,a.id],b.x,b.y);
 addLog(w,b,'work',`Learned charcoal firing from ${a.name}; kiln proficiency still comes from practice.`);
 return true;
}
export function interruptLesson(c: Conversation,why: string): void {
 if(c.lesson?.outcome==='learning'){c.lesson.outcome='interrupted';c.lesson.reason=why;}
}
export function describeTechniques(w: World,p: Person): string[] {
 if(!heldTechniques(w))return [];
 const k=p.techniques?.charcoal;
 if(!k)return ['Charcoal firing: not learned. Kiln proficiency alone does not supply this technique.'];
 const teacher=w.persons.find(q=>q.id===k.teacher);
 return [k.source==='initial'?'Charcoal firing: known on arrival (initial background).':`Charcoal firing: learned from ${teacher?.name??'person '+k.teacher} at tick ${k.learned}, after ${LESSON_TICKS} ticks of instruction.`];
}

/** Pure observer progress from the authoritative live lesson interval. */
export function lessonProgress(w: World,p: Person): number | undefined {
 const lesson=w.conversations.find(c=>c.id===p.convId)?.lesson;
 if(!lesson||lesson.outcome==='declined'||lesson.outcome==='interrupted')return undefined;
 return Math.max(0,Math.min(1,(w.tick-lesson.since)/Math.max(1,lesson.until-lesson.since)));
}
