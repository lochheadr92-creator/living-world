// the lived run (replayed from its transcript, no model) against the engine-driven run of the same person and window:
// the person, their household and home, and the village around them. Read-only. Usage: vite-node compare.ts <dir> <seed> <person>
import {readFileSync} from 'node:fs';
import {createWorld} from '../../src/sim/factory';
import {freshRunSettings,parseRunRules} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {runReplay,runStandard} from '../../src/agent/run';
import {sourcesFingerprint} from '../../scripts/inhabit/sources';
import {DAY} from '../../src/sim/constants';
import type {World,Person} from '../../src/sim/types';
const [dir,seed,name]=process.argv.slice(2).filter(a=>a!=='--');
const t=JSON.parse(readFileSync(`${dir}/transcript.json`,'utf8'));
const mk=():World=>{const w=createWorld(freshRunSettings(parseRunRules('rich'),'normal',seed,{harsh:false,immigration:true}));while(w.tick<DAY)stepWorld(w);return w;};
const lived=runReplay(mk(),t,{sources:sourcesFingerprint(),allowSourceDrift:true}).world;
const eng=mk();runStandard(eng,lived.tick);
const describe=(w:World)=>{
 const p=w.persons.find(q=>q.name===name)!;const hh=w.households.find(h=>h.id===p.hhId);
 const home=hh?w.byId.get(hh.homeId):undefined;
 const members=hh?hh.members.map(m=>w.byId.get(m) as Person).map(m=>`${m.name}${m.alive?'':' (dead)'} h${Math.round(m.health)} hun${Math.round(m.needs.hunger)}`):[];
 const bs=w.buildings;
 const kinds:Record<string,number>={};for(const b of bs)kinds[b.type as string]=(kinds[b.type as string]??0)+1;
 const alive=w.persons.filter(q=>q.alive);
 return {tick:w.tick,hash:undefined,person:{alive:p.alive,health:Math.round(p.health),needs:Object.fromEntries(Object.entries(p.needs).map(([k,v])=>[k,Math.round(v as number)])),inv:Object.entries(p.inv).filter(([,n])=>(n??0)>0).map(([k,n])=>n+' '+k).join(', ')||'nothing',stats:p.stats},
  household:{name:hh?.name,members,home:home&&home.ent==='building'?`${home.type} cond ${Math.round(home.condition)}`:'none'},
  village:{alive:alive.length,deaths:w.deceased.length,meanHunger:Math.round(alive.reduce((a,q)=>a+q.needs.hunger,0)/alive.length),below25:alive.filter(q=>q.needs.hunger<25).length,buildings:kinds,sites:w.sites.length}};};
console.log(JSON.stringify({name,lived:describe(lived),engine:describe(eng)},null,1));
