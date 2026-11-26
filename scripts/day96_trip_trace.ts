import {readFileSync,writeFileSync} from 'node:fs';
import {DAY} from '../src/sim/constants';
import {ageYears} from '../src/sim/people';
import {foodUnits} from '../src/sim/economy';
import {hashWorld,stepWorld} from '../src/sim/world';
import {setWorkshopErrand} from '../src/sim/workshop_errand';
import {timeCategory} from './observers/time_budget';
import {argsOf,worldFromArgs} from './world_args';

const {opt}=argsOf(process.argv);
const {w,startDay}=worldFromArgs(opt);
const arm=opt('arm',''), reference=JSON.parse(readFileSync(opt('reference',''),'utf8'));
if(startDay!==96 || !['on','off'].includes(arm) || arm!==reference.arm || hashWorld(w)!==reference.initial) throw Error('Unexpected starting state or arm');
setWorkshopErrand(arm==='on');
type Counts=Record<string,number>;
const add=(c:Counts,k:string,n=1)=>{ c[k]=(c[k]??0)+n; };
const walking:Counts={}, legs:Counts={}, purpose:Counts={}, hungerJob:Counts={}, foodFlow:Counts={}, meals:Counts={};
const byDay:Counts={}, byHouse:Counts={}, byAge:Counts={}, states:Counts={};
const lastWalk=new Map<number,number>();
const aspen=w.settings.seed==='aspen';
let awake=0,awake12=0,hungryNoFood=0,travel=0;
if(aspen) w.hooks={
  onTransfer(e){if(foodUnits({[e.item]:1})) add(foodFlow,[e.reason,e.item,e.from.split(':')[0],e.to.split(':')[0]].join('|'),e.n);},
  onActivityEnd(p,a,result){if(['eat','eat_store','gather','attend_meal','care'].includes(a.kind)) add(meals,[a.kind,result,a.item??''].join('|'));}
};
for(let day=0;day<13;day++){
  for(let t=0;t<DAY;t++){
    const homes=new Map(w.households.map(h=>[h.id,w.byId.get(h.homeId)]));
    for(const p of w.persons){
      if(!p.alive || p.pose==='sleep'){lastWalk.delete(p.id);continue;}
      awake++;
      const age=ageYears(w,p), a=p.activity;
      const kind=a?.kind??'idle';
      if(age>=12) awake12++;
      if(age>=12 && a && timeCategory(p,w.tick)==='travel'){
        travel++;
        add(walking,kind);
        if(lastWalk.get(p.id)!==a.id) add(legs,kind);
        lastWalk.set(p.id,a.id);
        const dest=w.byId.get(a.targetId);
        const site=dest?.ent==='building'?dest.type:dest?.ent??'point';
        add(purpose,[kind,site,a.data.inputRecipe??'',Object.keys(a.data.items??{}).sort().join('+')||a.item||''].join('|'));
      }else lastWalk.delete(p.id);
      const home=homes.get(p.hhId);
      const emptyHome=home?.ent!=='building'||foodUnits(home.store.items)===0;
      const emptyPack=foodUnits(p.inv)===0;
      if(aspen){
        add(states,[emptyHome?'emptyHome':'stockedHome',emptyPack?'emptyPack':'stockedPack',p.needs.hunger<62?'hungry':'fed'].join('|'));
        add(byHouse,p.hhId+'|awake');
      }
      if(!emptyHome||!emptyPack||p.needs.hunger>=62)continue;
      hungryNoFood++;
      if(aspen){
        add(byDay,String(startDay+day));add(byHouse,p.hhId+'|short');
        add(byAge,age<7?'under7':age<12?'7-11':'12+');
        add(hungerJob,[kind,a?.phase??''].join('|'));
      }
    }
    stepWorld(w);
  }
  console.log('completed day '+(startDay+day+1));
}
const endHash=hashWorld(w);
if(endHash!==reference.endHash || travel!==reference.categories.travel || awake!==reference.awake || awake12!==reference.awake12 || hungryNoFood!==reference.hungryNoFood) throw Error('Replay differs from winter record');
writeFileSync(opt('out',''),JSON.stringify({arm,endHash,awake,awake12,travel,hungryNoFood,walking,legs,purpose,states,byDay,byAge,byHouse,hungerJob,foodFlow,meals},null,1));

