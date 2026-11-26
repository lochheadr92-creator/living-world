import {readFileSync,writeFileSync} from 'node:fs';
import {worldFromArgs,argsOf} from './world_args';
import {stepWorld,hashWorld} from '../src/sim/world';
import {consume,conservationReport,roomFor} from '../src/sim/economy';
import {carryCap} from '../src/sim/people';
import {enterHome} from '../src/sim/habitation';
import {WATER_VALUE,isSolidHome} from '../src/sim/constants';
import {clamp} from '../src/sim/util';
import type {Activity,Person,Building,World,Items} from '../src/sim/types';
import type {Ctx} from '../src/sim/optutil';

const {opt}=argsOf(process.argv),{w}=worldFromArgs(opt);
const arm=opt('arm','native'), start=w.tick;
if(!['native','door','drink'].includes(arm)||start!==96*2400||w.settings.rulesVersion!==266)throw Error('Invalid run');
const refusals=new Map<string,number>(), outcomes:Record<string,number>={}, opportunities:object[]=[];
let contacts=0,waterOfferedToThirsty=0,admissions=0,refused=0;
function recentRoom(p:Person,id:number){
  const wh=p.whereabouts[id];
  return wh?.room && wh.from===undefined && w.tick-wh.tick<900 ? wh : undefined;
}
function hold(p:Person,id:number){
  const wh=recentRoom(p,id);
  if(!wh?.room)return false;
  const b=p.beliefs[wh.room.homeId];
  return !b||!isSolidHome(b.btype)||b.hh!==p.hhId||(b.cond??1)<=0||!!p.cartId||
    wh.tick<=(refusals.get(p.id+'/'+id)??-1);
}
Object.assign(globalThis,{
  doorHold(ctx:Ctx,id:number){return arm!=='native'&&hold(ctx.p,id);},
  doorLaunch(ctx:Ctx,a:Activity){
    if(arm==='native'||!a.data.concern||ctx.seenPersons.some(s=>s.id===a.targetId))return;
    const wh=recentRoom(ctx.p,a.targetId);
    if(!wh?.room||hold(ctx.p,a.targetId))return;
    a.data.doorVisit=true;a.data.careHome=wh.room.homeId;a.data.doorMemory=wh.tick;
  },
  doorEnter(world:World,p:Person,a:Activity,b:Building){
    const reason=enterHome(world,p,b);
    if(reason){refused++;refusals.set(p.id+'/'+a.targetId,a.data.doorMemory);}
    else admissions++;
    return reason;
  },
  doorContact(p:Person,t:Person,_a:Activity,needs:{thirsty:boolean},wanted:Items){
    contacts++;
    if(needs.thirsty && (wanted.water??0)>0 && (p.inv.water??0)>0)waterOfferedToThirsty++;
  },
  doorTransfer(){},
  visitDrink(p:Person,t:Person,a:Activity,offered:number,moved:number){
    if(moved||offered<1||t.needs.thirst>=46||roomFor(t.inv,carryCap(w,t),'water')>0)return false;
    const before=t.needs.thirst,donor=p.inv.water??0,recipient=t.inv.water??0;
    if(donor<1||p.indoors!==t.indoors||Math.hypot(p.x-t.x,p.y-t.y)>5)return false;
    if(arm==='drink'){
      if(consume(w,p.inv,'water',1,'drunk')!==1)throw Error('Water missing');
      t.needs.thirst=clamp(before+WATER_VALUE,0,100);
      if((p.inv.water??0)!==donor-1||(t.inv.water??0)!==recipient)throw Error('Handover accounting');
    }
    opportunities.push({tick:w.tick,from:p.name,to:t.name,fromId:p.id,toId:t.id,start:a.start,before,after:t.needs.thirst});
    return arm==='drink';
  }
});
w.hooks={onActivityEnd(_p,a,result,reason){
  if(a.kind==='visit'){
    const key=result+' / '+(a.data.outcome??reason);
    outcomes[key]=(outcomes[key]??0)+1;
  }
}};
while(w.tick<start+2400)stepWorld(w);
const hash=hashWorld(w);
if(!conservationReport(w).ok)throw Error('Conservation');
const ref=JSON.parse(readFileSync('review_evidence/visit-departure/'+w.seed+'.json','utf8'));
if(arm==='native'&&hash!==ref.endHash)throw Error('Native endpoint mismatch');
writeFileSync(opt('out',''),JSON.stringify({seed:w.seed,arm,hash,outcomes,admissions,refused,contacts,waterOfferedToThirsty,opportunities},null,2));
