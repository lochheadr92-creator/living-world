// ORDINARY diagnostic (read-only; purity checked): options of the trap maker in the saved rules-152 meadow day-25 world.
import {readFileSync} from 'node:fs';
import {deserializeWorld,serializeWorld} from '../../src/app/save';
import {generateOptions,rankOptions} from '../../src/sim/decision';
import {demandsOf} from '../../src/sim/production';
import {carryCap} from '../../src/sim/people';
import {weightOf} from '../../src/sim/economy';
const [file,idArg]=process.argv.slice(2);const raw=readFileSync(file,'utf8');
const w=deserializeWorld(raw.startsWith('"')?JSON.parse(raw):raw);const p=w.persons.find(q=>q.id===Number(idArg))!;
const before=serializeWorld(w),ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx);
console.log(JSON.stringify({needs:p.needs,drives:ctx.drives,weight:weightOf(p.inv),cap:carryCap(w,p),
 demands:demandsOf(ctx).map(d=>[d.item,d.qty,d.have,d.why]),
 trapOptions:ctx.options.filter(o=>/trap/.test(o.key+o.label+o.goal)).map(o=>[o.key,+o.util.toFixed(1)]),
 trapBlocked:ctx.blocked.filter(o=>/trap/.test(o.key+o.label)).map(o=>[o.key,o.label,o.blocked]),
 top:ranked.slice(0,5).map(o=>[o.key,+o.util.toFixed(1)])},null,1));
if(serializeWorld(w)!==before)throw Error('impure');
