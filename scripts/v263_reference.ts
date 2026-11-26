import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {v263Continuation,V263_TICK} from '../tests/helpers/v263ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v263_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&existsSync(path))throw Error('Never overwrite a recorded pin');
if(process.argv.includes('--write')&&execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()!=='')throw Error('Record the pin only from a clean checkout of the landing commit');
const actual=v263Continuation(V263_TICK);
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.split(String.fromCharCode(92)).join('/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:263,content:lfHash(JSON.stringify(sourceManifest(files))),note:'Recorded from a clean checkout of the commit named in head (git status was empty when it was written); ordinary Normal gen-2 (arrivals on) at tick '+V263_TICK+', the rules 260, 261 and 262 pin world, kept because it already holds state rules 263 added: one feast that is a coming of age (Occasion.comingOfAge, one young person named) and five households with a record of a child settled for the night (Household.settled); it holds no bereavement card that says whom was lost (LifeEvent.of), no sit with the grieving and no settling in progress at that tick, so a sit with the grieving and a settling caught mid-sit are not exercised by this pin and are covered by the staged tests only; saved and continued 120 ticks. The counts beside the digests are of the saved world.'};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+String.fromCharCode(10));console.log('Recorded immutable rules263 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules263 continuation changed');console.log('Rules263 continuation unchanged');
}
