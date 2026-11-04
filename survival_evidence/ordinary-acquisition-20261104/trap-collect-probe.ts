// ORDINARY diagnostic (read-only probes; purity checked every sample): Normal, arrivals on, current rules.
// After a trap is made, sample its maker every 120 ticks: drives, pack, trap demand and collect/place options.
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {serializeWorld} from '../../src/app/save';
import {generateOptions,rankOptions} from '../../src/sim/decision';
import {demandsOf} from '../../src/sim/production';
import {carryCap} from '../../src/sim/people';
import {weightOf} from '../../src/sim/economy';
import {writeFileSync} from 'node:fs';
const [seed='meadow',daysArg='25',out='survival_evidence/ordinary-acquisition-20261104']=process.argv.slice(2);
const w=createWorld(currentWorldSettings('normal',seed)),rows:unknown[]=[];
while(w.tick<Number(daysArg)*2400){
 stepWorld(w);
 if(w.tick%120)continue;
 const traps=w.tools.filter(t=>t.kind==='trap');if(!traps.length)continue;
 const before=serializeWorld(w);
 for(const t of traps){const p=w.persons.find(q=>q.id===t.maker&&q.alive);if(!p)continue;
  const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx),holder=w.byId.get(t.holder);
  rows.push({tick:w.tick,trap:t.id,holder:holder?.ent==='building'?holder.type:holder?.ent,person:p.id,
   drives:Object.fromEntries(Object.entries(ctx.drives).map(([k,v])=>[k,Math.round(v as number)])),weight:weightOf(p.inv),cap:carryCap(w,p),inv:p.inv,
   demand:demandsOf(ctx).some(d=>d.item==='trap'),activity:p.activity?.kind+':'+(p.activity?.label??''),
   options:ctx.options.filter(o=>/trap|gear:place/.test(o.key+o.label)).map(o=>[o.key,+o.util.toFixed(1),ranked.indexOf(o)]),
   blocked:ctx.blocked.filter(o=>/trap/.test(o.key+o.label+o.blocked)).map(o=>[o.key,o.blocked])});}
 if(serializeWorld(w)!==before)throw Error('impure probe');
}
writeFileSync(`${out}/trap-collect-${seed}.json`,JSON.stringify({seed,rules:w.settings.rulesVersion,rows},null,1));
console.log(JSON.stringify({seed,rules:w.settings.rulesVersion,samples:rows.length,traps:w.tools.filter(t=>t.kind==='trap').map(t=>[t.id,t.holder,t.maker,t.madeTick])}));
