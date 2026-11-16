import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {v252Continuation,V252_TICK} from '../tests/helpers/v252ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v252_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&existsSync(path))throw Error('Never overwrite a recorded pin');
const actual=v252Continuation(V252_TICK);
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.split(String.fromCharCode(92)).join('/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:252,content:lfHash(JSON.stringify(sourceManifest(files))),note:'Recorded from a clean checkout of the commit that added rules 252; ordinary Normal gen-4 (arrivals on) at tick 6000, after the forest has been seeded at eight times the ordinary chance (first differs from rules 251 at tick 100), saved and continued 120 ticks.'};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+String.fromCharCode(10));console.log('Recorded immutable rules252 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules252 continuation changed');console.log('Rules252 continuation unchanged');
}
