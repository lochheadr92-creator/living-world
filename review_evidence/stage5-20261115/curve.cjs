const fs=require('fs');
for(const s of process.argv.slice(2)){
  const j=JSON.parse(fs.readFileSync(s+'-on.json'));const d=j.days;
  console.log('== '+s+'  (rows every 6 days: day alive buildings households store wild hungry% winter | deaths in window by cause)');
  for(let i=95;i<240;i+=6){
    const r=d[i]; const lo=d[i].day-6; const c={};
    for(const x of j.deaths) if(x.day>lo&&x.day<=r.day) c[x.cause]=(c[x.cause]||0)+1;
    console.log(`${String(r.day).padStart(3)} ${String(r.alive).padStart(3)} b${String(r.buildings).padStart(3)} h${String(r.households).padStart(3)} store${String(r.store).padStart(5)} wild${String(r.wild).padStart(4)}/${r.wildCap} hung${(r.hungryShare*100).toFixed(0).padStart(3)} w${r.winter} ${r.hardship||''} | ${JSON.stringify(c)}`);
  }
}
