// Review probe (not a product test): which checks in tests/helpers/v115ref.ts actually discriminate the rules-115
// behaviour? Runs the same staged scene at rules 114 (behaviour absent) and 115 (present) and prints what differs.
import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';
import expected from './v115_continuation.expected.json';
import {serializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {projectInputsScene} from './helpers/project_inputs';
const digest=(w:any)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
function scene(version:number){
 const f=projectInputsScene(version);
 const wantsAtAdoption={...f.plan.wants};
 for(let n=0;n<180&&!(f.p.activity?.kind==='craft'&&f.p.activity.progress>0);n++)stepWorld(f.w);
 const began=f.p.activity?.kind==='craft'&&f.p.activity.data.tool==='hammer'&&(f.p.activity.progress??0)>0;
 const wantsAtCraft={...f.plan.wants};const saved=digest(f.w);
 for(let n=0;n<160;n++)stepWorld(f.w);
 return {version,wantsAtAdoption,began,wantsAtCraft,saved,hammer:f.p.inv.hammer??0,ledger:f.w.ledger.reasons['-crafting: hammer'],wantsStoneAfter:f.plan.wants.stone??0,otherToolIntentions:f.p.intentions.filter(i=>i.kind==='tool').length};
}
it('review: compare the v115ref scene assertions at rules 114 and 115',()=>{
 const r114=scene(114),r115=scene(115);
 console.log('RULES114 '+JSON.stringify(r114));
 console.log('RULES115 '+JSON.stringify(r115));
 console.log('recorded projectHandcraft.saved='+(expected as any).projectHandcraft.saved+' matches115='+((expected as any).projectHandcraft.saved===r115.saved)+' matches114='+((expected as any).projectHandcraft.saved===r114.saved));
 // the explicit assertions of v115ref, evaluated at 114:
 const explicit114=r114.began&&r114.hammer===1&&r114.ledger===3&&r114.wantsStoneAfter===0;
 console.log('v115ref explicit assertions would pass at rules 114: '+explicit114);
 expect(r115.saved).toBe((expected as any).projectHandcraft.saved);
});
