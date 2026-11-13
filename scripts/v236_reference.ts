import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {firstGroundWell236,v236Continuation} from '../tests/helpers/v236ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v236_continuation.expected.json',import.meta.url);
if(process.argv.includes('--find')){const k=process.argv.indexOf('--find');console.log(JSON.stringify({seed:process.argv[k+1],first:firstGroundWell236(process.argv[k+1],Number(process.argv[k+2]??'60000'))}));process.exit(0);}
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==236||existsSync(path)))throw Error('Record only on rules236; never overwrite');
const actual=v236Continuation();
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.replaceAll('\\','/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:236,content:lfHash(JSON.stringify(sourceManifest(files))),note:'Recorded before successor behavior, from a clean checkout; ordinary Normal river (arrivals on) stepped to tick 3,300, a day after a well first stands and draws on the ground beneath it and a day more, saved there, then 120 ticks more.'};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+'\n');console.log('Recorded immutable rules236 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules236 continuation changed');console.log('Rules236 continuation unchanged');
}
