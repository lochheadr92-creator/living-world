const fs=require('fs');
const root='C:/dev/_lw_daylength_20261117/results_15day/';
const seeds=['aspen','birch','meadow','river'];
const v=['baseline','double'];
const rows=Object.fromEntries(v.map(x=>[x,seeds.map(s=>JSON.parse(fs.readFileSync(root+x+'_'+s+'.json','utf8')))]));
const mean=a=>a.reduce((t,x)=>t+x,0)/a.length;
const f=n=>Number(n).toFixed(2);
const success=(r,kinds)=>Object.entries(r.activityEndings).reduce((sum,[name,count])=>sum+(name.endsWith(':success')&&kinds.includes(name.split(':')[0])?count:0),0);
const jobs=['gather','build','repair','haul','till','plant','harvest','tend','operate','craft','tool_work','gear_work','fetch_water','butcher','withdraw','deposit'];
const metrics={
  'travel % wake':r=>r.awakeCategoriesPercent.travel??0,
  'work % wake':r=>r.awakeCategoriesPercent.work??0,
  'leisure % wake':r=>r.awakeCategoriesPercent.leisure??0,
  'social % wake':r=>r.awakeCategoriesPercent.social_contact??0,
  'waiting % wake':r=>r.awakeCategoriesPercent.waiting??0,
  'night waiting % wake':r=>r.nightWaitWakingPercent??0,
  'blocked waiting % wake':r=>r.blockedWaitWakingPercent??0,
  'other waiting % wake':r=>r.otherWaitWakingPercent??0,
  'sleep % age12':r=>r.sleepShare,
  'comfort % wake':r=>r.comfortableWakingPercent,
  'fed+watered travel %':r=>r.comfortableCategoriesPercent.travel??0,
  'hungry % wake':r=>r.hungryWakingPercent,
  'thirsty % wake':r=>r.thirstyWakingPercent,
  'mean energy':r=>r.meanEnergy,
  'mean health':r=>r.meanHealth,
  'meals/person/day':r=>success(r,['eat','eat_store'])/(r.days*r.meanAlive),
  'drinks/person/day':r=>success(r,['drink'])/(r.days*r.meanAlive),
  'work completed/person/day':r=>success(r,jobs)/(r.days*r.meanAlive),
  'conversations/person/day':r=>success(r,['converse','socialize','visit','attend','host_meal','attend_meal'])/(r.days*r.meanAlive),
  'wander/person/day':r=>success(r,['wander','alone'])/(r.days*r.meanAlive),
  'work ticks/person/day':r=>r.dayTicks*(1-r.sleepShare/100)*(r.awakeCategoriesPercent.work??0)/100,
  'travel ticks/person/day':r=>r.dayTicks*(1-r.sleepShare/100)*(r.awakeCategoriesPercent.travel??0)/100,
  'leisure ticks/person/day':r=>r.dayTicks*(1-r.sleepShare/100)*(r.awakeCategoriesPercent.leisure??0)/100,
  'social ticks/person/day':r=>r.dayTicks*(1-r.sleepShare/100)*(r.awakeCategoriesPercent.social_contact??0)/100,
  'deaths/world':r=>r.deaths,
  'alive at end':r=>r.finalAlive,
};
const report=['15-day controlled pilot: same four seeds, source rules 255, arrivals off. One run/seed/arm; diagnostic not an ensemble.', 'metric | control mean | doubled mean | change | four paired changes'];
const summary={seeds,days:15,metrics:[]};
for(const [name,fn] of Object.entries(metrics)){
 const c=rows.baseline.map(fn),d=rows.double.map(fn),di=d.map((x,i)=>x-c[i]);
 const m={name,control:mean(c),double:mean(d),delta:mean(di),seedDelta:di,controlSeeds:c,doubleSeeds:d};
 summary.metrics.push(m);
 report.push(name+' | '+f(m.control)+' | '+f(m.double)+' | '+f(m.delta)+' | '+di.map(f).join(','));
}
report.push('');
for (let i=0;i<seeds.length;i++){
 const a=rows.baseline[i],b=rows.double[i];
 report.push(seeds[i]+' deaths '+a.deaths+'->'+b.deaths+', alive '+a.finalAlive+'->'+b.finalAlive+', waiting(daylight, blocked, other) '+[a.nightWaitWakingPercent,a.blockedWaitWakingPercent,a.otherWaitWakingPercent].map(f).join('/')+' -> '+[b.nightWaitWakingPercent,b.blockedWaitWakingPercent,b.otherWaitWakingPercent].map(f).join('/'));
}
fs.writeFileSync(root+'comparison.txt',report.join('\n'));
fs.writeFileSync(root+'comparison.json',JSON.stringify(summary,null,2));
console.log(report.join('\n'));
