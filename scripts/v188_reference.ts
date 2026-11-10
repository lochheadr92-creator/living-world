import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {v188Continuation} from '../tests/helpers/v188ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v188_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==188||existsSync(path)))throw Error('Record only on rules188; never overwrite');
const actual=v188Continuation();
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.replaceAll('\\','/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:188,content:lfHash(JSON.stringify(sourceManifest(files))),note:'Recorded before successor behavior, from a clean checkout; ordinary Normal river world (arrivals on), 2400 ticks including people who remember what they last took and from where (first at tick 13, sampled every 25 ticks), then 120 more after a save and load.'};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+'\n');console.log('Recorded immutable rules188 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules188 continuation changed');console.log('Rules188 continuation unchanged');
}


