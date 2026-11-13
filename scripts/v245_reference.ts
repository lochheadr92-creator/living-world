import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {firstExactOwnStores245,v245Continuation} from '../tests/helpers/v245ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v245_continuation.expected.json',import.meta.url);
if(process.argv.includes('--find')){const k=process.argv.indexOf('--find');console.log(JSON.stringify({seed:process.argv[k+1],first:firstExactOwnStores245(process.argv[k+1],Number(process.argv[k+2]??'60000'))}));process.exit(0);}
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==245||existsSync(path)))throw Error('Record only on rules245; never overwrite');
const actual=v245Continuation();
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.split(String.fromCharCode(92)).join('/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:245,content:lfHash(JSON.stringify(sourceManifest(files))),note:'Recorded before successor behavior, from a clean checkout; ordinary Normal gen-2 (arrivals on) at tick 1200, where ten people remember the store of their own household exactly where the glance of rules 169 would have given one unit of each kind, saved and continued 120 ticks.'};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+'\n');console.log('Recorded immutable rules245 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules245 continuation changed');console.log('Rules245 continuation unchanged');
}
