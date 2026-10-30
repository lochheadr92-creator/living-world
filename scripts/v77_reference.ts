import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {v77Continuation} from '../tests/helpers/v77ref';
const path=new URL('../tests/v77_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==77||existsSync(path)))throw new Error('Record only before rules 78; never overwrite');
const actual=await v77Continuation();
if(process.argv.includes('--write'))writeFileSync(path,JSON.stringify({source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()+', rules 77 before successor behaviour',...actual},null,2)+'\n');
else{const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Rules 77 continuation changed');console.log('Rules 77 ordinary, corrected route and physical helper-receipt continuations unchanged');}
