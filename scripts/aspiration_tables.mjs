// Run from this worktree after the three paired winter and one-day traces.
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const dir = 'review_evidence/aspiration-trace';
const saveDir = process.argv[2];
if (!saveDir) throw Error('Pass the directory containing the original day-96 saves');
const read = path => JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,''));
const seeds = ['aspen','gen-4','river'];
const kinds = ['home','family','trade','stocked','respected','company'];
const lines = [];
const title = name => lines.push('', '## '+name,'');
function table(headers, rows) {
  lines.push('| '+headers.join(' | ')+' |','|'+headers.map(()=>'---').join('|')+'|');
  for (const row of rows) lines.push('| '+row.join(' | ')+' |');
}
const sum = (rows, f) => rows.reduce((v,r)=>v+f(r),0);
const all = [];
const material = [];
const pairRows = [];
const verification = [];
const first = [];
const firstDay = [];
const proposals = [];
for (const seed of seeds) {
  const ref = read('review_evidence/winter259/'+seed+'-day96-on.json');
  const dayRef = read('review_evidence/choice-funnel/'+seed+'-final.json');
  const winter = read(join(dir,seed+'.json'));
  const day = read(join(dir,seed+'-payoff.json'));
  if (!winter.conservation || !day.conservation || winter.initial!==ref.initial || winter.endHash!==ref.endHash ||
    day.initial!==dayRef.start || day.endHash!==dayRef.end) throw Error('Replay mismatch for '+seed);
  const world = read(join(saveDir,seed+'-day96.save.json')).world;
  const people = world.persons.filter(p=>p.alive);
  const firstKind = p => p.goal?.previous?.[0]?.kind ?? p.goal?.kind;
  first.push([seed,people.length,...kinds.slice(0,5).map(k=>people.filter(p=>firstKind(p)===k).length),people.filter(p=>!p.goal).length]);
  for (const r of winter.rows) all.push({...r,seed,start:winter.start});
  for (const [key,values] of Object.entries(day.payoff)) {
    const [kind,match,action,tag] = key.split('|');
    for (const [result,n] of Object.entries(values)) {
      const [outcome,direction] = result.split('|');
      firstDay.push({seed,kind,match,action,tag,outcome,direction,n});
    }
  }
  const gifts = day.links.filter(l=>l.goal==='respected' && l.action==='give' && l.outcome==='success');
  const deposits = day.links.filter(l=>l.goal==='stocked' && l.action==='deposit' && l.outcome==='success');
  material.push([seed,gifts.length,gifts.filter(l=>l.affinityAfter>l.affinityBefore).length,
    gifts.filter(l=>l.affinityBefore>=40).length,gifts.filter(l=>l.affinityBefore<40&&l.affinityAfter>=40).length,
    deposits.length,deposits.filter(l=>l.homeTarget).length,
    deposits.filter(l=>l.homeTarget&&l.progressAfter>l.progressBefore).length]);
  for (const p of winter.proposals) proposals.push([seed,(p.tick/2400).toFixed(3),p.person,p.target,p.goal,p.outcome??'open',p.detail??'']);
  const pairs = winter.contacts.filter(p=>p.chosen>=2);
  pairRows.push([seed,winter.contacts.length,pairs.length,pairs.filter(p=>p.lastTrust>p.firstTrust).length,pairs.filter(p=>p.lastAffinity>p.firstAffinity).length]);
  verification.push([seed,winter.initial,day.endHash,winter.endHash,'pass']);
}
lines.push('# Aspiration trace tables');
title('First assignment recovered from the day-96 saves');
table(['World','Living','Home','Family','Trade','Stores','Reputation','No goal yet'],first);
const open = all.filter(r=>!r.done || r.done>r.start);
const fresh = all.filter(r=>r.entered>r.start && r.kind!=='company' && r.goal.since>=r.start);
title('Assignments, movement and achievement through day 109');
lines.push('Each row counts goal episodes. Open includes goals unfinished at entry and goals taken up during observation. Revised company hopes count separately. Up and down compare successive recorded scores. Met uses the simulation’s achievement event. Still met uses the raw score of the original hope at day 109, even after the resident has moved on. A resident who died is excluded from the live endpoint.','');
table(['Hope','Open','New first','New successor','Moved up','Moved down','Met','Met and alive at end','Still at 100%'],kinds.map(k=>{
  const a=open.filter(r=>r.kind===k), f=fresh.filter(r=>r.kind===k), met=a.filter(r=>r.done), live=met.filter(r=>r.liveEnd!==null);
  return [k,a.length,f.filter(r=>!r.goal.previous?.length).length,f.filter(r=>r.goal.previous?.length).length,a.filter(r=>r.up).length,a.filter(r=>r.down).length,met.length,live.length,live.filter(r=>r.liveEnd>=1).length];
}));
title('What happened to the hopes already unfinished on day 96');
table(['Hope','Unfinished at start','At zero','At least ten days old','Recorded score rose at least once','Recorded score ever fell','Achieved by day 109','Resident alive at endpoint'],kinds.map(k=>{
  const a=open.filter(r=>r.kind===k&&r.entered===r.start);
  return [k,a.length,a.filter(r=>r.entry===0).length,a.filter(r=>r.goal.since<=r.start-24000).length,
    a.filter(r=>r.up).length,a.filter(r=>r.down).length,a.filter(r=>r.done).length,a.filter(r=>r.liveEnd!==null).length];
}));
title('Action opportunities by hope');
lines.push('Counts are decisions by residents with an unfinished goal. Offered means at least one surviving ranked option qualifies for the native +4 score. Selected counts a qualifying activity launched. Success counts its reported ending.','');
table(['Hope','Decisions','Offered','Selected','Succeeded','Failed','Interrupted','Partial','Open at end'],kinds.map(k=>{
  const a=all.filter(r=>r.kind===k);
  const c=['success','failed','interrupted','partial'].map(o=>sum(a,r=>r.outcomes[o]??0));
  const selected=sum(a,r=>r.selected);
  return [k,sum(a,r=>r.decisions),sum(a,r=>r.offered),selected,...c,selected-c.reduce((x,y)=>x+y,0)];
}));
title('Within-activity change on day 96');
lines.push('Raw progress for the same hope at launch and outcome. Only successful activities are included here. Other residents can affect the result in the interval. The raw JSON includes other outcomes and all action types.','');
table(['Hope','Successful aligned','Up','Flat','Down','Successful other','Up','Flat','Down'],kinds.map(k=>{
  const groups=['aligned','other'].map(m=>{
    const a=firstDay.filter(r=>r.kind===k&&r.match===m&&r.outcome==='success');
    return [sum(a,r=>r.n),...['up','flat','down'].map(d=>sum(a.filter(r=>r.direction===d),r=>r.n))];
  });
  return [k,...groups.flat()];
}));
title('From a handover to a milestone on day 96');
table(['World','Completed gifts for reputation','Incoming affinity grew','Recipient already at 40','Recipient crossed 40',
  'Completed deposits for stocked hope','At own home','At own home and score grew'],material);
