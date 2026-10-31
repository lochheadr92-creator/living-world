import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {v93Continuation} from '../tests/helpers/v93ref';
const path=new URL('../tests/v93_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==93||existsSync(path)))throw new Error('Record only before rules 94; never overwrite');
const actual=v93Continuation();
if(process.argv.includes('--write'))writeFileSync(path,JSON.stringify({source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()+', rules 93 before successor behaviour',...actual},null,2)+'\n');
else{const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Rules 93 estate continuation changed');console.log('Rules 93 estate continuations unchanged');}
