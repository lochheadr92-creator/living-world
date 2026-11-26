import {readFileSync,readdirSync} from 'node:fs';
const read = path => JSON.parse(readFileSync(path,'utf8'));
const archive = read(process.argv[2]), dir='review_evidence/store-return';
const all = Object.values(archive).flat();
const count = test => all.filter(test).length;
console.log('Archived',all.length,'same building type',count(([a,b])=>a.type===b.type),
  'same goal throughout',count(c=>c.every(r=>r.goal===c[0].goal)),
  'same goods throughout',count(c=>c.every(r=>r.goods===c[0].goods)));
function displaced(e){
  const origin = e.atDeparture;
  if (!origin) return false;
  const [,oldStore,oldItem]=e.oldKey.split(':'), [,newStore,newItem]=e.newKey.split(':');
  const produced=(snapshot, item, goal, source, dest)=>snapshot.steps.some(row=>
    row[0]==='offer' && row[1]===item && row[2]===goal && row[3]===Number(dest) && row[4]===Number(source));
  return !e.actual.keys.includes(e.oldKey) && origin.keys.includes(e.oldKey) &&
    produced(e.actual,newItem,e.newGoal,newStore,oldStore) && produced(origin,oldItem,e.oldGoal,oldStore,newStore);
}
for(const id of Object.keys(archive)){
  const files=readdirSync(dir);
  const file=files.includes(id+'-2d.json')?id+'-2d.json':id+'.json';
  const run=read(dir+'/'+file);
  const byId=new Map(run.chains.map(c=>[[c.first.oldAct,c.first.newAct,c.second.newAct].join('|'),c]));
  const within=archive[id].filter(c=>c[2].tick<run.start+2400*(run.days??1));
  let both=0,one=0,exactReturn=0,absentStore=0;
  for (const c of within){
    const row=byId.get(c.map(s=>s.act).join('|'));
    if (!row) throw Error('Missing archived chain '+id+' '+c[0].act);
    for(const [i,e] of [row.first,row.second].entries()){
      if (e.person!==c[i].person || e.oldKey.split(':')[1]!==String(c[i].store) ||
          e.newKey.split(':')[1]!==String(c[i+1].store)) throw Error('Wrong replay identity');
    }
    const a=displaced(row.first), b=displaced(row.second);
    if(a&&b) both++;
    else if(a||b) one++;
    if(!a||!b) console.log('Inspect',id,row.first.person,row.first.tick,row.second.tick,a,b);
    if(row.first.oldKey===row.second.newKey)exactReturn++;
    if(!row.first.actual.keys.some(k=>k.split(':')[1]===String(c[0].store)))absentStore++;
  }
  console.log(id,{archived:archive[id].length,inWindow:within.length,replayed:run.chains.length,
    both,one,exactReturn,absentStore});
}
