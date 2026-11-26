import {readFileSync,writeFileSync} from 'node:fs';
const dir='review_evidence/cora-food';
const d=JSON.parse(readFileSync(dir+'/gen-4.json','utf8'));
const units=items=>Object.values(items).reduce((a,b)=>a+b,0);
const day=t=>(t/2400).toFixed(3);
const fmt=items=>Object.entries(items).map(([k,n])=>n+' '+k).join(', ')||'empty';
const lines=['# Cora’s household food account'];
function table(title,head,rows){
  lines.push('','## '+title,'','| '+head.join(' | ')+' |','|'+head.map(()=> '---').join('|')+'|');
  for(const row of rows)lines.push('| '+row.join(' | ')+' |');
}
function actor(tag){
  const name=d.names[tag?.split(':')[1]];
  return name&&tag.startsWith('person:')?name:tag;
}
const home=d.samples[0].home;
if(d.samples.some(s=>s.home!==home))throw Error('Home changed; split the ledger by home');
const tag='building:'+home;
const accounts=new Map();
const residuals=[];
const flow=new Map();
for(const e of d.events){
  const sign=e.to===tag?1:e.from===tag||e.source===tag?-1:0;
  if(sign){
    const key=[sign>0?'in':'out',e.reason,actor(sign>0?e.from:e.to)??'store debit',e.item].join('|');
    accounts.set(key,(accounts.get(key)??0)+e.n);
    flow.set(e.tick,(flow.get(e.tick)??0)+sign*e.n);
  }
}
let last=units(d.samples[0].homeFood);
const balances=new Map(d.events.filter(e=>e.type==='home balance').map(e=>[e.tick,e.units]));
for(const tick of [...new Set([...flow.keys(),...balances.keys()])].sort((a,b)=>a-b)){
  const next=balances.get(tick)??last;
  if(next-last!==(flow.get(tick)??0))residuals.push([tick,next-last,flow.get(tick)??0]);
  last=next;
}
table('Hut movements, all 13 days',['Flow','Reason','Other end','Food','Units'],
  [...accounts].map(([key,n])=>[...key.split('|'),n]));
table('Cora’s checks and endpoint',['Tick','Day','People','Hut','Score','Household packs','Other household buildings','Granary shares (all bins)'],
  d.samples.map(s=>[s.tick,day(s.tick),s.memberCount,fmt(s.homeFood),s.recorded,s.packs.map(p=>d.names[p.id]+' '+fmt(p.items)).join(' / '),
    s.otherOwn.map(b=>b.type+' '+fmt(b.items)).join(' / '),s.granaries.reduce((n,b)=>n+units(b.share),0)]));
lines.push('','Hut balance reconciliation across all ticks: '+(residuals.length?JSON.stringify(residuals):'every net change accounted for')+'.',
  'Meal inputs, individual debits, per-person granary permissions, and transfers in chronological order are in gen-4.json.');
writeFileSync(dir+'/TABLES.md',lines.join('\n')+'\n');

