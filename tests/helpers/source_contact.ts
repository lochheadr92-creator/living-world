import {journeyScene} from './journey';
import {generateOptions} from '../../src/sim/decision';
import {finishPrerequisite} from './tool_prerequisite';
import {stepWorld} from '../../src/sim/world';
import {ledgerConsume} from '../../src/sim/economy';
import {T} from '../../src/sim/types';
import type {Activity,Belief} from '../../src/sim/types';
/** Staged legal preparation and actual autonomous departure; changes happen before the first route search. */
export function sourceContactScene(version=75,blocked=true,empty=true){
 const f=journeyScene(version),{w,p,tree}=f;
 const prep=generateOptions(w,p,true,true).options.find(o=>o.journeyFor?.key===f.key);if(!prep)throw new Error('Missing legal preparation');finishPrerequisite(w,p,prep.key);p.nextThink=w.tick;p.cooldowns.pause=0;
 let departure:Activity|undefined,remembered:Belief|undefined;
 w.hooks={onActivityStart:(_,a)=>{if(a.data.optKey!==f.key||departure)return;departure=a;remembered=structuredClone(p.beliefs[tree.id]);if(blocked)for(let y=0;y<w.H;y++)w.terrain[y*w.W+50]=T.DEEP;if(empty){ledgerConsume(w,'wood',tree.amount,'staged unseen depletion');tree.amount=0;}}};
 for(let n=0;n<1600&&(!departure||p.activity?.id===departure.id);n++)stepWorld(w);delete w.hooks;
 if(!departure||!remembered)throw new Error('Missing actual departure');
 w.sceneLabel='STAGED prepared gathering trip; barrier and unseen stock change at departure. Arrival and failed travel are distinct.';
 return {...f,departure,remembered};
}
