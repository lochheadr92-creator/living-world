import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v60Continuation } from '../tests/helpers/v60ref';
const path=new URL('../tests/v60_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==60||existsSync(path)))throw new Error('Record only before rules 61; never overwrite');
const actual=v60Continuation();
if(process.argv.includes('--write'))writeFileSync(path,JSON.stringify({source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()+', rules 60 before successor behaviour',...actual},null,2)+'\n');
else {
  const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));
  if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Rules 60 continuation changed');
  console.log('Rules 60 ordinary and required-tool-loss continuations unchanged');
}
