import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {firstSupply230,v230Continuation} from '../tests/helpers/v230ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v230_continuation.expected.json',import.meta.url);
const find=process.argv.indexOf('--find');
if(find>=0){console.log(JSON.stringify(firstSupply230(process.argv[find+1],Number(process.argv[find+2]??'48000'))));process.exit(0);}
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==230||existsSync(path)))throw Error('Record only on rules230; never overwrite');
const actual=v230Continuation();
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.replaceAll('\\','/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:230,content:lfHash(JSON.stringify(sourceManifest(files))),note:'Recorded before successor behavior, from a clean checkout; ordinary Normal cedar (arrivals on) stepped to the tick by which planks have been made at the timber yard and a saw lies on its rack (19,500), then 120 ticks after a save and load.'};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+'\n');console.log('Recorded immutable rules230 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules230 continuation changed');console.log('Rules230 continuation unchanged');
}
