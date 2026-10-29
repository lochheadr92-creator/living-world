import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {v56Continuation} from '../tests/helpers/v56ref';
const path=new URL('../tests/v56_continuation.expected.json',import.meta.url),actual=v56Continuation();
if(process.argv.includes('--write')){
 if(Number(CURRENT_RULES_VERSION)!==56||existsSync(path))throw new Error('Record only at rules 56 before successor behaviour; never overwrite');
 writeFileSync(path,JSON.stringify({source:'codex/viewer-programme 9beba7c, practical childcare 4f68699, before rules 57',...actual},null,2)+'\n');
}else{
 const {source,...expected}=JSON.parse(readFileSync(path,'utf8'));
 if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Version 56 continuation changed');
 console.log('Version 56 ordinary and childcare full serialized continuations unchanged');
}
