// ORDINARY scan: first hand-feedings in Normal worlds at rules 159 (read-only; looks for the recipient's log line).
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {stageOf} from '../../src/sim/people';
import {DAY} from '../../src/sim/constants';
const [seed='river',days='10']=process.argv.slice(2);
const w=createWorld({...currentWorldSettings('normal',seed),rulesVersion:159});
const hits:any[]=[];const seen=new Set<string>();
while(w.tick<Number(days)*DAY){stepWorld(w);if(w.tick%30)continue;
 for(const p of w.persons)for(const l of p.log){if(l.tick<w.tick-60||!l.text.includes('by hand')||!l.text.includes('fed me'))continue;const k=p.id+':'+l.tick;if(seen.has(k))continue;seen.add(k);
  hits.push({tick:l.tick,recipient:p.name,stage:stageOf(w,p),hunger:Math.round(p.needs.hunger),pack:{...p.inv},text:l.text});}}
console.log(JSON.stringify({seed,hits:hits.length,first:hits.slice(0,4)}));
