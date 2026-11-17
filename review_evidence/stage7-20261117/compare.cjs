const fs=require('fs');
const seeds=['fern','meadow','birch','cedar'];
const L=(f)=>JSON.parse(fs.readFileSync(f));
const pick=(t,d)=>t.days.find(r=>r.day===d);
const yr=(t,d)=>t.years.find(r=>r.day===d);
const sumCauses=(t,a,b)=>{const c={};for(const r of t.days)if(r.day>a&&r.day<=b)for(const k in r.causes)c[k]=(c[k]||0)+r.causes[k];return c;};
const born=(t,a,b)=>t.days.filter(r=>r.day>a&&r.day<=b).reduce((n,r)=>n+r.born,0);
const came=(t,a,b)=>t.days.filter(r=>r.day>a&&r.day<=b).reduce((n,r)=>n+r.came,0);
const minAlive=(t,a,b)=>Math.min(...t.days.filter(r=>r.day>a&&r.day<=b).map(r=>r.alive));
const out=[];
for(const s of seeds){
  const o=L(`stage5/traces/${s}-on.json`),a=L(`stage7/${s}-d96-r252.json`),b=L(`stage7/${s}-d96-r253.json`);
  out.push(`== ${s} ==`);
  for(const d of [96,120,144,168,192]){
    const f=(t,n)=>{const r=pick(t,d),y=yr(t,d)||yr(t,Math.round(d/12)*12);return r?`${n}: alive ${r.alive} bld ${r.buildings} store ${r.store} wild ${r.wild}/${r.wildCap}`:`${n}: -`;};
    out.push(`day ${d}  ${f(o,'251')} | ${f(a,'252')} | ${f(b,'253')}`);
  }
  for(const d of [96,120,144,168,192]){const g=(t)=>{const y=yr(t,d);return y?`trees ${y.trees} wood ${y.wood} plots ${y.plots}`:'-'};out.push(`yr ${d}: 251 ${g(o)} | 252 ${g(a)} | 253 ${g(b)}`);}
  for(const [n,t] of [['251',o],['252',a],['253',b]]){
    out.push(`${n} 96-192: deaths ${JSON.stringify(sumCauses(t,96,192))} born ${born(t,96,192)} came ${came(t,96,192)} minAlive ${minAlive(t,96,192)}`);
  }
}
fs.writeFileSync('stage7/compare.txt',out.join('\n'));
console.log(out.join('\n'));
