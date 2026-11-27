import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {v284Continuation,V284_TICK} from '../tests/helpers/v284ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v284_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&existsSync(path))throw Error('Never overwrite a recorded pin');
if(process.argv.includes('--write')&&execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()!=='')throw Error('Record the pin only from a clean checkout of the landing commit');
const actual=v284Continuation(V284_TICK);
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.split(String.fromCharCode(92)).join('/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:284,content:lfHash(JSON.stringify(sourceManifest(files))),note:"Recorded from a clean checkout of the commit named in head (git status was empty when it was written); ordinary Normal gen-2 (arrivals on) at tick 48000 (day 20), rules 284, saved and continued 120 ticks. One pin for rules 284 alone, quiet company (src/sim/quiet_company.ts: being together at rest eases the want of company, and that want draws from 60). The same world, tick and continuation length as the rules 278 to 283 pins, written with a copy of their helper (tests/helpers/v284ref.ts). Rules 284 adds no saved field, no draw and no feed line; the counts are of the saved world."};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+String.fromCharCode(10));console.log('Recorded immutable rules284 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules284 continuation changed');console.log('Rules284 continuation unchanged');
}
