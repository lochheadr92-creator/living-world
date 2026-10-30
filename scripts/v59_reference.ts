import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {v59Continuation} from '../tests/helpers/v59ref';
const path=new URL('../tests/v59_continuation.expected.json',import.meta.url),actual=v59Continuation();
if(process.argv.includes('--write')){
 if(Number(CURRENT_RULES_VERSION)!==59||existsSync(path))throw new Error('Record only at rules 59 before successor behaviour; never overwrite');
 writeFileSync(path,JSON.stringify({source:'main 78f01c9, required tool precedence, before rules 60',...actual},null,2)+'\n');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));
 if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Version 59 continuation changed');
 console.log('Version 59 ordinary and hammer crafting full serialized continuations unchanged');
}
