import { setEarlierCompany } from '../src/sim/earlier_company';
// Short diagnostic, not a lab or evidence of long-term safety.
import { DAY } from '../src/sim/constants';
import { foodUnits } from '../src/sim/economy';
import { timeCategory } from './observers/time_budget';
import { setQuietCompany } from '../src/sim/quiet_company';
import { hashWorld, stepWorld } from '../src/sim/world';
import { argsOf, worldFromArgs } from './world_args';
const {opt}=argsOf(process.argv), {w,loaded}=worldFromArgs(opt);
if (!loaded) throw Error('Need --load');
const state=opt('company','on'); if (!['on','off'].includes(state)) throw Error('Invalid company');
setQuietCompany(state==='on');
const urge=opt('urge','off'); if (!['on','off'].includes(urge)) throw Error('Invalid urge'); setEarlierCompany(urge==='on');
const start=w.tick, initial=hashWorld(w); let restSamples=0, social=0, samples=0, conversations=0;
const categories: Record<string,number> = {};
const prior=w.hooks; w.hooks = { ...prior, onActivityStart: (p,a) => { prior?.onActivityStart?.(p,a); if(a.kind==='socialize' || a.kind==='converse') conversations++; } };
console.log(JSON.stringify({event:'start',loaded,rules:w.settings.rulesVersion,state,urge,initial,tick:start}));
while(w.tick<start+DAY) {
 if((w.tick-start)%10===0) for(const p of w.persons) if(p.alive) { if(p.activity?.kind==='rest' && p.activity.phase==='work') restSamples++; social+=p.needs.social; samples++; const k=timeCategory(p,w.tick); categories[k]=(categories[k]??0)+1; }
 stepWorld(w);
}
console.log(JSON.stringify({event:'finish',tick:w.tick,hash:hashWorld(w),living:w.persons.filter(p=>p.alive).length,restSamples,socialMean: samples ? social/samples : null, personSamples:samples,categories,conversationStarts:conversations, foodInPeopleBuildingsAndPiles: w.persons.filter(p=>p.alive).reduce((n,p)=>n+foodUnits(p.inv),0)+w.buildings.reduce((n,b)=>n+foodUnits(b.store.items),0)+w.piles.reduce((n,p)=>n+foodUnits(p.items),0), deaths:w.deceased.length}));
