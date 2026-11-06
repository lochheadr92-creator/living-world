// ORDINARY diagnosis (read-only): who may take the stone stacked at a quarry? Every 120 ticks, for each quarry holding stone:
// its owning household, the stone it holds and how much of that is earmarked, the people who may draw its free stock (owner household, builders,
// everyone if communal), and whether any of them has a site lacking stone, against the stone-short sites of OTHER households that could not draw it.
// Normal, arrivals on, rules pinned. Usage: vite-node <this> <seed> <rules> <days> <out>. Nothing here writes to the world; an unsampled twin must match.
import {writeFileSync} from 'node:fs';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {stageOf} from '../../src/sim/people';
import {accessLevel,usableUnits} from '../../src/sim/facilities';
import {DAY} from '../../src/sim/constants';
const [seed='river',rules='161',days='12',out='quarry-access.json',profile='normal']=process.argv.slice(2);
const w=createWorld({...currentWorldSettings(profile as 'normal'|'large',seed),rulesVersion:Number(rules)});
const twin=deserializeWorld(serializeWorld(w));
type Hist=Record<string,number>;
const bump=(h:Hist,k:string|number,n=1)=>{h[String(k)]=(h[String(k)]??0)+n;};
const rows:Record<string,number>[]=[];
const level:Hist={};let samples=0,quarrySamples=0,stoneAtQuarry=0,drawableByAnyoneWithShortSite=0,stoneWhereOnlyOthersLack=0,stoneWhereNoSiteLacks=0,stoneWhereOwnerLacks=0;
while(w.tick<Number(days)*DAY){
 stepWorld(w);stepWorld(twin);
 if(w.tick%120)continue;
 samples++;
 const lacking=w.sites.filter(s=>(s.required.stone??0)>(s.delivered.stone??0)+(s.used.stone??0));
 for(const b of w.buildings){
  if(b.type!=='quarry')continue;
  const have=b.store.items.stone??0;if(have<1)continue;
  quarrySamples++;stoneAtQuarry+=have;
  const ownerLacks=lacking.some(s=>s.hhId===b.hhId);
  const otherLacks=lacking.some(s=>s.hhId!==b.hhId);
  if(b.hhId===0)bump(level,'communal quarry');else bump(level,'household quarry');
  // could someone from a site-lacking household draw it?
  let drawer=0;
  for(const p of w.persons){if(!p.alive||stageOf(w,p)==='child')continue;
   if(!lacking.some(s=>s.hhId===p.hhId))continue;
   if(usableUnits(w,b,p,'stone')>0&&accessLevel(w,p,b)!=='none')drawer++;}
  if(drawer>0)drawableByAnyoneWithShortSite++;
  if(!lacking.length)stoneWhereNoSiteLacks+=have;else if(ownerLacks||b.hhId===0)stoneWhereOwnerLacks+=have;else if(otherLacks)stoneWhereOnlyOthersLack+=have;
  rows.push({tick:w.tick,quarry:b.id,owner:b.hhId,stone:have,earmarked:(b.ops?.earmarks??[]).filter(e=>e.item==='stone'&&e.until>w.tick).reduce((s,e)=>s+e.n,0),sitesLacking:lacking.length,ownerHhLacks:ownerLacks?1:0,otherHhLacks:otherLacks?1:0,peopleWhoCouldDrawWithShortSite:drawer});
 }
}
const res={seed,profile,rules:Number(rules),days:Number(days),exactTwin:serializeWorld(w)===serializeWorld(twin),conserved:conservationReport(w).ok,alive:w.persons.filter(p=>p.alive).length,
 quarries:w.buildings.filter(b=>b.type==='quarry').map(b=>({id:b.id,hh:b.hhId,stone:b.store.items.stone??0})),
 samples,quarrySamplesHoldingStone:quarrySamples,stoneAtQuarryTotalOverSamples:stoneAtQuarry,
 samplesWhereSomeoneWithAShortSiteMayDrawIt:drawableByAnyoneWithShortSite,
 stoneSampledWhereNoSiteLacks:stoneWhereNoSiteLacks,stoneSampledWhereOwnerHouseholdOrCommunalLacks:stoneWhereOwnerLacks,stoneSampledWhereOnlyOtherHouseholdsLack:stoneWhereOnlyOthersLack,quarryKind:level,rows};
writeFileSync(out,JSON.stringify(res,null,1));
const {rows:_,...short}=res;console.log(JSON.stringify(short));
