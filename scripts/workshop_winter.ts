import { createHash } from 'node:crypto';
import { readFileSync,writeFileSync } from 'node:fs';
import { DAY } from '../src/sim/constants';
import { ageYears } from '../src/sim/people';
import { conservationReport,foodUnits } from '../src/sim/economy';
import { winterDepth } from '../src/sim/hardship';
import { hashWorld,stepWorld } from '../src/sim/world';
import { setWorkshopErrand } from '../src/sim/workshop_errand';
import { TripShape } from './observers/trip_shape';
import { WithdrawCheck } from './observers/withdraw_check';
import { timeCategory,TIME_CATEGORIES } from './observers/time_budget';
import { argsOf,worldFromArgs } from './world_args';

const {opt}=argsOf(process.argv),{w,loaded,startDay}=worldFromArgs(opt);
const arm=opt('arm','on'),out=opt('out','');
if(!loaded || !out || !['on','off','n1','n2'].includes(arm) || w.settings.rulesVersion!==259 ||
   !w.settings.immigration || ![48,96].includes(startDay)) throw Error('Wrong experiment settings');
const initial=hashWorld(w), start=w.tick, initialDead=w.deceased.length;
const digest=(data:Buffer)=>createHash('sha256').update(data).digest('hex');
const saveHash=digest(readFileSync(loaded)), executableHash=digest(readFileSync(process.argv[1]));
setWorkshopErrand(arm!=='off');
for(let i=0;i<(arm==='n1'?1:arm==='n2'?2:0);i++)w.rng.next();
let returns=0,switches=0,allWalking=0,adultWalking=0,awake=0,awake12=0,hungryNoFood=0,winterTicks=0;
const finished={withdraw:0,deposit:0,operate:0}, previous=new Map<number,{act:number,store:number}>();
const categories=Object.fromEntries(TIME_CATEGORIES.map(k=>[k,0]));
w.hooks={
  onTravelReviewSwitch(p,a,b,reason){
    if(ageYears(w,p)<12 || reason!=='something better came up' || a.kind!=='withdraw'||b.kind!=='withdraw'||a.targetId===b.targetId)return;
    switches++;
    const prior=previous.get(p.id);
    if(prior?.act===a.id&&prior.store===b.targetId)returns++;
    previous.set(p.id,{act:b.id,store:a.targetId});
  },
  onActivityEnd(p,a,outcome){
    if(outcome==='success'&&ageYears(w,p)>=12&&(a.kind==='withdraw'||a.kind==='deposit'||a.kind==='operate'))finished[a.kind]++;
  }
};
const trip=new TripShape(), withdrawal=new WithdrawCheck();
trip.attach(w);withdrawal.attach(w);
for(let day=0;day<13;day++){
  for(let t=0;t<DAY;t++){
    trip.sampleTick(w);withdrawal.sampleTick(w);
    if(winterDepth(w)>0)winterTicks++;
    for(const p of w.persons){
      if(!p.alive)continue;
      const cat=timeCategory(p,w.tick),adult=ageYears(w,p)>=12;
      if(cat==='travel'){allWalking++;if(adult)adultWalking++;}
      if(p.pose==='sleep')continue;
      awake++;
      if(adult){awake12++;categories[cat]++;}
      if(p.needs.hunger<62&&foodUnits(p.inv)===0){
        const hh=w.households.find(h=>h.id===p.hhId),home=w.byId.get(hh?.homeId??0);
        if(home?.ent!=='building'||foodUnits(home.store.items)===0)hungryNoFood++;
      }
    }
    stepWorld(w);
  }
  console.log('finished day '+(day+1));
}
trip.finish(w);
const tr=trip.report(allWalking),wd=withdrawal.report(), conservation=conservationReport(w);
const checks={...tr.selfChecks,adultTravel:tr.counts.byStage['12_and_over'].walkingTicks===adultWalking,
  noUnseen:wd.counts.endedWithoutBeingSeen===0,categorySum:Object.values(categories).reduce((a,b)=>a+b,0)===awake12,
  winter:winterTicks===4*DAY-1,conservation:conservation.ok};
writeFileSync(out,JSON.stringify({arm,startDay,start,end:w.tick,initial,endHash:hashWorld(w),saveHash,executableHash,
  winterTicks,awake,awake12,categories,hungryNoFood,deaths:w.deceased.length-initialDead,alive:w.persons.filter(p=>p.alive).length,
  returns,switches,finished,checks,withdrawalCounts:wd.counts,unseenEnds:wd.unseenEndDetails},null,1));

