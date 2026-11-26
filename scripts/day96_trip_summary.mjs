import {readFileSync,writeFileSync} from 'node:fs';
const dir='review_evidence/day96-trace';
const lines=['# Day-96 trip and food trace','','All differences below are enabled minus disabled. Walking uses waking time at ages 12+. Hunger uses waking time at all ages. Each run reproduced its original world hash and exact walking, hunger and waking tick totals.',''];
for(const seed of ['aspen','gen-4','river']){
 const read=arm=>JSON.parse(readFileSync(dir+'/'+seed+'-day96-'+arm+'.json','utf8'));
 const on=read('on'),off=read('off');
 // Only enabled errands carry a recipe tag. Combine that field before comparing arms.
 for(const run of [on,off]){
   const grouped={};
   for(const [key,ticks] of Object.entries(run.purpose)){
     const [kind,site,,items]=key.split('|');
     const comparable=[kind,site,items].join('|');
     grouped[comparable]=(grouped[comparable]??0)+ticks;
   }
   run.purpose=grouped;
 }
 lines.push('## '+seed,'');
 function rows(group,denom){
   return [...new Set([...Object.keys(off[group]),...Object.keys(on[group])])].map(k=>{
     const a=off[group][k]??0,b=on[group][k]??0;
     const d=denom?100*(b/on[denom]-a/off[denom]):b-a;
     return {k,a,b,d};
   }).sort((x,y)=>Math.abs(y.d)-Math.abs(x.d));
 }
 function table(title,data,denom){
   lines.push('### '+title,'','| Measure | Off | On | Change ('+(denom?'percentage points':'count')+') |','|---|---:|---:|---:|');
   for(const {k,a,b,d} of data) lines.push('| '+[k.replaceAll('|',' / '),a,b,d.toFixed(denom?3:0)].join(' | ')+' |');
   lines.push('');
 }
 table('Walking ticks by activity',rows('walking','awake12'),'awake12');
 table('Walking ticks by destination and load, largest absolute changes',rows('purpose','awake12').slice(0,16),'awake12');
 table('Walking spells by activity',rows('legs').slice(0,12));
 if(seed!=='aspen')continue;
 for(const [g,title] of [['states','Hunger and food availability'],['byDay','Contribution of each day to hungry time'],['byAge','Contribution of each age band'],['hungerJob','Activities during hungry time'],['byHouse','Household contributions to hungry time']]){
   table(title,rows(g,'awake').filter(r=>g!=='byHouse'||r.k.endsWith('|short')).slice(0,16),'awake');
 }
 table('Edible units transferred, largest changes',rows('foodFlow').slice(0,25));
 table('Meal and gather activity endings',rows('meals').slice(0,24));
}
writeFileSync(dir+'/tables.md',lines.join('\n'));


