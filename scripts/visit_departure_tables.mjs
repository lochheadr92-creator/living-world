import {readFileSync,writeFileSync} from 'node:fs';
const dir='review_evidence/visit-departure';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const lines=['# Where failed visits went','',
'Rules 259, arrivals on, day 96 to 97. One replay per settlement. Each row is one launch. Distances are in tiles. The first distance is from the actual target to the chosen destination at launch. The last distance is between the two people at failure. Space 0 means outdoors; a positive number identifies an interior. Age is ticks since the whereabouts record, shown only when it supplied the destination. A remembered home is an inference about where someone might be.','',
'| World and tick | Visitor → target | Destination evidence | Age | Distance at launch → at failure | Visitor space at launch → end | Target space at launch → end | Walk ticks | Finding |',
'|---|---|---|---:|---|---|---|---:|---|'];
const counts={},sources={},cross={};
for(const seed of ['aspen','gen-4','river']){
 const d=read(dir+'/'+seed+'.json'),ref=read('review_evidence/social-reach/'+seed+'.json');
 const reasons={};
 for(const r of d.rows){
  if(r.result!=='failed')continue;
  const key='visit|failed|'+r.detail;
  reasons[key]=(reasons[key]??0)+1;
  if(!/different space|where I expected/.test(r.detail))continue;
  const spot={x:r.spot[0],y:r.spot[1]};
  if(!r.loc||distance(spot,r.loc)>0.001)throw Error('Destination evidence differs');
  const early=distance(r.target,spot),late=distance(r.endTarget,r.endVisitor),indoor=r.detail.includes('space');
  const finding=indoor?(r.visitor.space!==r.target.space?'Different spaces at launch':'Spaces diverged after launch'):(early>5?'Already outside destination radius':'Left contact range during approach');
  counts[finding]=(counts[finding]??0)+1;
  sources[r.loc.how]=(sources[r.loc.how]??0)+1;
  const k=[finding,r.loc.how].join(' / ');cross[k]=(cross[k]??0)+1;
  lines.push('| '+[seed+' '+r.tick,r.visitor.name+' → '+r.target.name,r.loc.how,r.loc.how.includes('seen')?(r.tick-r.memory.tick):'—',
   early.toFixed(1)+' → '+late.toFixed(1),r.visitor.space+' → '+r.endVisitor.space,r.target.space+' → '+r.endTarget.space,r.end-r.tick,finding].join(' | ')+' |');
 }
 for(const [key,n] of Object.entries(ref.outcomes))if(key.startsWith('visit|failed|')&&reasons[key]!==n)throw Error(seed+' '+key);
}
if(Object.values(counts).reduce((a,b)=>a+b,0)!==30)throw Error('Count mismatch');
writeFileSync(dir+'/VISITS.md',lines.join('\n')+'\n');
console.log({counts,sources,cross});
