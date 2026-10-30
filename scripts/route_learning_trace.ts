import {repeatedRouteScene,openStagedRoute} from '../tests/helpers/route_learning';
import {stepWorld} from '../src/sim/world';

import {conservationReport} from '../src/sim/economy';
import {ledgerCreate} from '../src/sim/economy';
import {makeSource} from '../src/sim/sources';
import {observe} from '../src/sim/knowledge';
const f=repeatedRouteScene(),{w,p}=f,rows:any[]=[];openStagedRoute(f);
if(process.argv.includes('--stone')){const rock=makeSource(w,'rock',30,30,12);ledgerCreate(w,'stone',rock.amount,'staged known complementary material');observe(w,p,rock);}
w.hooks={onActivityStart:(q,a)=>{if(q.id===p.id)rows.push({tick:w.tick,event:'start',kind:a.kind,key:a.data.optKey,amount:a.amount,why:a.data.why});},onActivityEnd:(q,a,outcome,detail)=>{if(q.id===p.id)rows.push({tick:w.tick,event:'end',kind:a.kind,key:a.data.optKey,cycle:a.cycle,outcome,detail});}};
while(w.tick<Number(process.argv[2]??6000))stepWorld(w);delete w.hooks;console.log(JSON.stringify({rows,needs:p.needs,inv:p.inv,plans:p.intentions,route:p.failures[f.tree.id],site:f.target,conserved:conservationReport(w).ok},null,2));
