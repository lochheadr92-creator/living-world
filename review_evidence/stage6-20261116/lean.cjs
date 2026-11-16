// Read-only: every lean season in the twelve stage-5 traces (and the two stage-6 control arms are already inside them).
// For each: people, food in store and a head at its start, days until the store is under 10% of that, wild food at start and two days on,
// critical-need people at peak, and deaths in the 10 days after the start (any cause) and by hunger.
const fs=require('fs');const dir='C:/dev/_claude_scratch/stage5/traces/';
const rows=[];
for(const f of fs.readdirSync(dir)){ if(!f.endsWith('-on.json'))continue; const t=JSON.parse(fs.readFileSync(dir+f)); const seed=t.seed; const d=t.days;
  for(let i=1;i<d.length;i++){ if(d[i].hardship==='lean'&&d[i-1].hardship!=='lean'){
    let j=i;while(j<d.length&&d[j].hardship==='lean')j++;
    const s=d[i];const lenDays=j-i;
    let empty=null;for(let k=i;k<Math.min(d.length,i+14);k++){ if(d[k].store<=0.1*s.store){empty=k-i;break;} }
    const w10=d.slice(i,i+10);const sum=(a,fn)=>a.reduce((n,x)=>n+fn(x),0);
    rows.push({seed,day:s.day,lean:lenDays,people:s.alive,store:s.store,perHead:+(s.store/s.alive).toFixed(2),wild0:s.wild,wild2:(d[i+2]||s).wild,wildCap:s.wildCap,emptyIn:empty,critPeak:Math.max(...d.slice(i,j+1).map(x=>x.crit)),deaths10:sum(w10,x=>x.died),hunger10:sum(w10,x=>x.causes.hunger||0),exposure10:sum(w10,x=>x.causes.exposure||0)});
  }}}
rows.sort((a,b)=>a.people-b.people);
console.log('seed   day lean people store perHead wild0->wild2 (cap)  storeEmptyIn critPeak deaths10 hunger exposure');
for(const r of rows)console.log(r.seed.padEnd(7),String(r.day).padStart(3),String(r.lean).padStart(3),String(r.people).padStart(6),String(r.store).padStart(6),String(r.perHead).padStart(7),`${r.wild0}->${r.wild2} (${r.wildCap})`.padEnd(18),String(r.emptyIn).padStart(8),String(r.critPeak).padStart(8),String(r.deaths10).padStart(8),String(r.hunger10).padStart(6),String(r.exposure10).padStart(8));
const bin=(lo,hi)=>rows.filter(r=>r.people>=lo&&r.people<hi);
console.log('\nby size: n, mean store/head at start, share with store empty within 14 days, mean deaths in 10 days, mean death share of people');
for(const [lo,hi] of [[0,60],[60,100],[100,140],[140,180],[180,999]]){const b=bin(lo,hi);if(!b.length)continue;const m=a=>a.reduce((x,y)=>x+y,0)/a.length;console.log(`${lo}-${hi}: n=${b.length} store/head ${m(b.map(r=>r.perHead)).toFixed(2)} emptied ${(b.filter(r=>r.emptyIn!==null).length/b.length*100).toFixed(0)}% deaths10 ${m(b.map(r=>r.deaths10)).toFixed(1)} share ${(m(b.map(r=>r.deaths10/r.people))*100).toFixed(0)}%`);}
