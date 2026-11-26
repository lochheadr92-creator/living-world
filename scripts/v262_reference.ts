import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {v262Continuation,V262_TICK} from '../tests/helpers/v262ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v262_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&existsSync(path))throw Error('Never overwrite a recorded pin');
if(process.argv.includes('--write')&&execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()!=='')throw Error('Record the pin only from a clean checkout of the landing commit');
const actual=v262Continuation(V262_TICK);
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.split(String.fromCharCode(92)).join('/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:262,content:lfHash(JSON.stringify(sourceManifest(files))),note:'Recorded from a clean checkout of the commit named in head (git status was empty when it was written); ordinary Normal gen-2 (arrivals on) at tick '+V262_TICK+', the rules 260 and 261 pin world, kept because it already holds state rules 262 added: one fire that has had a song (Building.sung) and four feasts at which people have danced (Occasion.dance: 27 dancers recorded, 22 of them long enough to count, the one line written at all four); it holds no reunion cue, no reunion run and no dance in progress at that tick, and gen-2 at tick 60000 held none of those either (one fire with a song, seven dance feasts), so a reunion and a dancer caught mid-dance are not exercised by this pin and are covered by the staged tests only; saved and continued 120 ticks. The counts beside the digests are of the saved world.'};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+String.fromCharCode(10));console.log('Recorded immutable rules262 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules262 continuation changed');console.log('Rules262 continuation unchanged');
}
