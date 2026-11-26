import { writeFileSync } from 'node:fs';
import { DAY } from '../src/sim/constants';
import { conservationReport } from '../src/sim/economy';
import { ageYears } from '../src/sim/people';
import { hashWorld, stepWorld } from '../src/sim/world';
import { setWorkshopErrand } from '../src/sim/workshop_errand';
import { argsOf, worldFromArgs } from './world_args';

const {opt}=argsOf(process.argv), {w,loaded}=worldFromArgs(opt);
const off=process.argv.includes('--off'), days=Number(opt('days','1'));
if (!loaded || w.settings.rulesVersion!==266 || !Number.isInteger(days) || days<1) throw Error('Expected a rules-266 continuation');
setWorkshopErrand(!off);
const previous=new Map<number,{source:number, replacement:number}>();
let switches=0, returns=0, finishedWithdrawals=0, finishedDeposits=0,finishedWorkshopOperations=0;
const example:{tick:number,event:string,source:number,workshop?:number,items:unknown}[]=[];
const initiallyAlive=w.persons.filter(p=>p.alive).map(p=>p.id);
const initialHash=hashWorld(w), start=w.tick;
w.hooks={
  onTravelReviewSwitch(p,a,b,reason){
    if(ageYears(w,p)<12 || reason!=='something better came up' || a.kind!=='withdraw' || b.kind!=='withdraw' || a.targetId===b.targetId) return;
    switches++;
    const prior=previous.get(p.id);
    if(prior?.replacement===a.id && prior.source===b.targetId)returns++;
    previous.set(p.id,{source:a.targetId,replacement:b.id});
  },
  onActivityEnd(p,a,outcome,detail){
    if(p.id===1112 && w.tick<start+800 && a.kind==='withdraw') example.push({tick:w.tick,event:outcome+' '+detail,source:a.targetId,workshop:a.data.inputWorkshop,items:a.data.items});
    if(ageYears(w,p)<12 || outcome!=='success')return;
    if(a.kind==='withdraw')finishedWithdrawals++;
    if(a.kind==='deposit')finishedDeposits++;
    if(a.kind==='operate')finishedWorkshopOperations++;
  }
};
while(w.tick<start+days*DAY)stepWorld(w);
if(!conservationReport(w).ok)throw Error('Conservation failed');
const survivors=new Set(w.persons.filter(p=>p.alive).map(p=>p.id));
const initialPeopleLost=initiallyAlive.filter(id=>!survivors.has(id)).length;
writeFileSync(opt('out',''), JSON.stringify({loaded,start,days,off,initialHash,endHash:hashWorld(w),initialPeopleLost,switches,returns,finishedWithdrawals,finishedDeposits,finishedWorkshopOperations,example},null,2));
