import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {v256Continuation,V256_TICK} from '../tests/helpers/v256ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v256_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&existsSync(path))throw Error('Never overwrite a recorded pin');
if(process.argv.includes('--write')&&execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()!=='')throw Error('Record the pin only from a clean checkout of the landing commit');
const actual=v256Continuation(V256_TICK);
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.split(String.fromCharCode(92)).join('/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:256,content:lfHash(JSON.stringify(sourceManifest(files))),note:'Recorded from a clean checkout of the commit named in head (git status was empty when it was written); ordinary Normal gen-4 (arrivals on) at tick 6000, after the first tick its world differs from the same world at the previous rules version (scripts/keyed_first_diff.ts), saved and continued 120 ticks.'};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+String.fromCharCode(10));console.log('Recorded immutable rules256 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules256 continuation changed');console.log('Rules256 continuation unchanged');
}
