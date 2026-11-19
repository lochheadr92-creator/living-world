import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const dir=process.argv[2]??'review_evidence/winter259';
const starts=[],table=[];
const metrics = r => ({
  returns:r.returns,switches:r.switches,withdrawals:r.finished.withdraw,deposits:r.finished.deposit,
  operations:r.finished.operate,deaths:r.deaths,hungryNoFood:100*r.hungryNoFood/r.awake,
  companyLeisure:100*(r.categories.social_contact+r.categories.leisure)/r.awake12,
  ...Object.fromEntries(Object.entries(r.categories).map(([k,v])=>[k,100*v/r.awake12]))
});
const binaryHashes=new Set();
for(const seed of ['aspen','gen-4','river'])for(const day of [48,96]){
  const id=seed+'-day'+day;
  const data=Object.fromEntries(['on','off','n1','n2'].map(arm=>{
    const r=JSON.parse(readFileSync(join(dir,id+'-'+arm+'.json'),'utf8'));
    if(r.startDay!==day||r.arm!==arm||r.end-r.start!==13*2400)throw Error('Wrong window '+id+arm);
    binaryHashes.add(r.executableHash);
    return [arm,r];
  }));
  if(new Set(Object.values(data).map(r=>r.initial+'|'+r.saveHash)).size!==1)throw Error('Different starting states '+id);
  const m=Object.fromEntries(Object.entries(data).map(([arm,r])=>[arm,metrics(r)]));
  const rows={};
  for(const key of Object.keys(m.on)){
    const delta=m.on[key]-m.off[key],noise=Math.max(Math.abs(m.n1[key]-m.on[key]),Math.abs(m.n2[key]-m.on[key]));
    rows[key]={on:m.on[key],off:m.off[key],delta,noise,outside:Math.abs(delta)>noise+1e-10};
  }
  const failed=Object.entries(data).flatMap(([arm,r])=>Object.entries(r.checks).filter(([,v])=>!v).map(([k])=>arm+':'+k));
  starts.push({id,rows,failed,distinctFinalHashes:new Set(Object.values(data).map(r=>r.endHash)).size});
}
if(binaryHashes.size!==1)throw Error('Mixed executables');
const mean={};
for(const key of Object.keys(starts[0].rows)){
  const rows=starts.map(s=>s.rows[key]);
  mean[key]=Object.fromEntries(['on','off','delta','noise'].map(k=>[k,rows.reduce((n,r)=>n+r[k],0)/rows.length]));
  mean[key].above=rows.filter(r=>r.outside&&r.delta>0).length;
  mean[key].below=rows.filter(r=>r.outside&&r.delta<0).length;
}
const f=x=>Number(x).toFixed(2);
const sections=['# Rules 259 through winter','',
  'Six starts, four arms each, 13 simulated days per arm. Means give each start equal weight. Differences are enabled minus disabled. Noise is the largest absolute difference from enabled to either nudged control in the same save. Raw ticks and denominators are in the per-arm JSON files.','',
  '| Start | Returns off → on | Walking off → on (% awake 12+) | Walking Δ / noise (pp) | Company + leisure Δ / noise (pp) | Deaths off → on | Hungry without food Δ / noise (pp) |',
  '|---|---:|---:|---:|---:|---:|---:|'];
for(const {id,rows:r} of starts){
  const pair=k=>f(r[k].delta)+' / '+f(r[k].noise);
  sections.push('| '+[id,r.returns.off+' → '+r.returns.on,f(r.travel.off)+' → '+f(r.travel.on),pair('travel'),pair('companyLeisure'),r.deaths.off+' → '+r.deaths.on,pair('hungryNoFood')].join(' | ')+' |');
}
sections.push('','## Where waking time went','','Shares of all waking ticks for people aged 12 or older. The category called sleep covers a sleep activity sampled while the pose is still awake.','',
 '| Activity | Off (%) | On (%) | Change (pp) | Starts above / below noise |','|---|---:|---:|---:|---:|');
for(const key of ['travel','work','social_contact','leisure','rest','waiting','eating_drinking_warming','failure_recovery','idle','defence','sleep']){
  const r=mean[key];sections.push('| '+[key,f(r.off),f(r.on),f(r.delta),r.above+' / '+r.below].join(' | ')+' |');
}
sections.push('','## Paired changes in the waking day','','Percentage points, enabled minus disabled. Waking person-tick totals can differ across arms. Blank causal attribution is intentional: the observer measures occupancy, not how individual minutes are reassigned.','');
const groups=['travel','work','social_contact','leisure','rest','waiting','eating_drinking_warming','failure_recovery','idle','defence','sleep'];
sections.push('| Start | '+groups.join(' | ')+' |','|---|'+groups.map(()=> '---:|').join(''));
for(const {id,rows} of starts) sections.push('| '+id+' | '+groups.map(k=>f(rows[k].delta)).join(' | ')+' |');
sections.push('','## Behaviour and survival','','Counts within each 13-day window. An asterisk means the adverse change was strictly greater than the corresponding nudge spread.','',
  '| Start | Store switches off → on | Withdrawals off → on | Deposits off → on | Operations off → on | Death Δ / noise | Hungry without food, off → on (%) |',
  '|---|---:|---:|---:|---:|---:|---:|');
for(const {id,rows:r} of starts) {
  const pair=k=>r[k].off+' → '+r[k].on;
  const flag=k=>r[k].outside && r[k].delta>0?' *':'';
  sections.push('| '+[id,...['switches','withdrawals','deposits','operations'].map(pair),
    r.deaths.delta+' / '+r.deaths.noise+flag('deaths'),
    f(r.hungryNoFood.off)+' → '+f(r.hungryNoFood.on)+flag('hungryNoFood')].join(' | ')+' |');
}
sections.push('','## Checks','',...starts.map(s=>s.id+' — '+(s.failed.join(', ')||'all checks passed')+'; '+s.distinctFinalHashes+' distinct end hashes.'),'');
writeFileSync(join(dir,'comparison.json'),JSON.stringify({starts,mean,executableHash:[...binaryHashes][0]},null,1));
writeFileSync(join(dir,'tables.md'),sections.join('\n'));

