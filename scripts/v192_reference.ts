import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {v192Continuation} from '../tests/helpers/v192ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v192_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==192||existsSync(path)))throw Error('Record only on rules192; never overwrite');
const actual=v192Continuation();
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.replaceAll('\\','/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:192,content:lfHash(JSON.stringify(sourceManifest(files))),note:'Recorded before successor behavior, from a clean checkout; ordinary Normal gen-2 world (arrivals on), 7200 ticks including the first storehouse wanted from what a person knows (a recorded reason saying so by tick 7,100, sampled every 25 ticks), then 120 more after a save and load.'};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+'\n');console.log('Recorded immutable rules192 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules192 continuation changed');console.log('Rules192 continuation unchanged');
}
