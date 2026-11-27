import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {DAY} from './src/sim/constants';
import {conditionAt} from './src/sim/ecology';
import {conservationReport} from './src/sim/economy';
import {createWorld} from './src/sim/factory';
import {winterDepth,growthRate} from './src/sim/hardship';
import {observeFoodBudget} from './scripts/observers/food_budget';
import {currentWorldSettings} from './src/sim/profiles';
import {hashWorld,stepWorld} from './src/sim/world';
import {setGrainBoost} from './src/sim/plenty';
const [seed,arm,output]=process.argv.slice(2);
assert(['aspen','river'].includes(seed)&&['control','candidate'].includes(arm));
(globalThis as {cropClimateTrial?:boolean}).cropClimateTrial=arm==='candidate';
setGrainBoost(false);
const w=createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:266});
const ref=JSON.parse(readFileSync(new URL('./'+seed+'-reference.json',import.meta.url),'utf8'));
const days:any[]=[];let temperatureDigest='';let coldHumanTicks=0,veryColdHumanTicks=0,warmthDeficit=0;
for(let day=1;day<=36;day++){
 const finish=observeFoodBudget(w),beforeGrain=w.ledger.created.grain??0;
 let tempSum=0,tempMin=Infinity,tempMax=-Infinity,tempBelow4=0,leanTicks=0,winterTicks=0,overlapTicks=0;
 let plotTicks=0,careSum=0,lightSum=0,soilSum=0,leanPlotTicks=0,winterPlotTicks=0,coldPlotTicks=0,rateSum=0;
 for(let t=0;t<DAY;t++){
  const wd=winterDepth(w),lean=w.hardship?.kind==='lean',cold=w.weather.temp<4;
  tempSum+=w.weather.temp;tempMin=Math.min(tempMin,w.weather.temp);tempMax=Math.max(tempMax,w.weather.temp);tempBelow4+=Number(cold);
  temperatureDigest+=w.weather.temp.toFixed(5)+',';
  leanTicks+=Number(lean);winterTicks+=Number(wd>0);overlapTicks+=Number(lean&&wd>0);
  for(const p of w.persons)if(p.alive){if(p.needs.warmth<62)coldHumanTicks++;if(p.needs.warmth<35)veryColdHumanTicks++;warmthDeficit+=100-p.needs.warmth;}
  for(const pl of w.plots)if(pl.state==='growing'){
   plotTicks++;careSum+=0.45+0.55*pl.care;lightSum+=0.25+0.75*w.light;soilSum+=0.5+0.5*conditionAt(w,pl.x,pl.y);
   leanPlotTicks+=Number(lean);winterPlotTicks+=Number(wd>0);coldPlotTicks+=Number(cold);rateSum+=growthRate(w)*(cold?0.7:1);
  }
  stepWorld(w);
 }
 const budget=finish();assert(conservationReport(w).ok&&budget.byFood.every(f=>f.balanceError===0));
 const hash=hashWorld(w);if(day<=12&&arm==='control')assert.equal(hash,ref.days[day-1].hash);
 const stages=Object.values(budget.stages);
 days.push({day,hash,createdGrain:(w.ledger.created.grain??0)-beforeGrain,fieldHarvest:budget.transfers['harvest (plot to person)']?.grain??0,
  eatenNutrition:stages.reduce((s:any,r:any)=>s+r.intake,0),hungryAwakeTicks:stages.reduce((s:any,r:any)=>s+r.hungryAwakeTicks,0),awakeTicks:stages.reduce((s:any,r:any)=>s+r.awakeTicks,0),
  tempMean:tempSum/DAY,tempMin,tempMax,tempBelow4,leanTicks,winterTicks,overlapTicks,plotTicks,
  meanCare:plotTicks?careSum/plotTicks:0,meanDaylight:plotTicks?lightSum/plotTicks:0,meanSoil:plotTicks?soilSum/plotTicks:0,
  meanBaseRate:plotTicks?rateSum/plotTicks:0,leanPlotTicks,winterPlotTicks,coldPlotTicks,coldHumanTicks,veryColdHumanTicks,warmthDeficit,
  alive:w.persons.filter(p=>p.alive).length,dead:w.persons.filter(p=>!p.alive).length});
}
writeFileSync(output,JSON.stringify({seed,arm,source:'9b96ae61',rules:266,candidateFactors:arm==='candidate'?{lean:0.50,winterPeak:0.60,below4c:0.70}:null,grainBoost:false,temperatureDigest,days},null,2)+'\n');
