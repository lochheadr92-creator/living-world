import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {firstArrival238,v238Continuation} from '../tests/helpers/v238ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v238_continuation.expected.json',import.meta.url);
if(process.argv.includes('--find')){const k=process.argv.indexOf('--find');console.log(JSON.stringify({seed:process.argv[k+1],first:firstArrival238(process.argv[k+1],Number(process.argv[k+2]??'60000'))}));process.exit(0);}
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==238||existsSync(path)))throw Error('Record only on rules238; never overwrite');
const actual=v238Continuation();
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.split(String.fromCharCode(92)).join('/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:238,content:lfHash(JSON.stringify(sourceManifest(files))),note:'Recorded before successor behavior, from a clean checkout; ordinary Normal birch (arrivals on), which no traveller could enter before rules 238, at the next hundred ticks after its first travellers arrive, saved and continued 120 ticks.'};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+'\n');console.log('Recorded immutable rules238 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules238 continuation changed');console.log('Rules238 continuation unchanged');
}
