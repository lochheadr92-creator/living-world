// Frozen rules-93 ordinary and physically owned belongings before living-worker handover.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport,snapshotInitial} from '../../src/sim/economy';
import {setExternalController} from '../../src/sim/external';
import {generateOptions} from '../../src/sim/decision';
import {startActivity,newActivity} from '../../src/sim/activities';
import {observe} from '../../src/sim/knowledge';
import {killPerson} from '../../src/sim/lifecycle';
import {makeSource} from '../../src/sim/sources';
import {site} from './kit';
import {estateScene} from './estate';
import type {World} from '../../src/sim/types';
export function v93Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-93 continuation');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:93});for(let n=0;n<600;n++)stepWorld(w);const ordinary=advance(w,120);
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});
 try{
  const f=estateScene(93),tree=makeSource(f.w,'tree',36,40,12),home=site({w:f.w,rng:null!},'lean_to',48,43,f.lender.hhId,f.lender.id);
  observe(f.w,f.lender,tree);observe(f.w,f.lender,home);f.b.inv={grain:10};snapshotInitial(f.w);f.borrowed.wear=27;killPerson(f.w,f.a,'declared mixed-ownership loss');
  const parcel=f.w.piles.find(p=>p.estate?.hhId===f.b.hhId)!,loan=f.w.piles.find(p=>p.id===f.borrowed.holder)!;
  const estates=advance(f.w,4);
  f.b.x=parcel.x+.5;f.b.y=parcel.y+1.5;f.b.cooldowns.pause=0;f.b.nextThink=f.w.tick+1000;
  startActivity(f.w,f.b,newActivity(f.w,f.b,{kind:'withdraw',label:'Staged estate collection',goal:'recover belongings physically',targetId:parcel.id,targetType:'pile',here:true,utility:100,minCommit:100,maxTicks:200,data:{items:{wood:3}}}));
  for(let n=0;n<4;n++)stepWorld(f.w);const collection=advance(f.w,40);
  if(f.b.inv.wood!==1||parcel.items.wood!==2)throw new Error('Missing capacity-limited paid collection');
  observe(f.w,f.lender,loan);f.lender.x=loan.x+.5;f.lender.y=loan.y+1.5;f.lender.cooldowns.pause=0;
  const take=generateOptions(f.w,f.lender,true,true).options.find(o=>o.kind==='withdraw'&&o.targetId===loan.id);if(!take)throw new Error('Missing legal recovery');startActivity(f.w,f.lender,take.make!()!);
  for(let n=0;n<600&&f.borrowed.holder!==f.lender.id;n++)stepWorld(f.w);
  if(f.borrowed.holder!==f.lender.id||f.borrowed.wear!==27)throw new Error('Wrong recovered tool');
  const work=generateOptions(f.w,f.lender,true,true).options.find(o=>o.kind==='gather'&&o.targetId===tree.id);if(!work)throw new Error('Missing real use');startActivity(f.w,f.lender,work.make!()!);
  const use=advance(f.w,600);if((f.lender.inv.wood??0)<1||f.borrowed.wear<=27)throw new Error('Missing paid work with recovered tool');
  return {ordinary,estates,collection,use};
 }finally{release();}
}
