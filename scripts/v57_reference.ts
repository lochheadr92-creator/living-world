import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {v57Continuation} from '../tests/helpers/v57ref';
const path=new URL('../tests/v57_continuation.expected.json',import.meta.url),actual=v57Continuation();
if(process.argv.includes('--write')){
 if(Number(CURRENT_RULES_VERSION)!==57||existsSync(path))throw new Error('Record only at rules 57 before successor behaviour; never overwrite');
 writeFileSync(path,JSON.stringify({source:'codex/viewer-programme d5eeadd, workshop tool prerequisite, before rules 58',...actual},null,2)+'\n');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));
 if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Version 57 continuation changed');
 console.log('Version 57 ordinary and hammer crafting full serialized continuations unchanged');
}
