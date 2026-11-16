const fs=require('fs');
const seeds=['aspen','birch','cedar','fern','gen-1','gen-2','gen-3','gen-4','gen-5','gen-6','meadow','river'];
for(const s of seeds){
  const j=JSON.parse(fs.readFileSync(s+'-on.json'));
  const d=j.days; let peak=d[0]; for(const r of d) if(r.alive>peak.alive) peak=r;
  const at=(n)=>d[n-1]?.alive;
  // collapse: first day alive <= 0.5*peak after peak
  let col=d.find(r=>r.day>peak.day && r.alive<=peak.alive/2);
  let last=d[d.length-1];
  const causes={}; for(const x of j.deaths){ if(x.day>(peak.day)) causes[x.cause]=(causes[x.cause]||0)+1; }
  const allc={}; for(const x of j.deaths) allc[x.cause]=(allc[x.cause]||0)+1;
  let came=0,born=0,died=0; for(const r of d){came+=r.came;born+=r.born;died+=r.died;}
  console.log(`${s.padEnd(7)} d60 ${at(60)} d120 ${at(120)} d180 ${at(180)} d240 ${last.alive} | peak ${peak.alive}@${peak.day} half@${col?col.day:'-'} | came ${came} born ${born} died ${died} | after-peak ${JSON.stringify(causes)}`);
}
