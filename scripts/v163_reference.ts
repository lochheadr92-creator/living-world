import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {v163Continuation} from '../tests/helpers/v163ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v163_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==163||existsSync(path)))throw Error('Record only on rules163; never overwrite');
const actual=v163Continuation();
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.replaceAll('\\','/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:163,content:lfHash(JSON.stringify(sourceManifest(files))),note:'Recorded before successor behavior; ordinary econ-cc3 world, 27120 ticks, then 120 more after a save and load; three households dissolve with estate parcels (two deaths, one child taken in)'};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+'\n');console.log('Recorded immutable rules163 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules163 continuation changed');console.log('Rules163 continuation unchanged');
}
