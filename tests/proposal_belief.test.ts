// Rules 164: a proposal to share a life or a home is made from the proposer's own feelings and beliefs (src/sim/proposal_belief.ts).
// Every situation here is STAGED: it checks a rule, it is not an example of spontaneous behaviour. The method is the review's own:
// change one hidden fact (what the OTHER person privately feels, or the true state of their household's home) and diff Ada's options.
// Each contrast runs the same scene at rules 163 (the options follow the hidden fact) and 164 (they do not).
import {describe,expect,it} from 'vitest';
import {stage,addPerson,building,done,pin} from './helpers/kit';
import {perceive} from '../src/sim/perception';
import {rebuildMobileGrid} from '../src/sim/registry';
import {generateOptions} from '../src/sim/decision';
import {relOf,spark} from '../src/sim/relations';
import {observe} from '../src/sim/knowledge';
import {stepWorld} from '../src/sim/world';
import {setExternalController} from '../src/sim/external';
import {conservationReport,snapshotInitial} from '../src/sim/economy';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {CURRENT_RULES_VERSION,SUPPORTED_RULES_VERSIONS} from '../src/sim/rulesversion';
import type {World,Person} from '../src/sim/types';

/** Ada and a neighbour Ben who sparks with her, in sight; every other candidate is parked far away. Ada's own feelings are declared. */
function scene(version:number,o:{homeless?:boolean;benHut?:boolean}={}){
 const s=stage('staged-proposal-belief'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const ada=addPerson(s,'Ada',40,40,{age:30,sex:'f',hunger:95,thirst:95,energy:95,traits:{sociability:0.8}});
 let ben=addPerson(s,'Ben',45,40,{age:32,sex:'m',hunger:95,thirst:95,energy:95});
 const others:Person[]=[];
 for(let n=0;n<24&&!spark(ada,ben);n++){others.push(ben);ben=addPerson(s,'Cand'+n,45,40,{age:32,sex:'m',hunger:95,thirst:95,energy:95});}
 expect(spark(ada,ben)).toBe(true);
 for(const q of others){q.x=90;q.y=70;}
 const hut=o.benHut?building(s,'hut',72,40,ben.hhId):null;
 done(s);for(const p of [ada,ben,...others]){pin(p);p.needs.warmth=100;p.needs.safety=100;}
 if(hut){const hh=w.households.find(h=>h.id===ben.hhId)!;hh.homeId=hut.id;}
 rebuildMobileGrid(w);perceive(w,ada);
 expect(ada.seen.some(x=>x.id===ben.id)).toBe(true);
 snapshotInitial(w);
 return {w,ada,ben,hut,others};
}
const optionsOf=(w:World,p:Person)=>generateOptions(w,p,true,true).options.map(o=>`${o.key}|${o.label}`).sort();
const proposeOption=(w:World,p:Person,key:string)=>generateOptions(w,p,true,true).options.find(o=>o.key===key);

describe('rules 164 is registered',()=>{
 it('is registered and supported (the current version may be later)',()=>{expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(164);expect(SUPPORTED_RULES_VERSIONS).toContain(164);});
});

describe("the other person's private regard for the proposer",()=>{
 it('rules 163 offers to ask on it; rules 164 does not read it, so Ada\'s options are the same whatever Ben privately feels',()=>{
  const seen:Record<number,string[][]>={};
  for(const version of [163,164]){
   const f=scene(version);Object.assign(relOf(f.ada,f.ben.id),{affinity:40,trust:30,familiarity:20});
   const key=`socialize:${f.ben.id}:propose`,runs:string[][]=[];
   for(const regard of [10,30,-50]){relOf(f.ben,f.ada.id).affinity=regard;runs.push(optionsOf(f.w,f.ada));}
   seen[version]=runs;
   const offered=runs.map(r=>r.some(x=>x.startsWith(key)));
   if(version===163)expect(offered,'163 follows his private figure').toEqual([false,true,false]);
   else{expect(offered,'164 does not').toEqual([true,true,true]);expect(runs[1]).toEqual(runs[0]);expect(runs[2]).toEqual(runs[0]);}
  }
  expect(seen[163][0]).not.toEqual(seen[163][1]);
 });
 it('a person who has no regard of their own for the other still does not propose, at either version',()=>{
  for(const version of [163,164]){
   const f=scene(version);Object.assign(relOf(f.ada,f.ben.id),{affinity:10,trust:30,familiarity:20});relOf(f.ben,f.ada.id).affinity=60;
   expect(proposeOption(f.w,f.ada,`socialize:${f.ben.id}:propose`),`rules ${version}`).toBeUndefined();
  }
 });
 it('with no relationship of his own toward her at all Ben is still asked at 164, and not at 163',()=>{
  for(const version of [163,164]){
   const f=scene(version);Object.assign(relOf(f.ada,f.ben.id),{affinity:40,trust:30,familiarity:20});delete f.ben.relations[f.ada.id];
   expect(!!proposeOption(f.w,f.ada,`socialize:${f.ben.id}:propose`),`rules ${version}`).toBe(version>=164);
  }
 });
});

describe("the room in the other's household home",()=>{
 it('rules 163 offers to share a home Ada has never seen; rules 164 asks only once she believes in a home of his household',()=>{
  for(const version of [163,164]){
   const f=scene(version,{benHut:true});
   // kin, so the partner branch is closed and this is the roommate case: Ada has no home of her own and Ben's household has a hut
   Object.assign(relOf(f.ada,f.ben.id),{affinity:45,trust:35,familiarity:30,kin:'sibling'});relOf(f.ben,f.ada.id).affinity=40;
   expect(f.ada.beliefs[f.hut!.id],'Ada has not seen the hut').toBeUndefined();
   const key=`socialize:${f.ben.id}:propose`,before=proposeOption(f.w,f.ada,key);
   expect(!!before,`before she has seen it, rules ${version}`).toBe(version<164);
   observe(f.w,f.ada,f.hut!);
   expect(proposeOption(f.w,f.ada,key)?.label,`after seeing the hut, rules ${version}`).toBe(`Ask ${f.ben.name} about sharing a home`);
  }
 });
 it('a hut that belongs to someone else\'s household is no reason to ask Ben, at 164',()=>{
  const f=scene(164,{benHut:true});Object.assign(relOf(f.ada,f.ben.id),{affinity:45,trust:35,familiarity:30,kin:'sibling'});
  f.hut!.hhId=f.ben.hhId+999;observe(f.w,f.ada,f.hut!);
  expect(proposeOption(f.w,f.ada,`socialize:${f.ben.id}:propose`)).toBeUndefined();
 });
});

describe('an unwelcome proposal is found out by asking',()=>{
 it('at 164 a proposal to a lukewarm neighbour is made, refused, and not repeated for a while; the world stays sound',()=>{
  const f=scene(164);Object.assign(relOf(f.ada,f.ben.id),{affinity:40,trust:30,familiarity:20});relOf(f.ben,f.ada.id).affinity=5;
  const key=`socialize:${f.ben.id}:propose`;
  expect(proposeOption(f.w,f.ada,key)).toBeDefined();
  f.ada.cooldowns.pause=0;f.ben.cooldowns.pause=0;f.ben.nextThink=f.w.tick+100000;
  let asked=false;
  const release=setExternalController({controls:(_w,p)=>p.id===f.ada.id,choose:()=>asked?{kind:'defer'}:(asked=true,{kind:'pick',key})});
  const hhBefore=[f.ada.hhId,f.ben.hhId];
  try{for(let k=0;k<400&&!(f.ada.cooldowns['propose'+f.ben.id]>f.w.tick);k++)stepWorld(f.w);}finally{release();}
  expect(asked,'she asked').toBe(true);
  expect(f.ada.cooldowns['propose'+f.ben.id]??0,'refused: the ask is not repeated at once').toBeGreaterThan(f.w.tick);
  expect([f.ada.hhId,f.ben.hhId]).toEqual(hhBefore);
  f.ada.cooldowns.pause=1e12;
  expect(proposeOption(f.w,f.ada,key),'no second ask during the cooldown').toBeUndefined();
  expect(conservationReport(f.w).ok).toBe(true);
  const raw=serializeWorld(f.w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
 });
});

describe('the lab removal',()=>{
 it('restores the rules-163 reads inside a rules-164 world and nothing else',async()=>{
  const {setProposalBelief,proposalBeliefOn}=await import('../src/sim/proposal_belief');
  expect(proposalBeliefOn()).toBe(true);setProposalBelief(false);
  try{
   const f=scene(164);Object.assign(relOf(f.ada,f.ben.id),{affinity:40,trust:30,familiarity:20});relOf(f.ben,f.ada.id).affinity=10;
   expect(proposeOption(f.w,f.ada,`socialize:${f.ben.id}:propose`)).toBeUndefined();
  }finally{setProposalBelief(true);}
  expect(proposalBeliefOn()).toBe(true);
 });
});
