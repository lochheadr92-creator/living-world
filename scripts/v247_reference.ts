import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {v247Continuation} from '../tests/helpers/v247ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v247_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&existsSync(path))throw Error('Never overwrite a recorded pin');
const actual=v247Continuation();
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.split(String.fromCharCode(92)).join('/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:247,content:lfHash(JSON.stringify(sourceManifest(files))),note:'Recorded from a clean checkout of the commit that added rules 247; ordinary Normal gen-2 (arrivals on) at tick 1200, saved and continued 120 ticks. onErrandWithLoad is recorded, not required.'};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+String.fromCharCode(10));console.log('Recorded immutable rules247 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules247 continuation changed');console.log('Rules247 continuation unchanged');
}
