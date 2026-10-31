import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {v94Continuation} from '../tests/helpers/v94ref';
const path=new URL('../tests/v94_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==94||existsSync(path)))throw new Error('Record only before rules 95; never overwrite');
const actual=v94Continuation();
if(process.argv.includes('--write'))writeFileSync(path,JSON.stringify({source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()+', rules 94 before successor behaviour',...actual},null,2)+'\n');
else{const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Rules 94 handover continuation changed');console.log('Rules 94 handover continuations unchanged');}
