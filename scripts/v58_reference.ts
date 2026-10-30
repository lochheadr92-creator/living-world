import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {v58Continuation} from '../tests/helpers/v58ref';
const path=new URL('../tests/v58_continuation.expected.json',import.meta.url),actual=v58Continuation();
if(process.argv.includes('--write')){
 if(Number(CURRENT_RULES_VERSION)!==58||existsSync(path))throw new Error('Record only at rules 58 before successor behaviour; never overwrite');
 writeFileSync(path,JSON.stringify({source:'main 7b2a680, seed storage and craft capacity, before rules 59',...actual},null,2)+'\n');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));
 if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Version 58 continuation changed');
 console.log('Version 58 ordinary and hammer crafting full serialized continuations unchanged');
}
