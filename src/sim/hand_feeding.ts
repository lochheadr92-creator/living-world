// Rules 159: a hungry person whose pack has no room is fed by hand. Ordinary origin (the Brain's 30-day priority findings,
// reproduced at rules 153 in review_evidence/fenn-repro-20261105): Fenn, a child, was at hunger 0 from tick 54,300 to his
// death at 56,961 carrying two wood and a seed (4.25 of 5), so nothing edible fitted in his pack. His mother Ines stood beside
// him with a fish and a fruit; the hand-over failed "they had no room to carry it", the food stayed in her pack for about
// 2,500 ticks (eating it was held for dependants, leaving it at home was blocked), and he starved. A person who is hungry can
// already eat on the spot with a full pack (a gather, a meal at a store); this lets the carer's hand-over do the same:
// the food leaves the carer's pack through the ledger as a meal and the recipient takes its nutrition, with the same
// accounting as eating (act_resource.ts eatTick). Nothing is created or lost, the recipient's pack is untouched, and it
// applies only when the hand-over moved nothing, the recipient is hungry and holds no food, and the pack truly cannot take that
// food (a full pack of other goods). A recipient who is not hungry keeps the rules-63 home fallback; one already holding food
// is rules 157's case.
import {NUTRITION} from './constants';
import {nutritionOf} from './bread_feeds';
import {consume,roomFor} from './economy';
import {takeNutrition} from './nourishment';
import {carryCap,stageOf} from './people';
import {runsRulesVersion} from './rulesversion';
import type {FoodKind,ItemKind,Items,Person,World} from './types';

let enabled=true;
export const handFeedingOn=():boolean=>enabled;
export const setHandFeeding=(on:boolean):void=>{enabled=on;};
export const hasHandFeeding=(w:World):boolean=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,159);

/** The same hunger lines the carer used to set out (options_work.ts optCare): a child is hungry below 66, anyone else below 50. */
export const hungryLine=(w:World,q:Person):number=>stageOf(w,q)==='child'?66:50;
const MEAL_UNITS=3;
const MEAL_FULL=88;
const isFoodKind=(k:ItemKind):k is FoodKind=>(NUTRITION as Record<string,number|undefined>)[k]!==undefined;

/** What the carer would feed the recipient by hand, or null. Pure: reads only the two packs and the recipient's hunger. */
export function planHandFeeding(w:World,p:Person,q:Person,want:Items):Items|null{
 if(!hasHandFeeding(w)||q.needs.hunger>=hungryLine(w,q))return null;
 if((Object.keys(q.inv) as ItemKind[]).some(k=>isFoodKind(k)&&(q.inv[k]??0)>0))return null;
 const cap=carryCap(w,q),plan:Items={};let hunger=q.needs.hunger,units=0;
 for(const k of Object.keys(want) as ItemKind[]){
  if(!isFoodKind(k))continue;
  const most=Math.min(p.inv[k]??0,want[k]??0);
  while((plan[k]??0)<most&&hunger<MEAL_FULL&&units<MEAL_UNITS&&roomFor(q.inv,cap,k)<1){plan[k]=(plan[k]??0)+1;hunger+=nutritionOf(w,k);units++;}
 }
 return units>0?plan:null;
}

/** Feed it: out of the carer's pack as a meal, nutrition to the recipient. Returns the units actually eaten. */
export function applyHandFeeding(w:World,p:Person,q:Person,plan:Items):number{
 let eaten=0;
 for(const k of Object.keys(plan) as ItemKind[]){
  if(!isFoodKind(k))continue;
  const m=consume(w,p.inv,k,plan[k]??0,'eaten');
  for(let i=0;i<m;i++)takeNutrition(w,q,nutritionOf(w,k));
  eaten+=m;
 }
 if(eaten>0)q.lastAteTick=w.tick;
 return eaten;
}
