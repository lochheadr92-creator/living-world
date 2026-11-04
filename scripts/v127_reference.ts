import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {v127Continuation} from '../tests/helpers/v127ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v127_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==127||existsSync(path)))throw new Error('Record only on rules 127; never overwrite');
const actual=v127Continuation();
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
  const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.replaceAll('\\','/')).sort();
  const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:127,
    content:lfHash(JSON.stringify(sourceManifest(files))),note:'Recorded before any successor behaviour; dated deer sighting and paid gear manufacture, placement and waiting continuation'};
  writeFileSync(path,JSON.stringify({source,...actual},null,2)+'\n');
  console.log('Recorded immutable rules-127 continuation');
}else{
  const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));
  if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Rules 127 continuation changed');
  console.log('Rules 127 continuation unchanged');
}
