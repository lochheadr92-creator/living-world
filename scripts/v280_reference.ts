import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {v280Continuation,V280_TICK} from '../tests/helpers/v280ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v280_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&existsSync(path))throw Error('Never overwrite a recorded pin');
if(process.argv.includes('--write')&&execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()!=='')throw Error('Record the pin only from a clean checkout of the landing commit');
const actual=v280Continuation(V280_TICK);
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.split(String.fromCharCode(92)).join('/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:280,content:lfHash(JSON.stringify(sourceManifest(files))),note:"Recorded from a clean checkout of the commit named in head (git status was empty when it was written); ordinary Normal gen-2 (arrivals on) at tick 48000 (day 20), rules 280, saved and continued 120 ticks. One pin for rules 280 alone, bedtime (src/sim/bedtime.ts: after dark a child under eight is offered sleep whether tired or not and sleeps till the morning light, and takes up only bed, rest and bodily needs, and nobody starts a talk with one). It is the same world, tick and continuation length as the rules 278 and 279 pins, written with a copy of their helper (tests/helpers/v280ref.ts), so the pins can be compared digest by digest. Rules 280 adds no saved field, no draw and no feed line; the counts beside the digests are the same kind as the 279 pin's and are of the saved world."};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+String.fromCharCode(10));console.log('Recorded immutable rules280 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules280 continuation changed');console.log('Rules280 continuation unchanged');
}
