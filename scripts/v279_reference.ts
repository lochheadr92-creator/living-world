import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {v279Continuation,V279_TICK} from '../tests/helpers/v279ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v279_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&existsSync(path))throw Error('Never overwrite a recorded pin');
if(process.argv.includes('--write')&&execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()!=='')throw Error('Record the pin only from a clean checkout of the landing commit');
const actual=v279Continuation(V279_TICK);
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.split(String.fromCharCode(92)).join('/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:279,content:lfHash(JSON.stringify(sourceManifest(files))),note:"Recorded from a clean checkout of the commit named in head (git status was empty when it was written); ordinary Normal gen-2 (arrivals on) at tick 48000 (day 20), rules 279, saved and continued 120 ticks. One pin for rules 279 alone, the lying-in repair (src/sim/birth_help.ts lyingInBegin: from 279 a child born while the woman is still walking to her door leaves no lying-in mark and no line; staleLyingIn, called at the end of lifeTick in src/sim/lifecycle.ts, clears a mark that has no child expected or is older than a day and a third; validateBirthHelp no longer refuses such a mark, for any version). It is the same world, tick and continuation length as the rules 278 pin, written with a copy of its helper (tests/helpers/v279ref.ts), so the two can be compared digest by digest. Rules 279 adds no saved field, no draw and no feed line; the counts beside the digests are the same kind as the 278 pin's and are of the saved world. This pin was not probed for whether anyone in this world is walking to a lie-in rest when her child comes within the 120 continued ticks: the repair itself is shown by the staged scenes of tests/birth_help.test.ts, and this pin holds whatever this world does at 279."};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+String.fromCharCode(10));console.log('Recorded immutable rules279 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules279 continuation changed');console.log('Rules279 continuation unchanged');
}
