import {carryCap} from '../src/sim/people';
import {consume, roomFor, weightOf} from '../src/sim/economy';
import {WATER_VALUE, WEIGHT} from '../src/sim/constants';
import {clamp} from '../src/sim/util';
import type {Activity, ItemKind, Person, World} from '../src/sim/types';

export function visitWaterProbe(w:World, mode:string, launch:number, events:object[]){
  const pavel=w.byId.get(1131);
  if(pavel?.ent!=='person'||pavel.name!=='Pavel'||w.seed!=='gen-4'||!['observe','drink'].includes(mode))throw Error('Wrong water case');
  const recipient:Person=pavel;
  const packChanges:object[]=[];
  let prior='',contacts=0;
  function sample(){
    const key=JSON.stringify(recipient.inv);
    if(key===prior)return;
    prior=key;
    packChanges.push({tick:w.tick,pack:{...recipient.inv},activity:recipient.activity?.goal});
  }
  function snapshot(p:Person,t:Person){
    return {ulricWater:p.inv.water??0,pavelPack:{...t.inv},pavelWater:t.inv.water??0,
      weight:weightOf(t.inv),capacity:carryCap(w,t),roomForWater:roomFor(t.inv,carryCap(w,t),'water'),
      thirst:t.needs.thirst,visitorRoom:p.indoors,recipientRoom:t.indoors};
  }
  function atHandover(p:Person,t:Person,a:Activity,offered:number,moved:number){
    if(p.id!==1129||t!==pavel||a.start!==launch)return false;
    const before=snapshot(p,t);
    if(moved!==0||offered!==1||before.ulricWater!==1||before.roomForWater!==0||before.thirst>=46||
       before.visitorRoom!==6117||before.recipientRoom!==6117)throw Error('Handover differs from doorway case');
    contacts++;
    if(mode==='drink'){
      if(consume(w,p.inv,'water',1,'drunk')!==1)throw Error('Missing offered water');
      t.needs.thirst=clamp(t.needs.thirst+WATER_VALUE,0,100);
    }
    const after=snapshot(p,t);
    if(after.pavelWater!==before.pavelWater||after.weight!==before.weight||
       after.ulricWater!==before.ulricWater-Number(mode==='drink')||
       after.thirst!==before.thirst+(mode==='drink'?WATER_VALUE:0))throw Error('Water accounting mismatch');
    const weights=Object.entries(t.inv).map(([kind,n])=>({kind,n,weight:n!*WEIGHT[kind as ItemKind]}));
    events.push({event:'water test',tick:w.tick,mode,before,after,weights});
    return mode==='drink';
  }
  return {sample,atHandover,summary(){if(contacts!==1)throw Error('Expected one matched contact');return {mode,packChanges};}};
}
