import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {v228Continuation} from '../tests/helpers/v228ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v228_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==228||existsSync(path)))throw Error('Record only on rules228; never overwrite');
const actual=v228Continuation();
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.replaceAll('\\','/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:228,content:lfHash(JSON.stringify(sourceManifest(files))),note:'Recorded before successor behavior, from a clean checkout; ordinary Normal aspen world (arrivals on) stepped to the tick by which a grown person with a job in hand has answered a child asking for family time with not now (parent_decides.ts; no such answer exists before rules 228), then 120 more after a save and load.'};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+'\n');console.log('Recorded immutable rules228 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules228 continuation changed');console.log('Rules228 continuation unchanged');
}
