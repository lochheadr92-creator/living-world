// Reproduce fixed ordinary forest people; no edited weather, needs or choices.
import {existsSync,mkdirSync,writeFileSync,readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import type {Person,Activity} from '../src/sim/types';
import {sourceManifest} from './observers/provenance';
const out=process.argv[2];if(!out||existsSync(out))throw new Error('Fresh output required');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/flood_story.ts').sort(),manifest=()=>sourceManifest(files),source=manifest();
const w=createWorld({...currentWorldSettings('normal','forest',{immigration:false}),rulesVersion:88}),twin=deserializeWorld(serializeWorld(w)),ids=[905,926,942],events:unknown[]=[];
const record=(p:Person,a:Activity,event:string,detail='')=>{if(w.tick<4600||!ids.includes(p.id))return;events.push({tick:w.tick,event,detail,person:p.id,name:p.name,activity:a.id,kind:a.kind,target:a.targetId,phase:a.phase,cycles:a.cycle,started:a.start,why:a.data.why,noticed:a.data.floodObservedAt,waitSince:a.data.floodWaitSince,workInterrupted:a.data.floodInterruptedWorkAt,blocked:a.blocked,x:p.x,y:p.y,inventory:{...p.inv},needs:{...p.needs},waterBody:a.data.waterBody,bodyDrawn:w.waterBodies?.find(b=>b.id===a.data.waterBody)?.drawn,belief:p.beliefs[a.targetId]?structuredClone(p.beliefs[a.targetId]):undefined});};
w.hooks={onActivityStart:(p,a)=>record(p,a,'start'),onActivityEnd:(p,a,outcome,detail)=>record(p,a,outcome,detail)};
const marked=new Set<string>();for(let n=0;n<6200;n++){for(const p of w.persons)if(ids.includes(p.id)&&p.activity){const a=p.activity;for(const key of ['floodObservedAt','floodInterruptedWorkAt','floodWaitSince']){const token=p.id+':'+a.id+':'+key+':'+a.data[key];if(a.data[key]!==undefined&&!marked.has(token)){marked.add(token);record(p,a,key);}}}stepWorld(w);stepWorld(twin);}delete w.hooks;
if(serializeWorld(w)!==serializeWorld(twin)||!conservationReport(w).ok||JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Ordinary story changed state or source');
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify({seed:'forest',settings:w.settings,tick:w.tick,source,people:w.persons.filter(p=>ids.includes(p.id)).map(p=>({id:p.id,name:p.name})),events,ledger:conservationReport(w),continuationEqual:true,limits:'Fixed ordinary people selected from the predeclared seed observation; not frequency or aggregate benefit.'},null,2));console.log(JSON.stringify({tick:w.tick,events:events.length,conserved:true,exactTwin:true}));
