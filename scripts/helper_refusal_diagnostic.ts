// Explicit rules 78: inspect actual subsequent offers after a communicated making refusal.
import {helperLearningScene} from '../tests/helpers/helper_learning';
import {generateOptions} from '../src/sim/decision';
import {stepWorld} from '../src/sim/world';
import {setExternalController} from '../src/sim/external';
import {MAKING_NOTE} from '../src/sim/social';
import {conservationReport} from '../src/sim/economy';
const f=await helperLearningScene(78),samples:any[]=[];
const restore=setExternalController({controls:(_w,p)=>p.id===f.ada.id,choose:(_w,_p,ctx,ranked)=>{const chosen=ranked.find(o=>o.need&&ctx.criticals.includes(o.need))??ranked.find(o=>o.kind==='socialize'&&o.label.endsWith('for stone'))??ranked.find(o=>o.kind==='craft')??ranked[0];return {kind:'pick',key:chosen.key};}});
try{while(f.w.tick<4000){stepWorld(f.w);if(f.w.tick%10===0&&(f.ada.cooldowns[MAKING_NOTE+f.ben.id]??0)>f.w.tick){const ctx=generateOptions(f.w,f.ada,true,true),offers=ctx.options.filter(o=>o.targetId===f.ben.id&&o.tag==='request');if(offers.length&&samples.length<12)samples.push({tick:f.w.tick,saidMakingUntil:f.ada.cooldowns[MAKING_NOTE+f.ben.id],asked:f.ada.asked[f.ben.id],offers:offers.map(o=>({key:o.key,label:o.label,reason:o.selectionReason})),seen:f.ada.seen.find(s=>s.id===f.ben.id)});}}}finally{restore();}
console.log(JSON.stringify({rules:78,staged:true,requests:f.w.requests.filter(r=>r.from===f.ada.id&&r.to===f.ben.id).map(r=>({id:r.id,kind:r.kind,status:r.status,note:r.note,resolved:r.resolved})),samples,conserved:conservationReport(f.w).ok},null,2));
