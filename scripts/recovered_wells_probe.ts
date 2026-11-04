import {writeFileSync} from 'node:fs';
import {serializeWorld} from '../src/app/save';
import {generateOptions} from '../src/sim/decision';
import {hhState} from '../src/sim/options_work';
import {layoutHome} from '../src/sim/home_replacement';
import {beliefsByKind} from '../src/sim/optutil';
// Ordinary current-rule worlds: no injected people, stores, or choices.
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {DAY} from '../src/sim/constants';
import {conservationReport} from '../src/sim/economy';
const seed=process.argv[2]??'forest',days=Number(process.argv[3]??25);
const w=createWorld(currentWorldSettings('normal',seed,{immigration:true}));
const used=new Set<number>(),built=new Set<number>(),started=new Set<number>();let drawn=0;
w.hooks={onTransfer:e=>{if(e.reason==='water drawn from well')drawn+=e.n;},onActivityStart:(p,a)=>{if(a.data.type==='well')console.log(JSON.stringify({event:'well-layout-start',tick:w.tick,person:p.name,data:a.data}));},onActivityEnd:(p,a,outcome,detail)=>{if(a.data.type==='well'||a.data.fromWell)console.log(JSON.stringify({event:'well-action-end',tick:w.tick,person:p.name,kind:a.kind,cycles:a.cycle,outcome,detail,data:a.data}));}};
for(let d=1;d<=days;d++){
 for(let i=0;i<DAY;i++){
  stepWorld(w);
  for(const p of w.persons)if(p.activity?.data.fromWell&&p.activity.phase==='work')used.add(p.id);
  for(const b of w.buildings)if(b.type==='well')built.add(b.id);
  for(const s of w.sites)if(s.type==='well')started.add(s.id);
 }
 console.log(JSON.stringify({seed,rules:w.settings.rulesVersion,arrivals:w.settings.immigration,day:d,alive:w.persons.filter(p=>p.alive).length,started:[...started],built:[...built],users:[...used],drawn,decisions:w.persons.filter(p=>p.alive).map(p=>{const c=generateOptions(w,p,true,true),home=layoutHome(c);return {id:p.id,home,food:hhState(c).foodStock,members:c.members.length,waterDistance:home?Math.min(...beliefsByKind(p,['water']).map(b=>Math.hypot(b.x-home.x,b.y-home.y))):null,tree:beliefsByKind(p,['tree']).length,rock:beliefsByKind(p,['rock']).length,offers:c.options.filter(o=>o.key==='plan_site:well').map(o=>o.util),selected:p.activity?.label};}),conservation:conservationReport(w)}));
}

writeFileSync(`review_evidence/retired-recovery-20261104/wells-${seed}-final.json`,serializeWorld(w));
