import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {firstHeld233,v233Continuation} from '../tests/helpers/v233ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v233_continuation.expected.json',import.meta.url);
if(process.argv.includes('--find')){console.log(JSON.stringify({first:firstHeld233(Number(process.argv[process.argv.indexOf('--find')+1]??'24000'))}));process.exit(0);}
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==233||existsSync(path)))throw Error('Record only on rules233; never overwrite');
const actual=v233Continuation();
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.replaceAll('\\','/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:233,content:lfHash(JSON.stringify(sourceManifest(files))),note:'Recorded before successor behavior, from a clean checkout; ordinary Normal aspen (arrivals on) stepped to the tick at which work put on hold by talk carries its count, saved there, then 120 ticks more, through the picking up.'};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+'\n');console.log('Recorded immutable rules233 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules233 continuation changed');console.log('Rules233 continuation unchanged');
}
