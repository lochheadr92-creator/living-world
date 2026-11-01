import {expect,it} from 'vitest';
import {stage,addPerson,done} from './helpers/kit';
import {makeSource} from '../src/sim/sources';
import {newActivity,startActivity,stepActivity,suspendActivity,resumeSuspended} from '../src/sim/activities';
import '../src/sim/act_resource';
import {gatherFromSource,conservationReport} from '../src/sim/economy';
import {serializeWorld,deserializeWorld} from '../src/app/save';

for(const version of [120,121])it(`retains paid gathering across suspension at rules ${version}`,()=>{
 const s=stage('resumed-food'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const p=addPerson(s,'Talia',40.5,40.5,{age:8}),q=addPerson(s,'Other',41.5,40.5);
 const source=makeSource(w,'berry_bush',40,40,2);done(s);
 const a=newActivity(w,p,{kind:'gather',label:'Picking berries',goal:'bring food home',targetType:'source',targetId:source.id,tx:40.5,ty:40.5,spotX:40.5,spotY:40.5,amount:3,maxTicks:1000,data:{purpose:'stock'}});
 p.decisions=[{tick:w.tick,trigger:'staged physical regression',key:'gather',chosen:a.label,kind:a.kind,targetId:source.id,forPlan:0,activityId:a.id,passedOver:[],setAside:[]}];
 startActivity(w,p,a);
 for(let i=0;i<300&&a.cycle===0;i++){w.tick++;stepActivity(w,p);}
 expect(a.cycle).toBe(1);expect(p.inv.berries).toBe(1);
 suspendActivity(w,p);expect(a.claims.every(id=>!w.reservations.has(id))).toBe(true);
 expect(gatherFromSource(w,source,q,1)).toBe(1);expect(source.amount).toBe(0);
 const copy=deserializeWorld(serializeWorld(w));
 for(const world of [w,copy]){
  const child=world.persons.find(x=>x.id===p.id)!;expect(resumeSuspended(world,child)).toBe(true);
  for(let i=0;i<10&&child.activity;i++){world.tick++;stepActivity(world,child);}
  expect(child.activity).toBeNull();expect(child.inv.berries).toBe(1);
  expect(child.lastResult?.outcome).toBe(version===121?'partial':'failed');
  expect(child.decisions?.[0].outcome).toBe(version===121?'partial':'failed');
  if(version===121)expect(child.log.some(e=>e.text.includes('Gathered 1 berries'))).toBe(true);
  expect(conservationReport(world).ok).toBe(true);
 }
 expect(serializeWorld(w)).toBe(serializeWorld(copy));
});

it('does not award partial success before any food was gathered',()=>{
 const s=stage('empty-food'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=121;
 const p=addPerson(s,'Talia',40.5,40.5,{age:8}),source=makeSource(w,'berry_bush',40,40,0);done(s);
 startActivity(w,p,newActivity(w,p,{kind:'gather',label:'Picking berries',goal:'food',targetType:'source',targetId:source.id,tx:40.5,ty:40.5,spotX:40.5,spotY:40.5,amount:3,maxTicks:1000}));
 for(let i=0;i<10&&p.activity;i++){w.tick++;stepActivity(w,p);}
 expect(p.lastResult?.outcome).toBe('failed');expect(p.inv.berries??0).toBe(0);expect(conservationReport(w).ok).toBe(true);
});
