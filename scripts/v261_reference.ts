import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {v261Continuation,V261_TICK} from '../tests/helpers/v261ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v261_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&existsSync(path))throw Error('Never overwrite a recorded pin');
if(process.argv.includes('--write')&&execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()!=='')throw Error('Record the pin only from a clean checkout of the landing commit');
const actual=v261Continuation(V261_TICK);
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.split(String.fromCharCode(92)).join('/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:261,content:lfHash(JSON.stringify(sourceManifest(files))),note:'Recorded from a clean checkout of the commit named in head (git status was empty when it was written); ordinary Normal gen-2 (arrivals on) at tick '+V261_TICK+', the rules 260 pin world, kept because it already holds the state rules 261 added: one person who has been beside a birth as a helper, two naming feasts with one child named aloud, and four requests to attend a birth; it holds no one lying in, no birth ask record, no child named after the dead and no vigil, none of which appeared at tick 48000 or 60000 in this world; saved and continued 120 ticks. The counts beside the digests are of the saved world.'};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+String.fromCharCode(10));console.log('Recorded immutable rules261 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules261 continuation changed');console.log('Rules261 continuation unchanged');
}
