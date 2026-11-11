import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {v200Continuation} from '../tests/helpers/v200ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v200_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)<200||Number(CURRENT_RULES_VERSION)>202||existsSync(path)))throw Error('Record only on rules 200 to 202 (the life stream was written in one tree before any of its pins); never overwrite');
const actual=v200Continuation();
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.replaceAll('\\','/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:200,content:lfHash(JSON.stringify(sourceManifest(files))),note:'Recorded before successor behavior, from a clean checkout; ordinary Normal gen-2 world (arrivals on), 2,400 ticks in which an approach committed for its walk is seen (rules 200, company.ts), then 120 more after a save and load. Recorded with the code of rules 201 and 202 present in the tree and gated off for this world, because the three versions of the life stream were written before any of their pins.'};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+'\n');console.log('Recorded immutable rules200 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules200 continuation changed');console.log('Rules200 continuation unchanged');
}
