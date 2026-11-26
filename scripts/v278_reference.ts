import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {v278Continuation,V278_TICK} from '../tests/helpers/v278ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v278_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&existsSync(path))throw Error('Never overwrite a recorded pin');
if(process.argv.includes('--write')&&execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()!=='')throw Error('Record the pin only from a clean checkout of the landing commit');
const actual=v278Continuation(V278_TICK);
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.split(String.fromCharCode(92)).join('/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:278,content:lfHash(JSON.stringify(sourceManifest(files))),note:"Recorded from a clean checkout of the commit named in head (git status was empty when it was written); ordinary Normal gen-2 (arrivals on) at tick 48000 (day 20), rules 278, saved and continued 120 ticks. One pin for rules 278 alone, the worrier sets out once somebody has promised to come (src/sim/fetch_home.ts setsOutScore, called from joinParty: from 278, in a rich world with the fetch part and its own switch on, the worrier's walk to look for the missing one is offered at FETCH_JOIN_SCORE less the walk, once somebody has promised to come). It is the same world, tick and continuation length as the rules 277 pin, written with a copy of its helper (tests/helpers/v278ref.ts), so the two can be compared digest by digest. Rules 278 adds no saved field, no draw and no feed line; the counts beside the digests are the same kind as the 277 pin's and are of the saved world. This pin was not probed for whether anyone in this world is asked to fetch someone home, promises and sets out within the 120 continued ticks: the repair itself is shown by the staged scenes of tests/fetch_sets_out.test.ts, and this pin holds whatever this world does at 278."};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+String.fromCharCode(10));console.log('Recorded immutable rules278 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules278 continuation changed');console.log('Rules278 continuation unchanged');
}
