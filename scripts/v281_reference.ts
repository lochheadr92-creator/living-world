import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {v281Continuation,V281_TICK} from '../tests/helpers/v281ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v281_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&existsSync(path))throw Error('Never overwrite a recorded pin');
if(process.argv.includes('--write')&&execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()!=='')throw Error('Record the pin only from a clean checkout of the landing commit');
const actual=v281Continuation(V281_TICK);
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.split(String.fromCharCode(92)).join('/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:281,content:lfHash(JSON.stringify(sourceManifest(files))),note:"Recorded from a clean checkout of the commit named in head (git status was empty when it was written); ordinary Normal gen-2 (arrivals on) at tick 48000 (day 20), rules 281, saved and continued 120 ticks. One pin for rules 281 alone, the hall repair (src/sim/hall_repair.ts: news passes among those at a hall, a shared meal spot that cannot be stood on becomes the nearest walkable tile, and an evening may be spent at a sound hall near home). It is the same world, tick and continuation length as the rules 278 to 280 pins, written with a copy of their helper (tests/helpers/v281ref.ts), so the pins can be compared digest by digest. Rules 281 adds no saved field, no draw and no feed line; the counts beside the digests are the same kind as the 280 pin's and are of the saved world."};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+String.fromCharCode(10));console.log('Recorded immutable rules281 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules281 continuation changed');console.log('Rules281 continuation unchanged');
}
