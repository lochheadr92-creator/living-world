import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {v128Continuation} from '../tests/helpers/v128ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v128_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==128||existsSync(path)))throw new Error('Record only on rules 128; never overwrite');
const actual=v128Continuation();
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
  const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.replaceAll('\\','/')).sort();
  const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:128,
    content:lfHash(JSON.stringify(sourceManifest(files))),note:'Recorded before any successor behaviour; retained trap journey after a moving sighting and paid gear manufacture/placement continuation'};
  writeFileSync(path,JSON.stringify({source,...actual},null,2)+'\n');
  console.log('Recorded immutable rules-128 continuation');
}else{
  const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));
  if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Rules 128 continuation changed');
  console.log('Rules 128 continuation unchanged');
}
