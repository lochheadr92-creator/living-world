import {readFileSync,writeFileSync} from 'node:fs';
const dir='review_evidence/visit-door';
const load=path=>JSON.parse(readFileSync(path,'utf8'));
const lines=['# Remembered-room welfare visits','','Each row follows one original departure through tick 232800. Runs for the same pair overlap. A retry is a subsequent visit launch by the same person towards the same recipient. Held counts are distinct ticks on which that offer was considered and withheld.','','| Original case | Test | First outcome | Elapsed ticks | Later launches (tick, memory tick) | Holds |','|---|---|---|---:|---|---:|'];
for(const tick of [230957,231029,231102,232179,232412]){
  for(const arm of ['native','door','closed']){
    const run=load(dir+'/'+tick+'-'+arm+'.json');
    const ref=load('review_evidence/visit-departure/'+run.seed+'.json');
    const row=ref.rows.find(r=>r.tick===tick);
    const launches=run.events.filter(e=>e.event==='launch'),ends=run.events.filter(e=>e.event==='end');
    if(launches[0]?.tick!==tick||!ends[0])throw Error('Missing matched case '+tick);
    if(arm==='native'&&(ends[0].detail!==row.detail||ref.endHash!==run.hash))throw Error('Native mismatch');
    const first=ends[0], desc=first.outcome??first.detail;
    lines.push('| '+[row.visitor.name+' → '+row.target.name+' ('+tick+')',arm,first.result+' / '+desc,first.tick-tick,
      launches.slice(1).map(e=>e.tick+' / '+(e.memory??'no recent room')).join(', ')||'none',run.events.filter(e=>e.event==='held').length].join(' | ')+' |');
  }
}
writeFileSync(dir+'/CASES.md',lines.join('\n')+'\n');
