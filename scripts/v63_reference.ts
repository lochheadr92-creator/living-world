import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {v63Continuation} from '../tests/helpers/v63ref';
const path=new URL('../tests/v63_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==63||existsSync(path)))throw new Error('Record only before rules 64; never overwrite');
const actual=v63Continuation();
if(process.argv.includes('--write'))writeFileSync(path,JSON.stringify({source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()+', rules 63 before successor behaviour',...actual},null,2)+'\n');
else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));
 if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Rules 63 continuation changed');
 console.log('Rules 63 ordinary, food-capacity recovery and competing-tool continuations unchanged');
}
