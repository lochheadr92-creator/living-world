import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {v64Continuation} from '../tests/helpers/v64ref';
const path=new URL('../tests/v64_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==64||existsSync(path)))throw new Error('Record only before rules 65; never overwrite');
const actual=v64Continuation();
if(process.argv.includes('--write'))writeFileSync(path,JSON.stringify({source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()+', rules 64 before successor behaviour',...actual},null,2)+'\n');
else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));
 if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Rules 64 continuation changed');
 console.log('Rules 64 ordinary, care, competing tools and travelling source unchanged');
}
