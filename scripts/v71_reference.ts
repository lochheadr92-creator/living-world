import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {v71Continuation} from '../tests/helpers/v71ref';
const path=new URL('../tests/v71_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==71||existsSync(path)))throw new Error('Record only before rules 72; never overwrite');
const actual=v71Continuation();
if(process.argv.includes('--write'))writeFileSync(path,JSON.stringify({source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()+', rules 71 before successor behaviour',...actual},null,2)+'\n');
else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));
 if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Rules 71 continuation changed');
 console.log('Rules 71 ordinary, material trip, retained work, resumption and depletion unchanged');
}
