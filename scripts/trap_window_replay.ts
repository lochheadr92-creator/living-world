// Explicit rules-upgrade diagnostic from an untouched ordinary128 encounter save.
// It is causal repair evidence, not fresh seeded131 activation or a survival comparison.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {gearTick} from '../src/sim/passive_gear';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
import {labProvenance,assertLabSourceUnchanged} from './observers/provenance';
const [input,out]=process.argv.slice(2);if(!input||!out||existsSync(out))throw Error('input and fresh output required');
const source=labProvenance(),raw=readFileSync(input,'utf8'),before=deserializeWorld(raw),after=deserializeWorld(raw);
if(before.settings.rulesVersion!==128)throw Error('Expected original128 encounter');after.settings.rulesVersion=131;
const trap=after.piles.find(b=>b.gear?.kind==='trap'&&b.gear.state==='armed');if(!trap)throw Error('No armed trap');
gearTick(before);gearTick(after);const bodyId=trap.gear!.bodyId;if(!bodyId)throw Error('Actual encounter did not catch');
const events:unknown[]=[],pure=new Set<number>();
after.hooks={onActivityEnd(p,a,outcome,detail){if(a.kind==='butcher'&&a.data.part==='meat'&&outcome==='success'){if(a.targetId===bodyId){if(p.inv.meat===1)pure.add(p.id);events.push({kind:'recovered trap meat',tick:after.tick,person:p.id,body:bodyId});}else pure.delete(p.id);}},onTransfer(e){if(e.item==='meat'&&e.to.startsWith('person:'))pure.delete(Number(e.to.slice(7)));}};
const caught=serializeWorld(after);if(serializeWorld(deserializeWorld(caught))!==caught)throw Error('Early save changed');
for(let n=0;n<2400;n++){
 const meals=after.persons.filter(p=>pure.has(p.id)&&p.activity?.kind==='eat'&&p.activity.data.food==='meat').map(p=>({p,a:p.activity!,cycle:p.activity!.cycle,last:p.lastAteTick}));
 stepWorld(after);
 for(const m of meals)if(m.p.lastAteTick>m.last&&m.a.cycle>m.cycle)events.push({kind:'ate unmixed trap meat',tick:m.p.lastAteTick,person:m.p.id,body:bodyId});
 for(const id of pure)if(!after.persons.find(p=>p.id===id)?.inv.meat)pure.delete(id);
}
delete after.hooks;const saved=serializeWorld(after),copy=deserializeWorld(saved);if(serializeWorld(copy)!==saved)throw Error('Final save changed');
for(let n=0;n<120;n++){stepWorld(after);stepWorld(copy);}if(serializeWorld(after)!==serializeWorld(copy)||!conservationReport(after).ok)throw Error('Continuation/conservation');
assertLabSourceUnchanged(source);mkdirSync(out);writeFileSync(out+'/final.json',saved);writeFileSync(out+'/report.json',JSON.stringify({source,input,inputHash:createHash('sha256').update(raw).digest('hex'),beforeRules:128,afterRules:131,encounterTick:before.tick,oldBody:before.piles.find(b=>b.id===trap.id)?.gear?.bodyId,newBody:bodyId,events,exactSave:true,exactContinuation:true,conservation:conservationReport(after),limits:'Explicit128-to131 upgrade diagnostic at an existing ordinary encounter. No new animals/items/needs/choices. Not fresh seeded131 activation; later continuation includes other intervening rules.'},null,2));console.log(JSON.stringify({bodyId,events}));
