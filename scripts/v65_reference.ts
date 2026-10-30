import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {v65Continuation} from '../tests/helpers/v65ref';
const path=new URL('../tests/v65_continuation.expected.json',import.meta.url);
if(process.argv.includes('--write')&&(Number(CURRENT_RULES_VERSION)!==65||existsSync(path)))throw new Error('Record only before rules 66; never overwrite');
const actual=v65Continuation();
if(process.argv.includes('--write'))writeFileSync(path,JSON.stringify({source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()+', rules 65 before successor behaviour',...actual},null,2)+'\n');
else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));
 if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Rules 65 continuation changed');
 console.log('Rules 65 ordinary, source, stock, water and outside-resident continuations unchanged');
}
