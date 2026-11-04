import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {v158Continuation} from '../tests/helpers/v158ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v158_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==158||existsSync(path)))throw Error('Record only on rules158; never overwrite');
const actual=v158Continuation();
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.replaceAll('\\','/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:158,content:lfHash(JSON.stringify(sourceManifest(files))),note:'Recorded before successor behavior; ordinary meadow world, three days, food in the pack eaten before gathering more'};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+'\n');console.log('Recorded immutable rules158 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules158 continuation changed');console.log('Rules158 continuation unchanged');
}
