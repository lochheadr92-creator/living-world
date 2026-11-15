import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {v250Continuation,V250_TICK} from '../tests/helpers/v250ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v250_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&existsSync(path))throw Error('Never overwrite a recorded pin');
const actual=v250Continuation(V250_TICK);
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.split(String.fromCharCode(92)).join('/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:250,content:lfHash(JSON.stringify(sourceManifest(files))),note:'Recorded from a clean checkout of the commit that added rules 250; ordinary Normal gen-4 (arrivals on) at tick 41200, just after the first tick its world differs from the same world at rules 249 (the ring fallback), saved and continued 120 ticks.'};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+String.fromCharCode(10));console.log('Recorded immutable rules250 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules250 continuation changed');console.log('Rules250 continuation unchanged');
}
