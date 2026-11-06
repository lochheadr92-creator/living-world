// ORDINARY census (read-only): which buildings exist at days 5, 10, 15 and 25, and how many people believe in a storehouse.
// Usage: vite-node <this> <seed> <rules> <days> <out>
import {writeFileSync} from 'node:fs';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {DAY} from '../../src/sim/constants';
const [seed='river',rules='161',days='25',out='census.json',profile='normal']=process.argv.slice(2);
const w=createWorld({...currentWorldSettings(profile as 'normal'|'large',seed),rulesVersion:Number(rules)});
const at:Record<string,unknown>={};
while(w.tick<Number(days)*DAY){stepWorld(w);
 if(w.tick%DAY===0&&[5,10,15,25].includes(w.tick/DAY)){
  const types:Record<string,number>={};for(const b of w.buildings)types[b.type]=(types[b.type]??0)+1;
  const sh=w.buildings.filter(b=>b.type==='storehouse');
  const knowing=w.persons.filter(p=>p.alive&&Object.values(p.beliefs).some(b=>b.kind==='building'&&b.btype==='storehouse')).length;
  const storehouseSites=w.sites.filter(s=>s.type==='storehouse').length;
  at['day'+w.tick/DAY]={alive:w.persons.filter(p=>p.alive).length,buildings:types,storehouses:sh.length,storehouseSitesOpen:storehouseSites,peopleWhoBelieveInAStorehouse:knowing,stoneInStorehouses:sh.reduce((a,b)=>a+(b.store.items.stone??0),0)};}}
writeFileSync(out,JSON.stringify({seed,rules:Number(rules),at},null,1));
console.log(JSON.stringify({seed,at}));
