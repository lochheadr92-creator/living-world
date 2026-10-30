import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {v62Continuation} from '../tests/helpers/v62ref';
const path=new URL('../tests/v62_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==62||existsSync(path)))throw new Error('Record only before rules 63; never overwrite');
const actual=v62Continuation();
if(process.argv.includes('--write'))writeFileSync(path,JSON.stringify({source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()+', rules 62 before successor behaviour',...actual},null,2)+'\n');
else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));
 if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Rules 62 continuation changed');
 console.log('Rules 62 ordinary, indoor hand-over and full-pack continuations unchanged');
}
