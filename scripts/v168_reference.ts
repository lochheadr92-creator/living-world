import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {v168Continuation} from '../tests/helpers/v168ref';
import {lfHash,sourceManifest} from './observers/provenance';
const path=new URL('../tests/v168_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==168||existsSync(path)))throw Error('Record only on rules168; never overwrite');
const actual=v168Continuation();
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.replaceAll('\\','/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:168,content:lfHash(JSON.stringify(sourceManifest(files))),note:'Recorded before successor behavior, from a clean checkout; ordinary Normal birch world (arrivals on), 12000 ticks including a generated watch ask (a probe of this checkout, sampling every 200 ticks, recorded the first at tick 8600), then 120 more after a save and load. The same probe ran forest, birch, meadow, river, aspen and cedar to 72000 ticks and made no watch request: every nearby adult had already seen the child.'};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+'\n');console.log('Recorded immutable rules168 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules168 continuation changed');console.log('Rules168 continuation unchanged');
}
