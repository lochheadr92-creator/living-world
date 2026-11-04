// STAGED counterfactual: continue the saved rules-153 Large life-stages-6 world (tick 54,000) with only the rules version changed,
// to see what each version's rules do from Fenn's jammed state. Not ordinary evidence: the state was reached under rules 153.
// Usage: vite-node <this> <snap.json> <rulesVersion> <endTick> <out.json>
import {readFileSync,writeFileSync} from 'node:fs';
import {deserializeWorld,serializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport,weightOf} from '../../src/sim/economy';
import {carryCap} from '../../src/sim/people';
const [snap,rules,endArg,out,switchArg]=process.argv.slice(2);
const switchTick=switchArg?Number(switchArg):0;
const w=deserializeWorld(readFileSync(snap,'utf8'));
if(!switchTick)w.settings={...w.settings,rulesVersion:Number(rules)};
let switched=!switchTick;
const FENN=4044,INES=4042;const ev:any[]=[];let died:number|null=null;const track:any[]=[];
const fenn=()=>w.persons.find(p=>p.id===FENN);
w.hooks={onActivityEnd(p,a,outcome,detail){if(p.id!==FENN&&p.id!==INES&&!(a.kind==='give'&&a.targetId===FENN))return;
 if(a.kind==='give'||a.kind==='eat'||a.kind==='eat_store'||a.kind==='deposit')ev.push({tick:w.tick,who:p.name,id:p.id,activity:a.kind,label:a.label,outcome,detail,items:a.data.items});}};
const ines:any[]=[];
w.hooks!.onActivityStart=(p,a)=>{if(p.id!==INES||w.tick<55600)return;const f=fenn();ines.push({tick:w.tick,label:a.label,inv:{...p.inv},hunger:Math.round(p.needs.hunger),distToFenn:f?+Math.hypot(f.x-p.x,f.y-p.y).toFixed(1):null,fennHunger:f?Math.round(f.needs.hunger):null,setAside:(p.lastDecision?.blocked??[]).slice(0,6).map(b=>`${b.label}: ${b.blocked}`)});};
while(w.tick<Number(endArg)){if(!switched&&w.tick>=switchTick){w.settings={...w.settings,rulesVersion:Number(rules)};switched=true;}
 stepWorld(w);const f=fenn();
 if(!f){died=w.tick;break;}
 if(w.tick%300===0)track.push({tick:w.tick,hunger:Math.round(f.needs.hunger),health:Math.round(f.health),inv:{...f.inv},load:weightOf(f.inv),cap:carryCap(w,f)});}
const d=w.deceased.find(x=>x.id===FENN);
const res={rules:Number(rules),from:54000,switchTick,end:w.tick,fennAlive:!!fenn(),died,cause:d?.cause??null,conserved:conservationReport(w).ok,ev,track,ines};
writeFileSync(out,JSON.stringify(res,null,1));
console.log(JSON.stringify({rules,end:w.tick,fennAlive:!!fenn(),died,cause:d?.cause,conserved:res.conserved,gavesToFenn:ev.filter(e=>e.activity==='give'&&e.who!=='Fenn').map(e=>`${e.tick}:${e.who}:${e.outcome}`)}));
