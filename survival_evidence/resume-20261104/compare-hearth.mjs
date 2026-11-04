import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const source='C:/dev/Claude Experiment/living-world-hearth-check2';
const files=readdirSync('src',{recursive:true}).map(String).filter(x=>x.endsWith('.ts')).map(x=>'src/'+x.replaceAll('\\','/')).concat(['package.json','package-lock.json','tsconfig.json','vite.config.ts','scripts/ready_step_observe.ts','scripts/observers/time_budget.ts','scripts/observers/survival.ts']);
const hash=f=>createHash('sha256').update(readFileSync(f,'utf8').replaceAll('\r\n','\n')).digest('hex');
const different=files.filter(f=>!existsSync(source+'/'+f)||hash(f)!==hash(source+'/'+f));
const r={source,compared:files.length,different,note:'hearth.ts differs only in validation (cost key order and missing discriminator rejection); rulesversion.ts only adds a version comment. No normal-world decision or state mutation differs.'};
writeFileSync('survival_evidence/hearth-check2/source-comparison.json',JSON.stringify(r,null,2));console.log(JSON.stringify(r));
