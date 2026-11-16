// Read-only: wild food standing (share of its capacity) on non-lean days, by settlement size, and lethality of lean seasons split by wild food a head.
const fs=require('fs');const dir='C:/dev/_claude_scratch/stage5/traces/';const bins={};const lean=[];
for(const f of fs.readdirSync(dir)){if(!f.endsWith('-on.json'))continue;const t=JSON.parse(fs.readFileSync(dir+f));const d=t.days;
 for(let i=0;i<d.length;i++){const x=d[i];if(x.alive<20)continue;const b=x.alive<60?'20-59':x.alive<100?'60-99':x.alive<140?'100-139':x.alive<180?'140-179':'180+';
  if(x.hardship!=='lean'&&x.hardship!=='dry'){(bins[b]=bins[b]||[]).push(x.wild/x.wildCap);}
  if(x.hardship==='lean'&&d[i-1]&&d[i-1].hardship!=='lean'&&x.alive>=100){const w10=d.slice(i,i+10);lean.push({seed:t.seed,day:x.day,people:x.alive,wildHead:x.wild/x.alive,perHead:x.store/x.alive,share:w10.reduce((n,y)=>n+y.died,0)/x.alive});}}}
console.log('wild food standing as a share of capacity, non-lean non-dry days, by people:');
for(const [b,a] of Object.entries(bins)){a.sort((p,q)=>p-q);console.log(b.padEnd(8),'n',String(a.length).padStart(5),'median',a[a.length>>1].toFixed(2),'10th pct',a[Math.floor(a.length*.1)].toFixed(2));}
const m=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN;
console.log('\nlean seasons at 100+ people, n='+lean.length+': deaths in 10 days as share of people, split');
for(const [name,fn] of [['wild a head < 0.15',r=>r.wildHead<0.15],['wild a head >= 0.15',r=>r.wildHead>=0.15],['store a head < 4',r=>r.perHead<4],['store a head >= 4',r=>r.perHead>=4]]){const s=lean.filter(fn);console.log(name.padEnd(22),'n',s.length,'mean share',(m(s.map(r=>r.share))*100).toFixed(1)+'%','worst',(Math.max(...s.map(r=>r.share))*100).toFixed(0)+'%');}
console.log('\n2x2: [wild<0.15?] x [store<4?]');
for(const w of [true,false])for(const sg of [true,false]){const s=lean.filter(r=>(r.wildHead<0.15)===w&&(r.perHead<4)===sg);console.log(`wildLow=${w} storeLow=${sg} n=${s.length} mean ${(m(s.map(r=>r.share))*100).toFixed(1)}%`);}
