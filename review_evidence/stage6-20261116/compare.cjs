// Stage 6: wood counterfactual. Compares control (from save) vs wood-refilled arm, and control vs original trace.
const fs=require('fs');const L=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const sets=[['fern',144,'C:/dev/_claude_scratch/stage5/traces/fern-on.json'],['meadow',156,'C:/dev/_claude_scratch/stage5/traces/meadow-on.json']];
for(const [w,d0,orig] of sets){
  const c=L(`${w}-d${d0}-ctl.json`),r=L(`${w}-d${d0}-wood.json`),o=L(orig);
  const od=new Map(o.days.map(x=>[x.day,x])), cd=new Map(c.days.map(x=>[x.day,x]));
  // determinism: control vs original on shared days
  let same=0,diff=0,first=null;
  for(const x of c.days){const y=od.get(x.day);if(!y)continue;if(x.alive===y.alive&&x.store===y.store&&x.buildings===y.buildings&&x.died===y.died)same++;else{diff++;if(first===null)first=x.day;}}
  console.log(`\n=== ${w} from day ${d0}: control vs original trace: ${same} days equal, ${diff} differ${first?` (first ${first})`:''}`);
  const sum=(rows,k)=>rows.reduce((n,x)=>n+(x[k]||0),0);
  const causes=rows=>{const o={};for(const x of rows)for(const [k,v] of Object.entries(x.causes||{}))o[k]=(o[k]||0)+v;return o;};
  console.log('arm      end alive  min alive  deaths  buildings(end) peakCrit  causes');
  for(const [n,a] of [['control',c],['wood',r]]){
    const d=a.days;const last=d[d.length-1];
    console.log(n.padEnd(8),String(last.alive).padStart(9),String(Math.min(...d.map(x=>x.alive))).padStart(10),String(sum(d,'died')).padStart(7),String(last.buildings).padStart(10),String(Math.max(...d.map(x=>x.crit))).padStart(9),' ',JSON.stringify(causes(d)));
  }
  console.log('day  | ctl alive/store/bldg/died | wood alive/store/bldg/died');
  const rd=new Map(r.days.map(x=>[x.day,x]));
  for(const x of c.days){ if((x.day-d0)%6!==0)continue; const y=rd.get(x.day); console.log(String(x.day).padStart(4),'|',[x.alive,x.store,x.buildings,x.died].join('/').padEnd(22),'|',y?[y.alive,y.store,y.buildings,y.died].join('/'):'-'); }
  console.log('trees by year row: ctl',c.years.map(y=>`${y.day}:${y.trees}`).join(' '),'| wood',r.years.map(y=>`${y.day}:${y.trees}`).join(' '));
  const hb=y=>Object.values(y.buildings||{}).reduce((a,b)=>a+b,0);
  console.log('buildings (year rows): ctl',c.years.map(y=>`${y.day}:${hb(y)}`).join(' '),'| wood',r.years.map(y=>`${y.day}:${hb(y)}`).join(' '));
}
