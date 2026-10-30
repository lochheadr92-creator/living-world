// Rules-74 staged physical path failure: report what the person learns without reaching the source.
import {journeyScene} from '../tests/helpers/journey';
import {generateOptions} from '../src/sim/decision';
import {finishPrerequisite} from '../tests/helpers/tool_prerequisite';
import {stepWorld} from '../src/sim/world';
import {ledgerConsume,conservationReport} from '../src/sim/economy';
import {T} from '../src/sim/types';
import type {Activity,Belief} from '../src/sim/types';
const f=journeyScene(74),{w,p,tree}=f;
const prep=generateOptions(w,p,true,true).options.find(o=>o.journeyFor?.key===f.key);if(!prep)throw new Error('No legal preparation');finishPrerequisite(w,p,prep.key);p.nextThink=w.tick;p.cooldowns.pause=0;
let a:Activity|undefined,remembered:Belief|undefined;
w.hooks={onActivityStart:(_,act)=>{if(act.data.optKey!==f.key)return;a=act;remembered=structuredClone(p.beliefs[tree.id]);for(let y=0;y<w.H;y++)w.terrain[y*w.W+50]=T.DEEP;ledgerConsume(w,'wood',tree.amount,'staged unseen depletion');tree.amount=0;}};
for(let n=0;n<1200&&(!a||p.activity?.id===a.id);n++)stepWorld(w);if(!a)throw new Error('No actual gathering departure');delete w.hooks;
const report={rules:74,staged:true,person:p.id,source:tree.id,start:a.start,end:w.tick,position:{x:p.x,y:p.y},destination:{x:tree.x,y:tree.y},outcome:p.lastResult,remembered,after:p.beliefs[tree.id],failure:p.failures[tree.id],sourceExperience:p.payoff.wood?.sources,conserved:conservationReport(w).ok};
console.log(JSON.stringify(report,null,2));if(!report.conserved||p.lastResult?.outcome!=='failed')throw new Error('Invalid route diagnostic');
