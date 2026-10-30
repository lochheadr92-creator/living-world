import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {v86Continuation} from '../tests/helpers/v86ref';
const path=new URL('../tests/v86_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==86||existsSync(path)))throw new Error('Record only before rules 87; never overwrite');
const actual=v86Continuation();
if(process.argv.includes('--write'))writeFileSync(path,JSON.stringify({source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()+', rules 86 before successor behaviour',...actual},null,2)+'\n');
else{const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Rules 86 continuation changed');console.log('Rules 86 ordinary ecology, sowing, partial rest work and recovery continuations unchanged');}
