import {journeyScene} from './journey';
import {makeSource} from '../../src/sim/sources';
import {observe} from '../../src/sim/knowledge';
import {ledgerCreate,ledgerConsume} from '../../src/sim/economy';
import {generateOptions} from '../../src/sim/decision';
import {finishPrerequisite} from './tool_prerequisite';
import {stepWorld} from '../../src/sim/world';
export function journeyRecoveryScene(version=73,known=true){
 const f=journeyScene(version),alt=makeSource(f.w,'tree',known?70:75,known?58:75,8);ledgerCreate(f.w,'wood',alt.amount,'staged alternative source');if(known)observe(f.w,f.p,alt);
 return {...f,alt};
}
export function failJourneySource(f:ReturnType<typeof journeyRecoveryScene>){
 const prep=generateOptions(f.w,f.p,true,true).options.find(o=>o.journeyFor?.key===f.key);if(!prep)throw new Error('Missing preparation');
 finishPrerequisite(f.w,f.p,prep.key);f.p.nextThink=f.w.tick;f.p.cooldowns.pause=0;
 for(let n=0;n<1200&&f.p.activity?.data.optKey!==f.key;n++)stepWorld(f.w);const a=f.p.activity;if(a?.data.optKey!==f.key)throw new Error('Missing work departure');
 ledgerConsume(f.w,'wood',f.tree.amount,'staged source loss after departure');f.tree.amount=0;
 for(let n=0;n<1200&&f.p.activity?.id===a.id;n++)stepWorld(f.w);
 if(f.p.lastResult?.outcome!=='failed')throw new Error('Missing physical source failure');return f.p.intentions.find(i=>i.journey)!;
}
