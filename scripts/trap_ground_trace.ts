import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {demandsOf} from '../src/sim/production';
import {knownTrapGround} from '../src/sim/passive_gear';
import {serializeWorld} from '../src/app/save';
const out=process.argv.at(-1)!;if(existsSync(out))throw Error('fresh output required');mkdirSync(out,{recursive:true});
const w=createWorld(currentWorldSettings('normal','forest')),counts:Record<string,number>={},samples:unknown[]=[],events:unknown[]=[];const inc=(s:string)=>counts[s]=(counts[s]??0)+1;
w.hooks={onActivityEnd(p,a,outcome,detail){if(a.kind==='gear_work'||a.data.recipe==='make_trap')events.push({tick:w.tick,person:p.id,kind:a.kind,data:{...a.data},outcome,detail});}};
for(let n=0;n<48000;n++){
 if(w.tick%240===0){const before=serializeWorld(w);for(const p of w.persons){if(!p.alive)continue;const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx),prey=Object.values(p.beliefs).filter(b=>b.kind==='prey');inc('person samples');if(!prey.length)continue;inc('knows prey');const ground=knownTrapGround(ctx);if(ground)inc('knows ground');const demand=demandsOf(ctx).find(d=>d.item==='trap');if(demand)inc('trap demand');const offered=ctx.options.filter(o=>o.key.includes('make_trap')||o.key.includes('trap')||o.key.startsWith('gear:place'));if(offered.length)inc('trap offered');
 if(samples.length<500&&ground&&w.tick%1200===0)samples.push({tick:w.tick,person:p.id,inv:p.inv,needs:p.needs,ground,prey,activity:p.activity?{kind:p.activity.kind,recipe:p.activity.data.recipe}:null,demand,offers:offered.map(o=>({key:o.key,util:o.util})),best:ranked.slice(0,4).map(o=>({key:o.key,util:o.util})),knownYards:Object.values(p.beliefs).filter(b=>b.btype==='timber_yard')});}
 if(serializeWorld(w)!==before)throw Error('Impure diagnostic');}
 stepWorld(w);
}
writeFileSync(out+'/trace.json',JSON.stringify({settings:w.settings,counts,samples,events},null,2));console.log(JSON.stringify({counts,events}));
