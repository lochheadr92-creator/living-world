// Diagnosis: does the live static grid keep each cell in ascending id order as a world runs? (read-only)
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
const [seed='river',profile='normal',days='10']=process.argv.slice(2);
const w=createWorld(currentWorldSettings(profile as never,seed));const bad:unknown[]=[];let checks=0;
while(w.tick<Number(days)*2400){stepWorld(w);if(w.tick%2400)continue;checks++;
 w.grid.cells.forEach((c,i)=>{for(let j=1;j<c.length;j++)if(c[j].id<c[j-1].id){if(bad.length<5)bad.push({tick:w.tick,cell:i,ids:c.map(e=>`${e.id}:${(e as {ent:string}).ent}`)});break;}});}
console.log(JSON.stringify({seed,profile,days:Number(days),checks,unsortedCells:bad.length,examples:bad}));
