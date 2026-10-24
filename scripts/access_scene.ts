import {mkdirSync,writeFileSync} from 'node:fs';
import {occupiedSiteFixture} from '../tests/helpers/access';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
import {isWalkable} from '../src/sim/registry';
mkdirSync('civic_evidence',{recursive:true});
const f=occupiedSiteFixture(19),{w,builder,occupant}=f;
writeFileSync('civic_evidence/access-before-save.json',serializeWorld(w));f.begin();
for(let i=0;i<12;i++)stepWorld(w);const loaded=deserializeWorld(serializeWorld(w));
for(let i=0;i<100&&!builder.lastResult;i++){stepWorld(w);stepWorld(loaded);}
const ledger=conservationReport(w),same=serializeWorld(w)===serializeWorld(loaded);
if(w.sites.length||!ledger.ok||!same||!builder.lastResult?.detail.includes('obstruct access'))throw new Error('access contract failed');
writeFileSync('civic_evidence/access-after-save.json',serializeWorld(w));
const report={label:w.sceneLabel,tick:w.tick,result:builder.lastResult,pack:builder.inv,occupant:{name:occupant.name,x:occupant.x,y:occupant.y,walkable:isWalkable(w,Math.floor(occupant.x),Math.floor(occupant.y))},midLayoutContinuation:same,ledger};
writeFileSync('civic_evidence/access-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
