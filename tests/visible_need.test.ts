// Rules 166: a spontaneous offer of food or water rests on how hungry or thirsty a stranger LOOKS (hungry, starving; thirsty, parched), not on their exact
// figure (src/sim/visible_need.ts). Every situation here is STAGED: it checks a rule, it is not an example of spontaneous behaviour. The method is the
// review's own: change one hidden fact (Ben's exact hunger, after Ada's last glance) and diff Ada's options. Each contrast runs the same scene at
// rules 165 (the offer follows his exact figure) and 166 (it follows the sign, which changes when she looks again).
import {describe,expect,it} from 'vitest';
import {stage,addPerson,done,pin} from './helpers/kit';
import {perceive} from '../src/sim/perception';
import {rebuildMobileGrid} from '../src/sim/registry';
import {generateOptions} from '../src/sim/decision';
import {conservationReport,snapshotInitial} from '../src/sim/economy';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {CURRENT_RULES_VERSION,SUPPORTED_RULES_VERSIONS} from '../src/sim/rulesversion';
import type {World,Person} from '../src/sim/types';

function scene(version:number,benNeeds:{hunger?:number;thirst?:number}){
 const s=stage('staged-visible-need'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const ada=addPerson(s,'Ada',40,40,{age:30,sex:'f',hunger:95,thirst:95,energy:95,traits:{generosity:1,sociability:0.9},inv:{berries:8,water:6}});
 const ben=addPerson(s,'Ben',45,40,{age:32,sex:'m',hunger:benNeeds.hunger??95,thirst:benNeeds.thirst??95,energy:95});
 done(s);for(const p of [ada,ben]){pin(p);p.needs.warmth=100;p.needs.safety=100;}
 rebuildMobileGrid(w);perceive(w,ada);
 expect(ada.seen.some(x=>x.id===ben.id)).toBe(true);
 snapshotInitial(w);
 return {w,ada,ben};
}
const offer=(w:World,ada:Person,ben:Person)=>generateOptions(w,ada,true,true).options.find(o=>o.key===`socialize:${ben.id}:offer`);
const look=(w:World,ada:Person)=>{rebuildMobileGrid(w);perceive(w,ada);};
const seenOf=(f:{ada:Person;ben:Person})=>f.ada.seen.find(x=>x.id===f.ben.id)!;
const sound=(w:World)=>{expect(conservationReport(w).ok).toBe(true);const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);};

describe('rules 166 is registered',()=>{
 it('is registered and supported (the current version may be later)',()=>{expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(166);expect(SUPPORTED_RULES_VERSIONS).toContain(166);});
});

describe("a stranger's exact hunger",()=>{
 it('rules 165 weighs the offer by his live figure at once; rules 166 by what Ada last saw, and changes when she looks again',()=>{
  const utils:Record<number,number[]>={};
  for(const version of [165,166]){
   const f=scene(version,{hunger:30});                      // hungry, not starving, as she looks
   const first=offer(f.w,f.ada,f.ben)!;expect(first,`offered, rules ${version}`).toBeDefined();
   f.ben.needs.hunger=5;                                     // starving, after her last glance
   const unseen=offer(f.w,f.ada,f.ben)!.util;
   look(f.w,f.ada);
   const looked=offer(f.w,f.ada,f.ben)!.util;
   utils[version]=[first.util,unseen,looked];
   sound(f.w);
  }
  expect(utils[165][1],'165 follows the live figure at once').toBeGreaterThan(utils[165][0]);
  expect(utils[166][1],'166 does not change until she looks').toBe(utils[166][0]);
  expect(utils[166][2],'and then it does').toBeGreaterThan(utils[166][0]);
 });
 it('at 166 every hunger within a sign weighs the same, and the sign is absent below 166',()=>{
  const weigh=(h:number)=>{const f=scene(166,{hunger:h});return {util:offer(f.w,f.ada,f.ben)!.util,s:seenOf(f)};};
  const band=[25,35,41].map(weigh);
  expect(new Set(band.map(b=>b.util)).size,'hungry band').toBe(1);
  expect(band.every(b=>b.s.hungry&&!b.s.starving)).toBe(true);
  const gaunt=[0,10,19].map(weigh);
  expect(new Set(gaunt.map(b=>b.util)).size,'starving band').toBe(1);
  expect(gaunt.every(b=>b.s.hungry&&b.s.starving===true)).toBe(true);
  expect(gaunt[0].util,'starving weighs more than hungry').toBeGreaterThan(band[0].util);
  expect(weigh(20).s.starving,'20 is not yet starving').toBeUndefined();
  const old=scene(165,{hunger:5}),mild=scene(165,{hunger:41});
  expect(Object.prototype.hasOwnProperty.call(seenOf(old),'starving'),'no new key below 166').toBe(false);
  expect(offer(old.w,old.ada,old.ben)!.util,'165 still reads the exact figure').toBeGreaterThan(offer(mild.w,mild.ada,mild.ben)!.util);
  expect(weigh(5).util,'166 gives the same weight to hunger 5 as to hunger 15').toBe(weigh(15).util);
 });
 it('someone who does not look hungry is not offered food, as before',()=>{
  for(const version of [165,166]){const f=scene(version,{hunger:60});expect(offer(f.w,f.ada,f.ben),`rules ${version}`).toBeUndefined();}
 });
});

describe("a stranger's exact thirst",()=>{
 it('is weighed by the parched sign at 166 and by the live figure at 165',()=>{
  const utils:Record<number,number[]>={};
  for(const version of [165,166]){
   const f=scene(version,{thirst:30});const first=offer(f.w,f.ada,f.ben)!;expect(first.label,`water, rules ${version}`).toMatch(/water/);
   f.ben.needs.thirst=3;const unseen=offer(f.w,f.ada,f.ben)!.util;look(f.w,f.ada);const looked=offer(f.w,f.ada,f.ben)!.util;
   utils[version]=[first.util,unseen,looked];sound(f.w);
  }
  expect(utils[165][1]).toBeGreaterThan(utils[165][0]);
  expect(utils[166][1]).toBe(utils[166][0]);
  expect(utils[166][2]).toBeGreaterThan(utils[166][0]);
  const g=scene(166,{thirst:19});expect(seenOf(g).parched).toBe(true);expect(seenOf(scene(166,{thirst:20})).parched).toBeUndefined();
 });
});

describe('the lab removal',()=>{
 it('restores the rules-165 reads inside a rules-166 world and nothing else',async()=>{
  const {setVisibleNeed,visibleNeedOn}=await import('../src/sim/visible_need');
  expect(visibleNeedOn()).toBe(true);setVisibleNeed(false);
  try{
   const f=scene(166,{hunger:30});const first=offer(f.w,f.ada,f.ben)!.util;f.ben.needs.hunger=5;
   expect(offer(f.w,f.ada,f.ben)!.util,'the live figure again').toBeGreaterThan(first);
   look(f.w,f.ada);expect(Object.prototype.hasOwnProperty.call(seenOf(f),'starving'),'and no sign').toBe(false);
  }finally{setVisibleNeed(true);}
  expect(visibleNeedOn()).toBe(true);
 });
});
