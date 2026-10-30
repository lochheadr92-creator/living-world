import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {v87Continuation} from '../tests/helpers/v87ref';
const path=new URL('../tests/v87_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==87||existsSync(path)))throw new Error('Record only before rules 88; never overwrite');
const actual=v87Continuation();
if(process.argv.includes('--write'))writeFileSync(path,JSON.stringify({source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()+', rules 87 before successor behaviour',...actual},null,2)+'\n');
else{const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Rules 87 continuation changed');console.log('Rules 87 physical water draws, changed access and recovery continuations unchanged');}
