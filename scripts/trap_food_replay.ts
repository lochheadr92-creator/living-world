// Replay an already-completed ordinary draw, without assigning work or supplies.
import {existsSync,readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {parseIntervention} from './lab/lab';
import {sourceManifest} from './observers/provenance';
import {gearObserver} from './observers/gear';
import {carcassObserver} from './observers/carcass';
const [reference,out]=process.argv.slice(2);if(!reference||!out||existsSync(out))throw Error('Completed reference directory and fresh output required');
const expected=JSON.parse(readFileSync(reference+'/report.json','utf8'));
const files=['src','scripts'].flatMap(dir=>readdirSync(dir,{recursive:true}).map(String).filter(f=>/\.(ts|mjs)$/.test(f)).map(f=>dir+'/'+f.replaceAll('\\','/'))).sort();
const source=sourceManifest(files),sha=(s:string)=>createHash('sha256').update(s).digest('hex');
let w=createWorld({...currentWorldSettings('normal',expected.seed,{immigration:true}),rulesVersion:expected.settings.rulesVersion});
if(sha(serializeWorld(w))!==expected.initialHash)throw Error('Different initial world');
for(let n=0;n<expected.fork*2400;n++)stepWorld(w);
w=deserializeWorld(serializeWorld(w));parseIntervention(expected.nudge?`nudge:${expected.nudge}`:'control').apply?.(w);
const bodies=new Set<number>(),pure=new Set<number>(),events:unknown[]=[];let recovered=0,eaten=0;
const carcass=carcassObserver(w),gear=gearObserver(w),prior=w.hooks;
w.hooks={...prior,
 onTransfer(e){prior?.onTransfer?.(e);if(e.item==='meat'&&e.to.startsWith('person:'))pure.delete(Number(e.to.slice(7)));},
 onActivityEnd(p,a,outcome,detail){prior?.onActivityEnd?.(p,a,outcome,detail);if(a.kind==='butcher'&&a.data.part==='meat'&&outcome==='success'){
  if(bodies.has(a.targetId)){recovered++;if(p.inv.meat===1||pure.has(p.id))pure.add(p.id);events.push({tick:w.tick,kind:'recovered trapped meat',body:a.targetId,person:p.id,meat:p.inv.meat,pure:pure.has(p.id)});}else pure.delete(p.id);
 }},
 onNourishment(p,e){prior?.onNourishment?.(p,e);if(e.kind==='meal'&&p.activity?.kind==='eat'&&p.activity.data.food==='meat'&&!p.activity.data.table&&pure.has(p.id)){eaten++;events.push({tick:w.tick,kind:'ate meat exclusively from trap recovery',person:p.id,nutrition:e});}}
};
mkdirSync(out,{recursive:true});
while(w.tick<expected.tick){
 for(const b of w.piles)if(b.gear?.kind==='trap'&&b.gear.bodyId&&!bodies.has(b.gear.bodyId)){bodies.add(b.gear.bodyId);events.push({tick:w.tick,kind:'trapped body',gear:b.id,body:b.gear.bodyId});}
 for(const id of pure){const p=w.persons.find(p=>p.id===id);if(!p?.alive||!p.inv.meat)pure.delete(id);}
 carcass.tick();gear.tick();stepWorld(w);
 if(w.tick%2400===0)writeFileSync(out+'/progress.json',JSON.stringify({tick:w.tick,recovered,eaten}));
}
delete w.hooks;const final=serializeWorld(w),carcassReport=carcass.report(),gearReport=gear.report();if(sha(final)!==expected.finalSaveHash)throw Error('Replay differs from completed ordinary draw');
const copy=deserializeWorld(final);if(serializeWorld(copy)!==final||!conservationReport(w).ok)throw Error('Save or conservation failed');
for(let n=0;n<120;n++){stepWorld(w);stepWorld(copy);}if(serializeWorld(w)!==serializeWorld(copy))throw Error('Continuation differs');
if(JSON.stringify(source)!==JSON.stringify(sourceManifest(files)))throw Error('Source changed');
writeFileSync(out+'/report.json',JSON.stringify({reference,source,settings:expected.settings,fork:expected.fork,nudge:expected.nudge,finalSaveHash:sha(final),referenceEqual:true,conservation:true,continuationEqual:true,recovered,eaten,events,carcass:carcassReport,gear:gearReport,limits:'Counts only meals while all carried meat is known to originate in trapped bodies. Other incoming meat loses attribution; onward transfers are not credited. No assigned actions or supplies. Observer begins after the declared nudge.'},null,2)+'\n');
console.log(JSON.stringify({recovered,eaten,referenceEqual:true}));