title('Residents and achievements by world');
table(['World','Distinct goal holders','Open episodes','Open episodes at entry','New first goals','New successor goals','Newly achieved','Newly achieved and still met at end'],seeds.map(seed=>{
  const a=open.filter(r=>r.seed===seed),f=fresh.filter(r=>r.seed===seed);
  return [seed,new Set(all.filter(r=>r.seed===seed).map(r=>r.id)).size,a.length,a.filter(r=>r.entered===r.start).length,
    f.filter(r=>!r.goal.previous?.length).length,f.filter(r=>r.goal.previous?.length).length,
    a.filter(r=>r.done).length,a.filter(r=>r.done&&r.liveEnd>=1).length];
}));
title('Selected proposal approaches');
table(['World','Day','Actor','Target ID','Purpose','Approach outcome','Recorded detail'],proposals);
title('Repeat social approaches');
lines.push('Pairs are directed. Change is from the first to the last selected approach by the same person toward that target. Intervening events can change relationships.','');
table(['World','Directed pairs','Selected at least twice','Trust higher','Affinity higher'],pairRows);
title('Replay verification');
table(['World','Day 96','Day 97','Day 109','Conservation at both endpoints'],verification);
writeFileSync(join(dir,'TABLES.md'),lines.join('\n')+'\n');
