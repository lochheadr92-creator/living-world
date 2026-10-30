import {afterEach,expect,it} from 'vitest';
import {indoorCareScene} from './helpers/indoor_care';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport,produce} from '../src/sim/economy';
import {selectPrerequisite} from './helpers/tool_prerequisite';
import {carryCap} from '../src/sim/people';
import {leaveHome} from '../src/sim/habitation';
import {perceive} from '../src/sim/perception';
import {describePerson} from '../src/sim/inspect';
import {setLocalGiving} from '../src/sim/local_giving';
import {parseIntervention} from '../scripts/lab/lab';
import {generateOptions} from '../src/sim/decision';
import {newActivity,startActivity} from '../src/sim/activities';
import {weightOf} from '../src/sim/economy';
const candidate=62;
afterEach(()=>setLocalGiving(true));

it('a resident can autonomously hand bread to an injured elder in the same home, who eats it; saved continuation is exact',()=>{
 const f=indoorCareScene(candidate);f.helper.cooldowns.pause=0;f.helper.nextThink=f.w.tick;
 const transfers:{n:number;helper:number;elder:number}[]=[];
 f.w.hooks={onTransfer:t=>{if(t.reason==='given')transfers.push({n:t.n,helper:f.helper.indoors??0,elder:f.elder.indoors??0});}};
 stepWorld(f.w);expect(f.helper.activity?.kind).toBe('give');
 const saved=serializeWorld(f.w),copy=deserializeWorld(saved),hunger=f.elder.needs.hunger;
 // The staged elder's existing rest has a 500-tick minimum; allow its ordinary review/urgent-need interruption.
 for(let n=0;n<600&&f.elder.needs.hunger<hunger+5;n++){stepWorld(f.w);stepWorld(copy);}
 expect(transfers.length).toBeGreaterThan(0);
 expect(transfers.every(t=>t.helper===f.home.id&&t.elder===f.home.id)).toBe(true);
 expect(f.elder.needs.hunger).toBeGreaterThan(hunger+5);
 expect(f.w.ledger.reasons['-eaten']).toBeGreaterThan(0);
 expect(serializeWorld(f.w)).toBe(serializeWorld(copy));
 const before=serializeWorld(f.w);describePerson(f.w,f.helper.id);describePerson(f.w,f.elder.id);
 expect(serializeWorld(f.w)).toBe(before);expect(conservationReport(f.w).ok).toBe(true);
});

it('preserves the forced-exit failure for rules 61 and the isolated ablation',()=>{
 for(const version of [61,62]){
  const undo=version===62?parseIntervention('rich-no-local-giving').install!():()=>{};
  try{
   const f=indoorCareScene(version),o=generateOptions(f.w,f.helper,true,true).options.find(o=>o.key===`give:${f.elder.id}`)!;
   startActivity(f.w,f.helper,o.make!()!);stepWorld(f.w);
   expect(f.helper.lastResult?.detail).toBe('they are inside a different space');
   expect(f.helper.indoors??0).toBe(0);expect(f.elder.inv.bread??0).toBe(0);
   expect(conservationReport(f.w).ok).toBe(true);
  }finally{undo();}
 }
});

it('can give only the bread that fits and credits actual receipt',()=>{
 const f=indoorCareScene(candidate),cap=carryCap(f.w,f.elder);
 produce(f.w,f.elder.inv,cap-1,'wood',100,'staged partial pack');produce(f.w,f.elder.inv,cap-1,'seeds',100,'staged partial pack');
 const before=weightOf(f.elder.inv),{act,restore}=selectPrerequisite(f.w,f.helper,`give:${f.elder.id}`);
 try{for(let n=0;n<100&&f.helper.activity?.id===act.id;n++)stepWorld(f.w);}finally{restore();}
 expect(f.elder.inv.bread).toBe(1);expect(f.helper.inv.bread).toBe(2);
 expect(weightOf(f.elder.inv)).toBe(before+1);expect(weightOf(f.elder.inv)).toBeLessThanOrEqual(cap);
 expect(f.elder.cooldowns.fedUntil).toBeGreaterThan(f.w.tick);expect(conservationReport(f.w).ok).toBe(true);
});

it('does not admit an outside giver or hand food through the wall',()=>{
 const f=indoorCareScene(candidate);leaveHome(f.w,f.helper);
 const a=newActivity(f.w,f.helper,{kind:'give',label:'Staged stale care approach',goal:'give bread',targetId:f.elder.id,targetType:'person',here:true,data:{items:{bread:2},mode:'care'}});
 startActivity(f.w,f.helper,a);stepWorld(f.w);
 expect(f.helper.lastResult?.detail).toBe('they are inside a different space');
 expect(f.helper.indoors??0).toBe(0);expect(f.elder.indoors).toBe(f.home.id);
 expect(f.helper.inv.bread).toBe(3);expect(f.elder.inv.bread??0).toBe(0);expect(conservationReport(f.w).ok).toBe(true);
});

it.each([false,true])('a full recipient pack moves nothing and does not claim the recipient was fed (indoors=%s)',indoors=>{
 const f=indoorCareScene(candidate),cap=carryCap(f.w,f.elder);
 if(!indoors){leaveHome(f.w,f.helper);leaveHome(f.w,f.elder);perceive(f.w,f.helper);}
 produce(f.w,f.elder.inv,cap,'wood',100,'staged full pack');produce(f.w,f.elder.inv,cap,'seeds',100,'staged full pack');
 const {act,restore}=selectPrerequisite(f.w,f.helper,`give:${f.elder.id}`);
 try{for(let n=0;n<100&&f.helper.activity?.id===act.id;n++)stepWorld(f.w);}finally{restore();}
 expect(f.helper.lastResult?.detail).toBe('they had no room to carry it');
 expect(f.helper.inv.bread).toBe(3);expect(f.elder.inv.bread??0).toBe(0);
 expect(f.elder.cooldowns.fedUntil??0).toBe(0);expect(conservationReport(f.w).ok).toBe(true);
});

it('revalidates contact when the recipient moves away after handover starts',()=>{
 const f=indoorCareScene(candidate);leaveHome(f.w,f.helper);leaveHome(f.w,f.elder);perceive(f.w,f.helper);
 const {act,restore}=selectPrerequisite(f.w,f.helper,`give:${f.elder.id}`);
 try{
  for(let n=0;n<20&&act.phase==='travel';n++)stepWorld(f.w);
  expect(act.phase).toBe('work');f.elder.x+=8; // imposed departure after contact, while the gift is in progress
  for(let n=0;n<20&&f.helper.activity?.id===act.id;n++)stepWorld(f.w);
  expect(f.helper.lastResult?.outcome).toBe('failed');expect(f.helper.lastResult?.detail).toContain('reach');
  expect(f.helper.inv.bread).toBe(3);expect(f.elder.inv.bread??0).toBe(0);
  expect(conservationReport(f.w).ok).toBe(true);
 }finally{restore();}
});
