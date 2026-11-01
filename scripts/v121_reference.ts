import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {v121Continuation} from '../tests/helpers/v121ref';
// Recorded on the integration of Pavel/Talia after Stage 3, while current is 121: the 119-121 behaviour is already final and gated.
const path=new URL('../tests/v121_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==121||existsSync(path)))throw new Error('Record only at the rules-121 integration; never overwrite');
const actual=v121Continuation();
if(process.argv.includes('--write'))writeFileSync(path,JSON.stringify({source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()+', rules 121 recorded at the Pavel/Talia integration after Stage 3',...actual},null,2)+'\n');
else{const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Rules 121 continuation changed');console.log('Rules 121 continuation unchanged');}