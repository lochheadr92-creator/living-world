import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {v179Continuation} from '../tests/helpers/v179ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v179_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==179||existsSync(path)))throw Error('Record only on rules179; never overwrite');
const actual=v179Continuation();
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.replaceAll('\\','/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:179,content:lfHash(JSON.stringify(sourceManifest(files))),note:'Recorded before successor behavior, from a clean checkout; ordinary Normal birch world (arrivals on), 10000 ticks including a worry whose subject the live read calls dependent and what the worrier knows does not, or the reverse (first at tick 9501, sampled every 50 ticks), then 120 more after a save and load.'};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+'\n');console.log('Recorded immutable rules179 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules179 continuation changed');console.log('Rules179 continuation unchanged');
}
