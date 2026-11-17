const fs = require('fs');
const path = 'C:/dev/_lw_daylength_20261117/results/';
const seeds = ['aspen','birch','meadow','river'];
const variants = ['baseline','double'];
const rows = {};
for (const v of variants) {
  rows[v] = seeds.map(seed => JSON.parse(fs.readFileSync(path+v+'_'+seed+'.json','utf8')));
}
const success = (r, kinds) => Object.entries(r.activityEndings).reduce((sum,[k,v]) => sum + (k.endsWith(':success') && kinds.includes(k.split(':')[0]) ? v : 0),0);
const workKinds = ['gather','build','repair','haul','till','plant','harvest','tend','operate','craft','tool_work','gear_work','fetch_water','butcher','withdraw','deposit'];
const metric = {
 'Travel (% waking)': r=>r.awakeCategoriesPercent.travel??0,
 'Work (% waking)': r=>r.awakeCategoriesPercent.work??0,
 'Leisure (% waking)': r=>r.awakeCategoriesPercent.leisure??0,
 'Social (% waking)': r=>r.awakeCategoriesPercent.social_contact??0,
 'Waiting (% waking)': r=>r.awakeCategoriesPercent.waiting??0,
 'Sleep (% age12 time)': r=>r.sleepShare,
 'Travel (% fed+watered)': r=>r.comfortableCategoriesPercent.travel??0,
 'Comfortable (% waking)': r=>r.comfortableWakingPercent,
 'Hunger below 62 (% waking)':r=>r.hungryWakingPercent,
 'Thirst below 66 (% waking)':r=>r.thirstyWakingPercent,
 'Mean hunger (0-100)':r=>r.meanHunger,
 'Mean thirst (0-100)':r=>r.meanThirst,
 'Mean energy (0-100)':r=>r.meanEnergy,
 'Mean health (0-100)':r=>r.meanHealth,
 'Meals per person/day':r=>success(r,['eat','eat_store'])/(r.days*r.meanAlive),
 'Drinks per person/day':r=>success(r,['drink'])/(r.days*r.meanAlive),
 'Work tasks completed/person/day':r=>success(r,workKinds)/(r.days*r.meanAlive),
 'Waking work ticks/person/day':r=>r.dayTicks*(1-r.sleepShare/100)*((r.awakeCategoriesPercent.work??0)/100),
 'Waking travel ticks/person/day':r=>r.dayTicks*(1-r.sleepShare/100)*((r.awakeCategoriesPercent.travel??0)/100),
 'Deaths per world':r=>r.deaths,
 'Alive end':r=>r.finalAlive,
};
const mean = arr=>arr.reduce((s,v)=>s+v,0)/arr.length;
const fmt=n=>Number(n).toFixed(2);
const report=[];
report.push('Isolated day-length pilot; 4 matched seeds, 4 days each, arrivals OFF, normal profile, source baa9257d rules 255.');
report.push('BASE=DAY 2400; DOUBLE=DAY 4800, biologic needs/health, spoilage, illness and building decay scaled per tick; movement and work durations unchanged.');
report.push('Seed-level differences (double - control) and averages. Four seeds are exploratory, not a statistical ensemble.');
report.push('');
report.push('Metric | 2400 mean | 4800 mean | delta | seed deltas [aspen,birch,meadow,river]');
const table=[];
for(const [name, get] of Object.entries(metric)) {
 const bs=rows.baseline.map(get),ds=rows.double.map(get),deltas=ds.map((v,i)=>v-bs[i]);
 const m={metric:name,control:mean(bs),double:mean(ds),delta:mean(deltas),seeds:deltas,baselineBySeed:bs,doubleBySeed:ds};
 table.push(m);
 report.push(name+' | '+fmt(m.control)+' | '+fmt(m.double)+' | '+fmt(m.delta)+' | '+m.seeds.map(fmt).join(', '));
}
report.push('');
for(let i=0;i<seeds.length;i++){
 let b=rows.baseline[i],d=rows.double[i];
 report.push(seeds[i]+': 2400 awake='+JSON.stringify(b.awakeCategoriesPercent)+'; 4800 awake='+JSON.stringify(d.awakeCategoriesPercent));
}
fs.writeFileSync(path+'comparison.txt',report.join('\n'));
fs.writeFileSync(path+'comparison.json',JSON.stringify({seeds,days:4,table},null,2));
console.log(report.join('\n'));
