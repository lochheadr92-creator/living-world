import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {v264Continuation,V264_TICK} from '../tests/helpers/v264ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v264_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&existsSync(path))throw Error('Never overwrite a recorded pin');
if(process.argv.includes('--write')&&execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()!=='')throw Error('Record the pin only from a clean checkout of the landing commit');
const actual=v264Continuation(V264_TICK);
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.split(String.fromCharCode(92)).join('/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:264,content:lfHash(JSON.stringify(sourceManifest(files))),note:'Recorded from a clean checkout of the commit named in head (git status was empty when it was written); ordinary Normal gen-2 (arrivals on) at tick '+V264_TICK+', the rules 260, 261, 262 and 263 pin world, kept because it already holds state rules 264 added: five requests of kind fetch and five promises with milestone fetched (all five settled, none active); it holds no quarrel with a supporter (data.sided on an argue), no standing up for someone in progress (data.side), no shared-building project that has had a speech (CivicProject.spoke) and no search, companion or person being brought home in progress (data.fetch, data.fetchWith, data.fetchedBy) at that tick, so those are not exercised by this pin and are covered by the staged tests only; saved and continued 120 ticks. The counts beside the digests are of the saved world.'};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+String.fromCharCode(10));console.log('Recorded immutable rules264 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules264 continuation changed');console.log('Rules264 continuation unchanged');
}
