import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {v190Continuation} from '../tests/helpers/v190ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v190_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==190||existsSync(path)))throw Error('Record only on rules190; never overwrite');
const actual=v190Continuation();
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.replaceAll('\\','/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:190,content:lfHash(JSON.stringify(sourceManifest(files))),note:'Recorded before successor behavior, from a clean checkout; ordinary Normal birch world (arrivals on), 55200 ticks including a death on a doorstep buried beside the door rather than in it (at tick 55,027, sampled every 25 ticks), then 120 more after a save and load.'};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+'\n');console.log('Recorded immutable rules190 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules190 continuation changed');console.log('Rules190 continuation unchanged');
}
