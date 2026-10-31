// STAGED mechanism-only audit: one offered grain harvest, no autonomous-world or survival claim.
import{existsSync,writeFileSync}from'node:fs';
import{stage,addPerson,done}from'../tests/helpers/kit';
import{makeSource}from'../src/sim/sources';
import{observe}from'../src/sim/knowledge';
import{generateOptions}from'../src/sim/decision';
import{startActivity,stepActivity}from'../src/sim/activities';
import{conservationReport,invRoom}from'../src/sim/economy';
import{serializeWorld,deserializeWorld}from'../src/app/save';
const out='autonomy_evidence/grain111-seed-probe.json';if(existsSync(out))throw new Error('Preserve prior evidence');
const rows=[];
for(let seed=0;seed<20;seed++){
 const s=stage('full-pack-grain-'+seed),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=111;
 const p=addPerson(s,'Ada',40,40,{age:35,hunger:10,thirst:95,energy:95,inv:{wood:5,seeds:6}}),source=makeSource(w,'wild_grain',40,42,2);done(s);observe(w,p,source);
 const o=generateOptions(w,p,true,true).options.find(o=>o.kind==='gather'&&o.targetId===source.id);if(!o?.make)throw new Error('No food harvest offered');const a=o.make();if(!a)throw new Error('No physical standing place');a.amount=1;p.x=a.spotX;p.y=a.spotY;a.phase='work';const room=invRoom(w,p,'grain');startActivity(w,p,a);
 for(let n=0;n<200&&p.activity?.id===a.id;n++){w.tick++;stepActivity(w,p);}
 const raw=serializeWorld(w);rows.push({seed,room,sourceRemaining:source.amount,hunger:p.needs.hunger,seeds:p.inv.seeds,packGrain:p.inv.grain??0,grainConsumed:w.ledger.consumed.grain??0,seedCreated:w.ledger.created.seeds??0,grainConsumedForSeed:w.ledger.reasons['-saved as seed']??0,conserved:conservationReport(w).ok,reload:serializeWorld(deserializeWorld(raw))===raw,cycle:a.cycle});
}
writeFileSync(out,JSON.stringify({rules:111,scene:'Staged full pack with half a weight unit free, zero carried grain, one offered harvest from a two-unit wild-grain source. Twenty fixed seed names; direct activity stepping only.',rows},null,2));console.log(JSON.stringify({trials:rows.length,seedWithoutGrainInput:rows.filter(r=>r.seedCreated>r.grainConsumedForSeed),allConserved:rows.every(r=>r.conserved),allReload:rows.every(r=>r.reload)}));
