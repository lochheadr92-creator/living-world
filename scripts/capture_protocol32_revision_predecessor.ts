// Immutable old-protocol evidence, generated on main before revision support.
import {existsSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {cartProjectScene} from '../tests/helpers/cart_project';
import {observe} from '../src/sim/knowledge';
import {proposeProject} from '../src/sim/proposals';
import {generateOptions} from '../src/sim/decision';
import {serializeWorld} from '../src/app/save';
import {hashWorld} from '../src/sim/world';
import {runLive} from '../src/agent/run';
import {proposerModel} from '../src/agent/stubs';
const path='autonomy_evidence/protocol31-32-before-revision.json';if(existsSync(path))throw new Error('Do not overwrite');const cases=[];
for(const memory of [false,true]){const f=cartProjectScene(113);f.target.required.stone=6;observe(f.w,f.p,f.target);const adopted=proposeProject(generateOptions(f.w,f.p,true,true),{item:'planks',quantity:4,tier:0});if(!adopted.ok)throw new Error(adopted.reason);f.p.nextThink=f.w.tick;f.p.cooldowns.pause=0;const initial=serializeWorld(f.w);const r=await runLive(f.w,f.p.id,proposerModel({item:'planks',quantity:4,tier:0},{once:true}),{until:360,memory});if(r.transcript.header.protocol!==(memory?'inhabitant/32':'inhabitant/31'))throw new Error('Not predecessor protocol');cases.push({initial,transcript:r.transcript,finalHash:hashWorld(r.world)});}
writeFileSync(path,JSON.stringify({source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),cases},null,2));console.log('Captured immutable 31/32 transcripts on predecessor main');
