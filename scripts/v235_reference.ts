import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {firstIronWork235,v235Continuation} from '../tests/helpers/v235ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v235_continuation.expected.json',import.meta.url);
if(process.argv.includes('--find')){const k=process.argv.indexOf('--find');console.log(JSON.stringify({seed:process.argv[k+1],first:firstIronWork235(process.argv[k+1],Number(process.argv[k+2]??'60000'))}));process.exit(0);}
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==235||existsSync(path)))throw Error('Record only on rules235; never overwrite');
const actual=v235Continuation();
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.replaceAll('\\','/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:235,content:lfHash(JSON.stringify(sourceManifest(files))),note:'Recorded before successor behavior, from a clean checkout; ordinary Normal river (arrivals on) stepped to tick 48,500, at which somebody is at work that the standing want for iron at the smithy gave them, saved there, then 120 ticks more.'};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+'\n');console.log('Recorded immutable rules235 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules235 continuation changed');console.log('Rules235 continuation unchanged');
}
