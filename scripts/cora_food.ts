import {readFileSync,writeFileSync} from 'node:fs';
import {argsOf,worldFromArgs} from './world_args';
import {hashWorld,stepWorld} from '../src/sim/world';
import {homeOf,householdOf} from '../src/sim/buildings';
import {foodUnits,conservationReport} from '../src/sim/economy';
import {withdrawAllowance} from '../src/sim/facilities';
import {goalProgress} from '../src/sim/life';
import type {Items,ItemKind,Person} from '../src/sim/types';

const {opt}=argsOf(process.argv);
const {w}=worldFromArgs(opt);
const cora=w.persons.find(p=>p.id===76332 && p.name==='Cora')!;
const ref=JSON.parse(readFileSync('review_evidence/aspiration-trace/gen-4.json','utf8'));
if(!cora || w.tick!==ref.start || hashWorld(w)!==ref.initial || w.settings.rulesVersion!==266) throw Error('Wrong start');
const family=()=>householdOf(w,cora)!;
const home=()=>homeOf(w,family())!;
const householdMembers=()=>family().members.map(id=>w.byId.get(id)).filter((p):p is Person=>p?.ent==='person' && p.alive);
const events:object[]=[], samples:ReturnType<typeof snapshot>[]=[], changes:[number,number][]=[];
const names:Record<number,string>={};
const tags=new WeakMap<Items,string>();
const belongs=(tag:string)=>{
  const id=Number(tag.split(':')[1]),e=w.byId.get(id);
  return (e?.ent==='person'||e?.ent==='building') && e.hhId===cora.hhId;
};
function register(){
  for(const p of householdMembers()){tags.set(p.inv,'person:'+p.id); names[p.id]=p.name;}
  for(const b of w.buildings) if(b.hhId===cora.hhId) tags.set(b.store.items,'building:'+b.id);
}
function foods(items:Items){
  return Object.fromEntries(Object.entries(items).filter(([k,n])=>n && foodUnits({[k]:1})));
}
function snapshot(){
  const h=family(),b=home(),members=householdMembers();
  return {tick:w.tick,hh:h.id,home:b.id,memberCount:h.members.length,homeFood:foods(b.store.items),
    recorded:cora.goal!.progress,live:goalProgress(w,cora,cora.goal!),
    packs:members.map(p=>({id:p.id,items:foods(p.inv)})),
    otherOwn:w.buildings.filter(q=>q.hhId===h.id && q.id!==b.id).map(q=>({id:q.id,type:q.type,condition:q.condition,items:foods(q.store.items)})),
    granaries:w.buildings.filter(q=>q.type==='granary').map(q=>({id:q.id,stock:foods(q.store.items),share:foods(q.ops?.shares[h.id]??{}),
      members:members.map(p=>({id:p.id,known:!!p.beliefs[q.id],allow:Object.fromEntries(Object.keys(foods(q.store.items)).map(k=>[k,withdrawAllowance(w,q,p,k as ItemKind,99)]))}))}))
  };
}
Object.assign(globalThis,{coraDebit(items:Items,item:ItemKind,n:number,reason:string){
  const source=tags.get(items);
  if(source && n>0 && foodUnits({[item]:1}) && belongs(source)) events.push({tick:w.tick,type:'debit',source,item,n,reason});
}});
w.hooks={
  onTransfer(e){
    if(!foodUnits({[e.item]:1})||(!belongs(e.from)&&!belongs(e.to)))return;
    events.push({tick:w.tick,type:'move',...e});
  },
  onNourishment(p,e){
    const a=p.activity;
    if(e.kind!=='meal' || (p.hhId!==cora.hhId && a?.targetId!==home().id))return;
    events.push({tick:w.tick,type:'bite',who:p.id,name:p.name,activity:a?.kind,target:a?.targetId,item:a?.data.food,table:!!a?.data.table,input:e.input});
  }
};
register();
samples.push(snapshot());
let previous=cora.goal!.progress;
let priorHome=home().id, priorUnits=foodUnits(home().store.items);
while(w.tick<ref.end){
  const before=w.tick;
  stepWorld(w);
  const b=home(),n=foodUnits(b.store.items);
  if(b.id!==priorHome || n!==priorUnits){
    events.push({tick:before,type:'home balance',home:b.id,units:n,items:foods(b.store.items)});
    priorHome=b.id; priorUnits=n;
  }
  if((before+cora.id*53)%1200===0 || w.tick===ref.end){
    samples.push(snapshot());
    if(cora.goal!.progress!==previous){previous=cora.goal!.progress;changes.push([w.tick,previous]);}
  }
  if(w.tick%60===0)register();
  if(w.tick%2400===0)console.log('day',w.tick/2400);
}
const expected=ref.rows.find((r:{id:number})=>r.id===cora.id).checkpoints;
const endHash=hashWorld(w),conservation=conservationReport(w).ok;
writeFileSync(opt('out',''),JSON.stringify({start:ref.start,end:w.tick,endHash,conservation,names,samples,changes,events},null,1));
if(endHash!==ref.endHash || !conservation || JSON.stringify(changes)!==JSON.stringify(expected))throw Error('Failed winter replication');

