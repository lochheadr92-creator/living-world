// Rules 165: the cautious keep their distance from someone they SAW to be feverish, not from a fever nobody has seen (src/sim/fever_sign.ts).
// Every situation here is STAGED: it checks a rule, it is not an example of spontaneous behaviour. The method is the review's own: change one
// hidden fact (Ben's live illness record, after Ada's last glance) and diff Ada's options. Each contrast runs the same scene at rules 164
// (the avoidance follows the live record) and 165 (it follows the sign, which appears when she next looks).
import {describe,expect,it} from 'vitest';
import {stage,addPerson,done,pin} from './helpers/kit';
import {perceive} from '../src/sim/perception';
import {rebuildMobileGrid} from '../src/sim/registry';
import {generateOptions} from '../src/sim/decision';
import {relOf} from '../src/sim/relations';
import {conservationReport,snapshotInitial} from '../src/sim/economy';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {CURRENT_RULES_VERSION,SUPPORTED_RULES_VERSIONS} from '../src/sim/rulesversion';
import type {World,Person} from '../src/sim/types';

function scene(version:number,o:{caution?:number}={}){
 const s=stage('staged-fever-sign'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const ada=addPerson(s,'Ada',40,40,{age:30,sex:'f',hunger:95,thirst:95,energy:95,traits:{sociability:0.9,caution:o.caution??0.9}});
 const ben=addPerson(s,'Ben',45,40,{age:32,sex:'m',hunger:95,thirst:95,energy:95});
 done(s);for(const p of [ada,ben]){pin(p);p.needs.warmth=100;p.needs.safety=100;}
 rebuildMobileGrid(w);perceive(w,ada);
 expect(ada.seen.some(x=>x.id===ben.id)).toBe(true);
 snapshotInitial(w);
 return {w,ada,ben};
}
const fever=(w:World,p:Person,severity:number)=>{p.illness={since:w.tick,severity,rested:0,course:5000,how:'staged'};};
const asked=(w:World,ada:Person,ben:Person)=>generateOptions(w,ada,true,true).options.some(o=>o.kind==='socialize'&&o.targetId===ben.id);
const look=(w:World,ada:Person)=>{rebuildMobileGrid(w);perceive(w,ada);};
const sound=(w:World)=>{expect(conservationReport(w).ok).toBe(true);const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);};

describe('rules 165 is registered',()=>{
 it('is registered and supported (the current version may be later)',()=>{expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(165);expect(SUPPORTED_RULES_VERSIONS).toContain(165);});
});

describe('a fever that nobody has seen',()=>{
 it('rules 164 avoids Ben the moment his live record says feverish; rules 165 keeps the options as they were until Ada looks again',()=>{
  const seen:Record<number,boolean[]>={};
  for(const version of [164,165]){
   const f=scene(version);expect(asked(f.w,f.ada,f.ben),`well, rules ${version}`).toBe(true);
   fever(f.w,f.ben,0.8);                       // after her last glance, and in nobody's sight, memory or hearing
   const unseen=asked(f.w,f.ada,f.ben);
   look(f.w,f.ada);                            // she looks at him again
   const looked=asked(f.w,f.ada,f.ben);
   seen[version]=[unseen,looked];
   sound(f.w);
  }
  expect(seen[164],'164 follows the live record at once').toEqual([false,false]);
  expect(seen[165],'165 follows the sign, which appears when she looks').toEqual([true,false]);
 });
 it('the sign appears at 165 only, at the old threshold, and is absent from a record that has none',()=>{
  const old=scene(164);fever(old.w,old.ben,0.8);look(old.w,old.ada);
  expect(Object.prototype.hasOwnProperty.call(old.ada.seen.find(x=>x.id===old.ben.id)!,'feverish'),'no new key below 165').toBe(false);
  const f=scene(165);fever(f.w,f.ben,0.49);look(f.w,f.ada);
  expect(f.ada.seen.find(x=>x.id===f.ben.id)!.feverish,'0.49 is not yet plain').toBeUndefined();
  expect(asked(f.w,f.ada,f.ben)).toBe(true);
  fever(f.w,f.ben,0.5);look(f.w,f.ada);
  expect(f.ada.seen.find(x=>x.id===f.ben.id)!.feverish,'0.5 is').toBe(true);
  expect(asked(f.w,f.ada,f.ben)).toBe(false);
  f.ben.illness=undefined;look(f.w,f.ada);
  expect(f.ada.seen.find(x=>x.id===f.ben.id)!.feverish,'recovered').toBeUndefined();
  expect(asked(f.w,f.ada,f.ben)).toBe(true);
 });
 it('a friend, kin or someone who is not cautious is not avoided, as before',()=>{
  for(const version of [164,165]){
   const friend=scene(version);Object.assign(relOf(friend.ada,friend.ben.id),{affinity:50,trust:30,familiarity:30});fever(friend.w,friend.ben,0.9);look(friend.w,friend.ada);
   expect(asked(friend.w,friend.ada,friend.ben),`friend, rules ${version}`).toBe(true);
   const kin=scene(version);Object.assign(relOf(kin.ada,kin.ben.id),{affinity:5,trust:30,familiarity:30,kin:'sibling'});fever(kin.w,kin.ben,0.9);look(kin.w,kin.ada);
   expect(asked(kin.w,kin.ada,kin.ben),`kin, rules ${version}`).toBe(true);
   const bold=scene(version,{caution:0.1});fever(bold.w,bold.ben,0.9);look(bold.w,bold.ada);
   expect(asked(bold.w,bold.ada,bold.ben),`not cautious, rules ${version}`).toBe(true);
  }
 });
});

describe('the lab removal',()=>{
 it('restores the rules-164 read inside a rules-165 world and nothing else',async()=>{
  const {setFeverSign,feverSignOn}=await import('../src/sim/fever_sign');
  expect(feverSignOn()).toBe(true);setFeverSign(false);
  try{
   const f=scene(165);fever(f.w,f.ben,0.8);
   expect(asked(f.w,f.ada,f.ben),'the live record again').toBe(false);
   look(f.w,f.ada);expect(f.ada.seen.find(x=>x.id===f.ben.id)!.feverish,'and no sign').toBeUndefined();
  }finally{setFeverSign(true);}
  expect(feverSignOn()).toBe(true);
 });
});
