import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {v254Continuation,V254_TICK} from '../tests/helpers/v254ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v254_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&existsSync(path))throw Error('Never overwrite a recorded pin');
const actual=v254Continuation(V254_TICK);
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.split(String.fromCharCode(92)).join('/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:254,content:lfHash(JSON.stringify(sourceManifest(files))),note:'Recorded from the working tree at head 95ce6377 plus the uncommitted rules 251 to 255 (nothing committed yet, so not a clean checkout); ordinary Normal gen-4 (arrivals on) at tick 6000, after the first tick its world differs from the same world at the previous rules version, saved and continued 120 ticks.'};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+String.fromCharCode(10));console.log('Recorded immutable rules254 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules254 continuation changed');console.log('Rules254 continuation unchanged');
}
