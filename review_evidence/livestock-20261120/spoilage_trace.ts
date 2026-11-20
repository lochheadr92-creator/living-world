import {appendFileSync, writeFileSync} from 'node:fs';
import {createWorld} from './src/sim/factory';
import {currentWorldSettings} from './src/sim/profiles';
import {stepWorld,hashWorld} from './src/sim/world';
import {conservationReport, roomFor} from './src/sim/economy';
import {carryCap, stageOf} from './src/sim/people';
import {DAY} from './src/sim/constants';

const [version, output, until] = process.argv.slice(2);
const w = createWorld({...currentWorldSettings('normal','aspen'),rulesVersion:Number(version)});
writeFileSync(output, '');
const log = (type, data) => appendFileSync(output, JSON.stringify({tick:w.tick,type,data})+'\n');
function holdings() {
  return [
    ...w.persons.map(p=>[p.inv,'pack '+p.name+' #'+p.id+' hh '+p.hhId]),
    ...w.buildings.map(b=>[b.store.items,b.type+' #'+b.id+' hh '+b.hhId]),
    ...w.meals.map(m=>[m.table,'table #'+m.id]),
    ...w.piles.map(p=>[p.items,'pile #'+p.id]),
    ...w.carts.map(c=>[c.load,'cart #'+c.id]),
  ] as const;
}
function label(items) {return holdings().find(([x])=>x===items)?.[1]??'unknown';}
globalThis.stock=(items,n,before)=>log('stock',[label(items),before,n]);
globalThis.meatEvent=(kind,items,n,detail)=>log(kind,[label(items),n,detail]);
let bodyId=0;
globalThis.choice=(ctx,ranked)=>{
  if(!bodyId||w.tick>37443||ctx.p.hhId!==1086)return;
  const p=ctx.p,b=p.beliefs[bodyId],key='butcher:'+bodyId+':meat';
  log('choice',{name:p.name,ageStage:ctx.stage,critical:ctx.critical,dangers:ctx.dangers.length,
    room:roomFor(p.inv,carryCap(w,p),'meat'),believed:b?.carcassParts?.meat??null,seen:b?.seen,
    activity:p.activity?.label,top:ranked[0]?.label,topScore:ranked[0]?.util,
    raw:ctx.options.find(o=>o.key===key)?.util,rank:ranked.findIndex(o=>o.key===key)});
};
const last = new Map();
for(let i=0;i<Number(until)*DAY;i++){
  stepWorld(w);
  const body=w.tick>=27843&&w.tick<=37445?w.piles.find(b=>b.carcass?.animalId===1143):undefined;
  bodyId=body?.id??0;
  if(body){
    const c=body.carcass!;
    const s=JSON.stringify([c.remaining.meat,c.lost.meat]);
    if(s!==last.get('body')){log('body',[c.remaining.meat,c.lost.meat,c.work.meat]);last.set('body',s);}
    for(const p of w.persons.filter(p=>p.alive&&p.hhId===c.hhId)){
      const state=[p.name,stageOf(w,p),p.activity?.kind,p.activity?.label,p.activity?.phase,roomFor(p.inv,carryCap(w,p),'meat'),p.beliefs[body.id]?.carcassParts?.meat??null];
      const key=JSON.stringify(state);
      if(last.get(p.id)!==key){log('worker',state);last.set(p.id,key);}
    }
  }
  if(w.tick%DAY===0){
    const stock=holdings().filter(([x])=>x?.meat>0).map(([x,k])=>[k,x.meat]);
    log('day',{day:w.tick/DAY,stock,hash:hashWorld(w),conserved:conservationReport(w).ok});
  }
}
