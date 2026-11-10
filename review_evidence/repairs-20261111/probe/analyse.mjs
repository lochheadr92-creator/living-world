import {readFileSync,readdirSync} from 'node:fs';
const dir=process.argv[2];
const rows=[];
for(const f of readdirSync(dir).filter(f=>f.startsWith('diag_')&&f.endsWith('.json'))){
 const d=JSON.parse(readFileSync(dir+'/'+f,'utf8'));
 for(const x of d.deathList){const b=x.before;rows.push({seed:d.seed,...x,before:undefined,b});}
}
const by=(k)=>rows.reduce((m,r)=>{m[r[k]]=(m[r[k]]??0)+1;return m;},{});
console.log('deaths',rows.length,by('cause'));
for(const cause of ['exposure','hunger','thirst']){
 console.log('\n=== '+cause);
 for(const r of rows.filter(r=>r.cause===cause)){
  const b=r.b;if(!b){console.log(r.seed,r.name,'no snapshot');continue;}
  const ownHome=b.shelters.filter(s=>s.hh===b.hh&&['hut','house','lean_to'].includes(s.btype));
  const n=b.needs;
  console.log(`${r.seed} d${r.day} ${r.name}(${b.stage},${r.age}) hh${b.hh}/${b.hhMembers} home=${b.homeType??'none'}@${b.homeDist} in${b.homeInside}/${b.homeCap} food${b.homeFood} indoors=${!!b.indoors} H${n.hunger.toFixed(0)} T${n.thirst.toFixed(0)} W${n.warmth.toFixed(0)} E${n.energy.toFixed(0)} hp${b.health} invFood=${b.invFood} inv=${JSON.stringify(b.inv)} wx=${b.weather.kind}/${b.weather.temp} ill=${b.ill?.kind??''} inj=${b.injury??''}`);
  console.log(`   act=${b.activity?b.activity.kind+':'+b.activity.label+' ['+b.activity.phase+(b.activity.blocked?' BLOCKED '+b.activity.blocked:'')+']':'none'} | because=${b.because}`);
  if(cause==='exposure')console.log(`   ownHome=${JSON.stringify(ownHome.slice(0,2))} nearest=${JSON.stringify(b.shelters.slice(0,2))}`);
  if(cause==='hunger'){console.log(`   food beliefs=${JSON.stringify(b.foodBeliefs.slice(0,4))}`);console.log(`   stores=${JSON.stringify(b.storesWithFood.slice(0,3))} commitments=${JSON.stringify(b.commitments)}`);console.log(`   blocked=${JSON.stringify(b.blockedOpts.slice(0,5))}`);}
  console.log(`   log=${JSON.stringify(b.log.slice(-3))}`);
 }
}
