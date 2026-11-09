import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {v178Continuation} from '../tests/helpers/v178ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v178_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==178||existsSync(path)))throw Error('Record only on rules178; never overwrite');
const actual=v178Continuation();
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.replaceAll('\\','/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:178,content:lfHash(JSON.stringify(sourceManifest(files))),note:'Recorded before successor behavior, from a clean checkout; ordinary Normal river world (arrivals on), 2400 ticks including a site where someone knows of a different number of helpers than the register holds (first at tick 801, sampled every 50 ticks; no ordinary world reaches the cap in 12000 ticks, so the refusal itself is covered by tests/known_hands.test.ts), then 120 more after a save and load.'};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+'\n');console.log('Recorded immutable rules178 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules178 continuation changed');console.log('Rules178 continuation unchanged');
}
