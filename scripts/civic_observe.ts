import { mkdirSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import { DAY } from '../src/sim/constants';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { conservationReport } from '../src/sim/economy';
import { serializeWorld } from '../src/app/save';
import { execFileSync } from 'node:child_process';
const [out='inhabitant_evidence/civic-r36-meadow',seed='meadow',daysText='30']=process.argv.slice(2);
if(existsSync(out))throw new Error('Use a fresh evidence directory; never overwrite an earlier run');
mkdirSync(out,{recursive:true});
const w=createWorld(currentWorldSettings('large',seed,{immigration:false}));
const days=Number(daysText);if(!Number.isFinite(days)||days<=0||days>40)throw new Error('days must be 1..40');
writeFileSync(`${out}/provenance.json`,JSON.stringify({head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),diff:execFileSync('git',['diff'],{encoding:'utf8'}),settings:w.settings,days},null,2));
let deposits=0,withdrawals=0;
const log=(entry:unknown)=>appendFileSync(`${out}/events.jsonl`,JSON.stringify({tick:w.tick,...entry as object})+'\n');
w.hooks={onActivityStart(p,a){if(a.kind==='plan_site'&&a.data.type==='storehouse')log({kind:'chosen-layout',person:p.id,name:p.name});},onTransfer(t){
 const building=w.buildings.find(b=>b.type==='storehouse'&&(t.from===`building:${b.id}`||t.to===`building:${b.id}`));
 if(!building)return;
 if(t.to===`building:${building.id}`)deposits+=t.n;else withdrawals+=t.n;
 log({kind:'physical-transfer',building:building.id,...t});
}};
const recorded=new Set<string>();
while(w.tick<days*DAY){
 stepWorld(w);
 for(const p of w.civicProjects??[]){const key=`${p.id}:${p.status}`;if(!recorded.has(key)){recorded.add(key);log({kind:'project',project:p});writeFileSync(`${out}/project-${p.id}-${p.status}.json`,serializeWorld(w));}}
 if(w.tick%DAY===0){
  const offers=[];
  for(const p of w.persons.filter(p=>p.alive)){
   const c=generateOptions(w,p,true,true), ranked=rankOptions(c),o=ranked.find(o=>o.key==='plan_site:storehouse');
   if(o)offers.push({id:p.id,name:p.name,rank:ranked.indexOf(o),best:ranked[0]?.key});
  }
  const row={day:w.tick/DAY,alive:w.persons.filter(p=>p.alive).length,projects:w.civicProjects??[],storehouses:w.buildings.filter(b=>b.type==='storehouse').map(b=>({id:b.id,items:b.store.items})),sampledOffers:offers,deposits,withdrawals,conservation:conservationReport(w)};
  writeFileSync(`${out}/report.json`,JSON.stringify(row,null,2));log({kind:'daily',...row});
  console.log(JSON.stringify({day:row.day,alive:row.alive,projects:row.projects.length,stores:row.storehouses.length,deposits,withdrawals}));
  if(!row.conservation.ok)throw new Error('Resource conservation failed');
 }
}
writeFileSync(`${out}/final.json`,serializeWorld(w));
writeFileSync(`${out}/complete.txt`,`Completed ${days} ordinary Large days. Deposited ${deposits}; withdrawn ${withdrawals}.\n`);
