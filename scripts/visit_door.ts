import {readFileSync,writeFileSync} from 'node:fs';
import {argsOf,worldFromArgs} from './world_args';
import {stepWorld,hashWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
import {enterHome,setHabitationAdmissions} from '../src/sim/habitation';
import {isSolidHome} from '../src/sim/constants';
import type {World,Activity,Person,Building} from '../src/sim/types';
import type {Ctx} from '../src/sim/optutil';

const {opt}=argsOf(process.argv),{w}=worldFromArgs(opt);
const tick=Number(opt('tick','')),arm=opt('arm','native');
const baseline=JSON.parse(readFileSync('review_evidence/visit-departure/'+w.seed+'.json','utf8'));
const original=baseline.rows.find((r:{tick:number})=>r.tick===tick);
if(!original?.memory?.room||!['native','door','closed'].includes(arm))throw Error('Invalid case');
const events:object[]=[],held=new Set<number>();
let launchMatched=false,refusedThrough=-1;
function tracked(p:Person,target:number){
  return w.tick>=tick && p.id===original.visitor.id && target===original.target.id;
}
function room(p:Person,target:number){
  const wh=p.whereabouts[target];
  return wh?.room && wh.from===undefined && w.tick-wh.tick<900 ? wh : null;
}
Object.assign(globalThis,{
  doorContact(p:Person,t:Person,a:Activity,needs:object,wanted:object){
    if(arm==='door'&&tracked(p,t.id))events.push({event:'contact',tick:w.tick,needs,wanted,pack:{...p.inv},visitorSpace:p.indoors??0,targetSpace:t.indoors??0});
  },
  doorTransfer(p:Person,t:Person,got:object){
    if(arm==='door'&&tracked(p,t.id))events.push({event:'transfer',tick:w.tick,got});
  },
  doorHold(ctx:Ctx,target:number){
    const p=ctx.p;
    if(arm==='native'||!tracked(p,target))return false;
    const wh=room(p,target);
    if(!wh?.room)return false;
    const b=p.beliefs[wh.room.homeId];
    if(b?.btype&&isSolidHome(b.btype)&&b.hh===p.hhId&&(b.cond??1)>0&&!p.cartId&&wh.tick>refusedThrough)return false;
    if(!held.has(w.tick)){events.push({event:'held',tick:w.tick,memory:wh.tick});held.add(w.tick);}
    return true;
  },
  doorLaunch(ctx:Ctx,a:Activity){
    const p=ctx.p;
    if(!tracked(p,a.targetId))return;
    const wh=room(p,a.targetId);
    if(w.tick===tick){
      if(a.id!==original.id||p.x!==original.visitor.x||p.y!==original.visitor.y||wh?.tick!==original.memory.tick)throw Error('Unmatched start');
      launchMatched=true;
    }
    events.push({event:'launch',tick:w.tick,room:wh?.room?.homeId,memory:wh?.tick,goal:a.goal});
    if(arm!=='native'&&wh?.room&&!ctx.seenPersons.some(s=>s.id===a.targetId)){
      a.data.doorVisit=true;a.data.careHome=wh.room.homeId;a.data.doorMemory=wh.tick;
    }
  },
  doorEnter(world:World,p:Person,a:Activity,b:Building){
    // The closed arm exercises a real admission refusal only for this attempted entry.
    if(arm==='closed')setHabitationAdmissions(false);
    let reason;
    try{reason=enterHome(world,p,b);}finally{if(arm==='closed')setHabitationAdmissions(true);}
    if(reason)refusedThrough=a.data.doorMemory;
    events.push({event:'door',tick:w.tick,reason,space:p.indoors??0,room:b.id});
    return reason;
  }
});
w.hooks={onActivityEnd(p,a,result,detail){
  if(a.kind==='visit'&&tracked(p,a.targetId))events.push({event:'end',tick:w.tick,result,detail,outcome:a.data.outcome,space:p.indoors??0});
}};
while(w.tick<97*2400)stepWorld(w);
const hash=hashWorld(w);
if(!conservationReport(w).ok||!launchMatched||(arm==='native'&&hash!==baseline.endHash))throw Error('Endpoint or case mismatch');
writeFileSync(opt('out',''),JSON.stringify({seed:w.seed,tick,arm,hash,events},null,2));

