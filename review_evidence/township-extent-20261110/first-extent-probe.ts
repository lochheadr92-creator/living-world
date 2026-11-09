// Read-only probe: the first tick at which an ordinary Normal world (arrivals on, rules 185) holds a township extent. Usage: vite-node <this> -- <seed> <maxTicks>
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
const [seed='birch',max='12000']=process.argv.slice(2).filter(a=>a!=='--');
const w=createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:185});
let first=-1;
for(let i=0;i<Number(max);i++){stepWorld(w);if((w.townships??[]).some(t=>t.extent)){first=w.tick;break;}}
console.log(JSON.stringify({seed,first,extent:(w.townships??[]).map(t=>t.extent),buildings:w.buildings.length}));
