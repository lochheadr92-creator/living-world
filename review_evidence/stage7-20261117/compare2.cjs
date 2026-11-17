const fs=require('fs');
const L=f=>JSON.parse(fs.readFileSync(f));
const out=[];
const tot={};
for(const s of ['fern','meadow','birch','cedar']){
  const T={'251':L(`../stage5/traces/${s}-on.json`)};
  for(const v of [252,253,254,255])T[v]=L(`${s}-d96-r${v}.json`);
  out.push(`== ${s} ==  (done: ${[254,255].map(v=>T[v].done+'/'+T[v].daysRun).join(' ')})`);
  for(const d of [120,144,168,192]){
    out.push(`day ${d}: `+['251',252,253,254,255].map(v=>{const r=T[v].days.find(x=>x.day===d);return `${v}: ${r.alive}p ${r.buildings}b st${r.store} w${r.wild}`}).join(' | '));
  }
  for(const v of ['251',252,253,254,255]){
    const t=T[v];const c={};let n=0;for(const r of t.days)if(r.day>96&&r.day<=192){n+=r.died;for(const k in r.causes)c[k]=(c[k]||0)+r.causes[k]}
    const big=t.days.filter(r=>r.day>96&&r.day<=192&&r.died>=5).map(r=>r.day+':'+r.died).join(' ');
    const y=t.years.find(r=>r.day===192);
    out.push(`${v}: deaths ${n} ${JSON.stringify(c)} bigdays[${big}] min alive ${Math.min(...t.days.filter(r=>r.day>96&&r.day<=192).map(r=>r.alive))} trees192 ${y?y.trees:'-'} plots ${y?y.plots:'-'}`);
    (tot[v]=tot[v]||{n:0,a:0,b:0}).n+=n;tot[v].a+=t.days.find(r=>r.day===192).alive;tot[v].b+=t.days.find(r=>r.day===192).buildings;
  }
}
out.push('TOTALS (deaths 96-192, alive192, buildings192): '+JSON.stringify(tot));
fs.writeFileSync('compare2.txt',out.join('\n'));console.log(out.join('\n'));
