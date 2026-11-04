import {readFileSync,writeFileSync} from 'node:fs';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
const out=[];
for(const seed of ['forest','river']){
 const text=readFileSync(`survival_evidence/hearth-check2/ordinary/production-${seed}/final.json`,'utf8');
 const w=deserializeWorld(text);if(serializeWorld(w)!==text)throw Error(seed+' current validation changed saved state');
 const twin=deserializeWorld(text);for(let n=0;n<120;n++){stepWorld(w);stepWorld(twin);}
 if(serializeWorld(w)!==serializeWorld(twin)||!conservationReport(w).ok)throw Error(seed+' continued differently');
 out.push({seed,exactCurrentValidation:true,continuedTicks:120,conserved:true});
}
writeFileSync('survival_evidence/hearth-check2/current-validation.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out));
