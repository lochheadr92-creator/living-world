import {readFileSync,writeFileSync} from 'node:fs';
const dir='review_evidence/linden-1091';
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const save=read('C:/dev/lw_saves/rules256/aspen-day96.save.json').world;
const initialBuildings=new Map(save.buildings.map(b=>[b.id,b.type]));
const arms={};
for(const arm of ['off','on','only','except']){
 const {events,stats,members,endHash}=read(dir+'/'+arm+'.json');
 const residents={}, homeByDay={},competing=[],short=new Set();
 const label=tag=>members[+tag.split(':')[1]]??(tag.startsWith('building:')?(initialBuildings.get(+tag.slice(9))??tag):tag.split(':')[0]);
 for(const [id,name] of Object.entries(members)){
   const count=k=>stats[id+'|'+k]??0;
   residents[name]={awake:count('awake'),short:count('short'),childAwake:count('childAwake'),childShort:count('childShort'),mealTimes:[],homeUnits:0,homeAttempts:0,homeEnds:{},gathered:{},deposits:{},foodsIn:{},foodsOut:{},starts:{},restorations:0};
 }
 const inc=(m,k,n=1)=>{m[k]=(m[k]??0)+n;};
 for(const [tick,kind,...v] of events){
   const [id,a,b,c,d,e,f]=v;
   const actor=residents[members[id]];
   if(kind==='short')short.add(id);
   if(kind==='clear')short.delete(id);
   if(kind==='meal' && a<12)actor.mealTimes.push(tick);
   if(kind==='review'){
     actor.restorations++;
     competing.push({tick,person:members[id],alternative:c,goal:d,tag:e,careKeys:f,alsoOriginal:v[7],childrenShort:[...short].filter(i=>stats[i+'|childAwake']).map(i=>members[i])});
   }
   if(kind==='start'){inc(actor.starts,b);if(b==='deposit'&&d==='deposit:'+e+':food'&&e===116327)actor.homeAttempts++;}
   if(kind==='end'&&b==='deposit'&&f===116327&&c==='to feed the household')inc(actor.homeEnds,d+'|'+e);
   if(kind!=='food')continue;
   const [from,to,reason,item,n,home]=v;
   const src=from.startsWith('person:')?residents[members[+from.slice(7)]]:undefined;
   const dst=to.startsWith('person:')?residents[members[+to.slice(7)]]:undefined;
   if(src){inc(src.foodsOut,[reason,label(to),item].join('|'),n);if(reason==='deposit')inc(src.deposits,label(to),n);}
   if(dst){inc(dst.foodsIn,[reason,label(from),item].join('|'),n);if(reason==='gather')inc(dst.gathered,item,n);}
   if(to==='building:'+home&&reason==='deposit'){if(src)src.homeUnits+=n;inc(homeByDay,Math.floor(tick/2400),n);}
 }
 for(const r of Object.values(residents)){
   const intervals=r.mealTimes.slice(1).map((t,i)=>t-r.mealTimes[i]).sort((a,b)=>a-b);
   r.mealGaps={count:r.mealTimes.length,longest:intervals.at(-1),median:intervals.length?intervals[Math.floor(intervals.length/2)]:null};
 }
 arms[arm]={endHash,homeByDay,residents,competing};
}
writeFileSync(dir+'/summary.json',JSON.stringify(arms,null,1));

