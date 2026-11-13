import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {firstSkinHung241,v241Continuation} from '../tests/helpers/v241ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v241_continuation.expected.json',import.meta.url);
if(process.argv.includes('--find')){const k=process.argv.indexOf('--find');console.log(JSON.stringify({seed:process.argv[k+1],first:firstSkinHung241(process.argv[k+1],Number(process.argv[k+2]??'60000'))}));process.exit(0);}
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==241||existsSync(path)))throw Error('Record only on rules241; never overwrite');
const actual=v241Continuation();
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.split(String.fromCharCode(92)).join('/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:241,content:lfHash(JSON.stringify(sourceManifest(files))),note:'Recorded before successor behavior, from a clean checkout; ordinary Normal fern (arrivals on) at tick 17,400, the next hundred after a wolf skin is first hung at the camp fire, saved and continued 120 ticks.'};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+'\n');console.log('Recorded immutable rules241 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules241 continuation changed');console.log('Rules241 continuation unchanged');
}
