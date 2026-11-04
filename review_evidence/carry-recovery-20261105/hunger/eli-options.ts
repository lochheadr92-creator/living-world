// Diagnosis: Eli's own options at river rules 157, tick 9120 (hunger ~12, carrying 2 berries). Pure read.
import {createWorld} from '../../../src/sim/factory';
import {currentWorldSettings} from '../../../src/sim/profiles';
import {stepWorld} from '../../../src/sim/world';
import {generateOptions,rankOptions} from '../../../src/sim/decision';
import {serializeWorld} from '../../../src/app/save';
const w=createWorld({...currentWorldSettings('normal','river'),rulesVersion:157});
while(w.tick<9120)stepWorld(w);
const elis=w.persons.filter(q=>q.name==='Eli'&&q.alive).map(q=>({id:q.id,age:q.age,inv:q.inv}));const p=w.persons.find(q=>q.name==='Eli'&&q.alive&&(q.inv.berries??0)>0)!;console.log(JSON.stringify(elis));const raw=serializeWorld(w);
const ctx=generateOptions(w,p,true,true);const all=ctx.options.map(o=>({k:o.key,kind:o.kind,u:+o.util.toFixed(1),need:o.need,tag:o.tag}));
const ranked=rankOptions(ctx).slice(0,8).map(o=>({k:o.key,u:+o.util.toFixed(1)}));
console.log(JSON.stringify({tick:w.tick,inv:p.inv,needs:p.needs,drives:ctx.drives,criticals:ctx.criticals,stage:ctx.stage,
 eatOptions:all.filter(o=>o.kind==='eat'||o.kind==='eat_store'),top:ranked,blockedEat:ctx.blocked.filter(b=>b.kind==='eat').map(b=>b.blocked),intentions:p.intentions.map(i=>({kind:i.kind,wants:i.wants,status:i.status})),pure:raw===serializeWorld(w)},null,1));
