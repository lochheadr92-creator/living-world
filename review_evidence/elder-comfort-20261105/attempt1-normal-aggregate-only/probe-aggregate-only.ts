// ORDINARY diagnosis (read-only sampling): are elders worse off than adults, and if so is it age or their household circumstances?
// Normal, arrivals on, rules pinned. Every 120 ticks each living person is sampled for stage, needs, health, household shape,
// home type and condition, and what they are doing. Usage: vite-node <this> <seed> <rules> <days> <out>
import {writeFileSync} from 'node:fs';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {stageOf,ageYears} from '../../src/sim/people';
import {DAY} from '../../src/sim/constants';
import type {Person,World} from '../../src/sim/types';
const [seed='river',rules='161',days='25',out='elders.json']=process.argv.slice(2);
const w=createWorld({...currentWorldSettings('normal',seed),rulesVersion:Number(rules)});
const twin=deserializeWorld(serializeWorld(w));
const WARMING=new Set(['warm','fuel_fire']);
const REST=new Set(['rest','sleep']);
type Acc={n:number;warmth:number;health:number;hunger:number;thirst:number;energy:number;social:number;warmthLt25:number;healthLt60:number;hungerLt25:number;socialLt30:number;warming:number;resting:number;working:number;socialising:number;idle:number};
const blank=():Acc=>({n:0,warmth:0,health:0,hunger:0,thirst:0,energy:0,social:0,warmthLt25:0,healthLt60:0,hungerLt25:0,socialLt30:0,warming:0,resting:0,working:0,socialising:0,idle:0});
const groups:Record<string,Acc>={};
const home=(w:World,p:Person)=>{const hh=w.households.find(h=>h.id===p.hhId);const b=hh?w.byId.get(hh.homeId):undefined;return {hh,b:b&&b.ent==='building'?b:undefined};};
const shape=(w:World,p:Person)=>{const {hh,b}=home(w,p);const alive=hh?hh.members.filter(m=>(w.byId.get(m) as Person|undefined)?.alive).length:1;
 return {alone:alive<=1,homeType:b?b.type as string:'none',solid:!!b&&(b.type==='hut'||b.type==='house'),worn:!!b&&b.condition<60};};
const last:Record<number,{tick:number;stage:string;needs:Record<string,number>;health:number;alone:boolean;homeType:string;worn:boolean;doing:string|null}>={};
const initial=new Map(w.persons.map(p=>[p.id,stageOf(w,p)]));
function add(key:string,p:Person,w:World){const a=groups[key]??=blank();const n=p.needs;
 a.n++;a.warmth+=n.warmth;a.health+=p.health;a.hunger+=n.hunger;a.thirst+=n.thirst;a.energy+=n.energy;a.social+=n.social;
 if(n.warmth<25)a.warmthLt25++;if(p.health<60)a.healthLt60++;if(n.hunger<25)a.hungerLt25++;if(n.social<30)a.socialLt30++;
 const k=p.activity?.kind;if(!k)a.idle++;else if(WARMING.has(k)||(k==='rest'&&p.activity?.need==='warmth'))a.warming++;else if(REST.has(k))a.resting++;else if(k==='socialize'||k==='converse'||k==='attend')a.socialising++;else a.working++;}
while(w.tick<Number(days)*DAY){stepWorld(w);stepWorld(twin);if(w.tick%120)continue;
 for(const p of w.persons){if(!p.alive)continue;const st=stageOf(w,p),s=shape(w,p);
  add(`${st}`,p,w);
  if(st==='elder'){add(`elder|${s.alone?'alone':'with others'}`,p,w);add(`elder|home ${s.solid?'solid':s.homeType==='none'?'none':'lean-to or other'}`,p,w);add(`elder|${s.alone?'alone':'with others'}|home ${s.solid?'solid':s.homeType==='none'?'none':'lean-to or other'}`,p,w);}
  if(st==='adult'){add(`adult|${s.alone?'alone':'with others'}`,p,w);add(`adult|home ${s.solid?'solid':s.homeType==='none'?'none':'lean-to or other'}`,p,w);}
  last[p.id]={tick:w.tick,stage:st,needs:{...p.needs},health:p.health,alone:s.alone,homeType:s.homeType,worn:s.worn,doing:p.activity?`${p.activity.kind}${p.activity.need?':'+p.activity.need:''}`:null};}}
const mean=(a:Acc)=>({n:a.n,warmth:+(a.warmth/a.n).toFixed(1),health:+(a.health/a.n).toFixed(1),hunger:+(a.hunger/a.n).toFixed(1),social:+(a.social/a.n).toFixed(1),energy:+(a.energy/a.n).toFixed(1),
 shareWarmthLt25:+(a.warmthLt25/a.n).toFixed(3),shareHealthLt60:+(a.healthLt60/a.n).toFixed(3),shareHungerLt25:+(a.hungerLt25/a.n).toFixed(3),shareSocialLt30:+(a.socialLt30/a.n).toFixed(3),
 time:{warming:+(a.warming/a.n).toFixed(3),resting:+(a.resting/a.n).toFixed(3),working:+(a.working/a.n).toFixed(3),socialising:+(a.socialising/a.n).toFixed(3),idle:+(a.idle/a.n).toFixed(3)}});
const table=Object.fromEntries(Object.entries(groups).sort().map(([k,v])=>[k,mean(v)]));
const deaths=w.deceased.map(d=>{const l=last[d.id];return {id:d.id,name:d.name,tick:d.tick,age:Math.round(d.age*10)/10,cause:d.cause,atFounding:initial.has(d.id),stageAtDeath:l?.stage??null,lastSample:l?{ago:d.tick-l.tick,warmth:Math.round(l.needs.warmth),hunger:Math.round(l.needs.hunger),thirst:Math.round(l.needs.thirst),health:Math.round(l.health),alone:l.alone,homeType:l.homeType,worn:l.worn,doing:l.doing}:null};});
const byStage=(st:string)=>{const ids=[...initial.entries()].filter(([,s])=>s===st).map(([id])=>id);const alive=ids.filter(id=>w.persons.find(p=>p.id===id)?.alive).length;return {start:ids.length,aliveAtEnd:alive};};
const deathCauses:Record<string,Record<string,number>>={};for(const d of deaths){const st=d.stageAtDeath??'unknown';(deathCauses[st]??={});deathCauses[st][d.cause]=(deathCauses[st][d.cause]??0)+1;}
const res={seed,rules:Number(rules),days:Number(days),exactTwin:serializeWorld(w)===serializeWorld(twin),conserved:conservationReport(w).ok,alive:w.persons.filter(p=>p.alive).length,
 initialSurvival:{child:byStage('child'),youth:byStage('youth'),adult:byStage('adult'),elder:byStage('elder')},deathCauses,table,deaths:deaths.filter(d=>d.stageAtDeath==='elder'||d.age>=58)};
writeFileSync(out,JSON.stringify(res,null,1));
console.log(JSON.stringify({seed,rules:res.rules,exactTwin:res.exactTwin,conserved:res.conserved,alive:res.alive,initialSurvival:res.initialSurvival,deathCauses}));
