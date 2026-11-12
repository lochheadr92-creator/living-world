import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {firstParting225,v225Continuation} from '../tests/helpers/v225ref';
import {lfHash,sourceManifest} from './observers/provenance';
// --find <seed> [maxTicks]: the first tick at which the rules-225 world parts from its rules-220 twin (how the pin's tick was chosen)
const find=process.argv.indexOf('--find');
if(find>=0){console.log(JSON.stringify({seed:process.argv[find+1],tick:firstParting225(process.argv[find+1],Number(process.argv[find+2]??36000))}));process.exit(0);}
const path=new URL('../tests/v225_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==225||existsSync(path)))throw Error('Record only on rules225; never overwrite');
const actual=v225Continuation();
if(process.argv.includes('--probe'))console.log(JSON.stringify(actual));
else if(process.argv.includes('--write')){
 const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.replaceAll('\\','/')).sort();
 const source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rules:225,content:lfHash(JSON.stringify(sourceManifest(files))),note:'Recorded before successor behavior, from a clean checkout; ordinary Normal world (arrivals on) stepped beside its rules-220 twin to the first tick at which the two differ in sites, buildings or living people (the lifted limits of growth_room.ts are the only difference), then 120 more after a save and load.'};
 writeFileSync(path,JSON.stringify({source,...actual},null,2)+'\n');console.log('Recorded immutable rules225 continuation');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Rules225 continuation changed');console.log('Rules225 continuation unchanged');
}
