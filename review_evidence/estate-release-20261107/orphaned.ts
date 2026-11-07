// Ordinary worlds, read-only probe: how many estate parcels end up stamped for a household that no longer exists, what sits in them,
// and (from rules 163) how many parcels changed hands. Usage: vite-node <this> <seed> <days> <rules> <out.json>
import {writeFileSync} from 'node:fs';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {DAY} from '../../src/sim/constants';
import {householdById} from '../../src/sim/households';
import {toolReport} from '../../src/sim/toolreg';
import type {Items,Pile,World} from '../../src/sim/types';
const [seed='econ-cc3',days='14',rules='162',out='orphaned.json']=process.argv.slice(2);
const w=createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:Number(rules)});
const sum=(ps:Pile[])=>ps.reduce((acc,p)=>{for(const [k,n] of Object.entries(p.items))acc[k]=(acc[k]??0)+(n as number);return acc;},{} as Record<string,number>);
const TOOL=['axe','pick','hoe','basket','hammer','saw','jar','spear','net','trap','rod'];
const tools=(items:Record<string,number>)=>Object.fromEntries(Object.entries(items).filter(([k,n])=>TOOL.includes(k)&&n>0));
type Seen={created:number;owner:number;personId:number;last:Items;lastTick:number;gone?:number};
const seen=new Map<number,Seen>();
const daily:unknown[]=[];
const isOrphan=(w:World,p:Pile)=>p.estate!.hhId!==0&&!householdById(w,p.estate!.hhId);
let dissolvesWithParcels=0;
while(w.tick<Number(days)*DAY){
 stepWorld(w);
 for(const p of w.piles)if(p.estate){const s=seen.get(p.id);if(!s)seen.set(p.id,{created:w.tick,owner:p.estate.hhId,personId:p.estate.personId,last:{...p.items},lastTick:w.tick});else{s.last={...p.items};s.lastTick=w.tick;}}
 for(const [id,s] of seen)if(s.gone===undefined&&!w.piles.some(p=>p.id===id))s.gone=w.tick;
 if(w.tick%DAY===0){
  const est=w.piles.filter(p=>p.estate),orphan=est.filter(p=>isOrphan(w,p)),shared=est.filter(p=>p.estate!.hhId===0),owned=est.filter(p=>p.estate!.hhId!==0&&householdById(w,p.estate!.hhId));
  daily.push({day:w.tick/DAY,alive:w.persons.filter(p=>p.alive).length,deaths:w.deceased.length,households:w.households.length,estateParcels:est.length,orphaned:orphan.length,orphanedItems:sum(orphan),orphanedTools:tools(sum(orphan)),shared:shared.length,sharedItems:sum(shared),ownedByLiving:owned.length});
 }
}
dissolvesWithParcels=new Set(w.events.concat(w.chronicle??[]).filter(e=>/left behind/.test(e.text)).map(e=>e.id)).size;
const final=w.piles.filter(p=>p.estate);
const res={
 seed,days:Number(days),rules:Number(rules),conserved:conservationReport(w).ok,tools:toolReport(w).ok,
 alive:w.persons.filter(p=>p.alive).length,deaths:w.deceased.length,households:w.households.length,
 parcelsEverSeen:seen.size,parcelsGone:[...seen.values()].filter(s=>s.gone!==undefined).length,
 parcelsAtEnd:final.length,orphanedAtEnd:final.filter(p=>isOrphan(w,p)).length,orphanedItemsAtEnd:sum(final.filter(p=>isOrphan(w,p))),orphanedToolsAtEnd:tools(sum(final.filter(p=>isOrphan(w,p)))),
 sharedAtEnd:final.filter(p=>p.estate!.hhId===0).length,sharedItemsAtEnd:sum(final.filter(p=>p.estate!.hhId===0)),
 releaseEvents:dissolvesWithParcels,
 releaseTexts:[...new Set(w.events.concat(w.chronicle??[]).filter(e=>/left behind/.test(e.text)).map(e=>`t${e.tick}: ${e.text}`))],
 allToolsInWorld:tools(sum(w.piles).constructor===Object?Object.fromEntries(TOOL.map(k=>[k,w.tools.filter(t=>t.kind===k).length]).filter(([,n])=>(n as number)>0)):{}),
 toolsInOrphanedParcels:w.tools.filter(t=>{const p=w.piles.find(p=>p.id===t.holder);return !!p&&!!p.estate&&isOrphan(w,p);}).length,
 toolsInSharedParcels:w.tools.filter(t=>{const p=w.piles.find(p=>p.id===t.holder);return !!p&&!!p.estate&&p.estate.hhId===0;}).length,
 toolsHeldByPeople:w.tools.filter(t=>w.persons.some(p=>p.id===t.holder&&p.alive)).length,
 // why a released parcel may still lie there: salvage is offered only to a non-child whose hunger and thirst drives are under 35, and only for a parcel seen since the release
 survivors:w.persons.filter(p=>p.alive).map(p=>({name:p.name,age:Math.floor((w.tick-p.birthTick)/(DAY*12)),hunger:Math.round(p.needs.hunger),thirst:Math.round(p.needs.thirst),hh:p.hhId,activity:p.activity?.kind??null,knowsReleased:final.filter(q=>q.estate!.hhId===0||q.estate!.hhId===p.hhId).filter(q=>p.beliefs[q.id]&&p.beliefs[q.id].hh===q.estate!.hhId).length,knowsStale:final.filter(q=>p.beliefs[q.id]&&p.beliefs[q.id].hh!==q.estate!.hhId).length})),
 daily,
 parcels:[...seen.entries()].map(([id,s])=>({id,...s,personName:w.deceased.find(d=>d.id===s.personId)?.name,ownerAlive:!!householdById(w,s.owner),finalOwner:w.piles.find(p=>p.id===id)?.estate?.hhId??null})),
};
writeFileSync(out,JSON.stringify(res,null,1));
const {daily:_d,parcels:_p,releaseTexts,...head}=res;console.log(JSON.stringify(head));for(const t of releaseTexts)console.log(t);
