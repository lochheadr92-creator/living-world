import {setExternalController} from '../../src/sim/external';
// Declared stage: real offered repair request and acceptance; no injected promise.
import {stage,addPerson,building,site,done,pin} from './kit';
import {observe} from '../../src/sim/knowledge';
import {perceive} from '../../src/sim/perception';
import {relOf} from '../../src/sim/relations';
import {stepWorld} from '../../src/sim/world';
import {generateOptions} from '../../src/sim/decision';
import {startActivity} from '../../src/sim/activities';
import {destroyBuilding} from '../../src/sim/buildings';
export function targetPromiseScene(version=83){
const s=stage('reported-roof'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
const parent=addPerson(s,'Edda',40,40,{age:72,hunger:100,thirst:100,energy:100}),helper=addPerson(s,'Ned',42,40,{age:34,inv:{wood:4,fruit:4},hunger:100,thirst:100,energy:100,traits:{generosity:1,diligence:1}}),hut=building(s,'hut',60,40,parent.hhId);
w.households.find(h=>h.id===parent.hhId)!.homeId=hut.id;hut.condition=38;done(s);for(const p of [parent,helper]){observe(w,p,hut);perceive(w,p);}relOf(parent,helper.id).affinity=70;relOf(helper,parent.id).affinity=70;pin(helper);
const ask=generateOptions(w,parent,true,true).options.find(o=>o.key.endsWith(':request:repair'));if(!ask)throw new Error('Missing actual repair request');startActivity(w,parent,ask.make!()!);for(let n=0;n<600;n++){stepWorld(w);if(w.requests.some(r=>r.kind==='repair'&&r.status!=='pending')&&!parent.convId)break;}
const request=w.requests.find(r=>r.kind==='repair')!,c=helper.commitments.find(c=>c.requestId===request.id)!;if(request.status!=='promised'||!c)throw new Error('No accepted repair');pin(parent);
return {w,parent,helper,hut,request,c};
}
export function discoveredTargetScene(){
 const f=targetPromiseScene();destroyBuilding(f.w,f.hut,'collapsed in a staged target-loss scene');
 const o=generateOptions(f.w,f.helper,true,true).options.find(o=>o.kind==='repair'&&o.targetId===f.hut.id);if(!o)throw new Error('Missing offered remembered repair');
 f.helper.cooldowns.pause=0;startActivity(f.w,f.helper,o.make!()!);if(!f.helper.activity)throw new Error('Repair approach did not start');
 const restore=setExternalController({controls:(_w,p)=>p.id===f.helper.id,choose:()=>({kind:'defer'})});
 try{for(let n=0;n<700&&f.c.status==='active';n++)stepWorld(f.w);}finally{restore();}pin(f.helper);
 if(f.c.status!=='moot'||!f.c.targetEvidence)throw new Error('Missing personal discovery '+JSON.stringify({commitment:f.c,activity:f.helper.activity,result:f.helper.lastResult,belief:f.helper.beliefs[f.hut.id]}));
 return f;
}

export function sitePromiseScene(version=83){
 const s=stage('promised-site-loss'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const parent=addPerson(s,'Ada',40,40,{age:34,hunger:100,thirst:100,energy:100}),helper=addPerson(s,'Ben',42,40,{age:34,inv:{fruit:4},hunger:100,thirst:100,energy:100,traits:{generosity:1,diligence:1}}),target=site(s,'lean_to',60,40,parent.hhId,parent.id,{wood:4});done(s);
 for(const p of [parent,helper]){observe(w,p,target);perceive(w,p);}relOf(parent,helper.id).affinity=70;relOf(helper,parent.id).affinity=70;pin(helper);
 const ask=generateOptions(w,parent,true,true).options.find(o=>o.tag==='recruit');if(!ask)throw new Error('Missing actual building recruitment');startActivity(w,parent,ask.make!()!);for(let n=0;n<600;n++){stepWorld(w);if(w.requests.some(r=>r.kind==='help_build'&&r.status!=='pending')&&!parent.convId)break;}
 const request=w.requests.find(r=>r.kind==='help_build')!,c=helper.commitments.find(c=>c.requestId===request.id)!;if(request.status!=='promised'||!c)throw new Error('No accepted building help');pin(parent);return {w,parent,helper,target,request,c};
}

export function firePromiseScene(version=83){
const s=stage('reported-roof'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
const parent=addPerson(s,'Edda',40,40,{age:72,hunger:100,thirst:100,energy:100}),helper=addPerson(s,'Ned',42,40,{age:34,inv:{wood:4,fruit:4},hunger:100,thirst:100,energy:100,traits:{generosity:1,diligence:1}}),hut=building(s,'fire',49,40,parent.hhId);
parent.injury={kind:'sprain',since:0,until:5000,how:'staged provider injury'};hut.fuel=100;done(s);for(const p of [parent,helper]){observe(w,p,hut);perceive(w,p);}relOf(parent,helper.id).affinity=70;relOf(helper,parent.id).affinity=70;pin(helper);
const ask=generateOptions(w,parent,true,true).options.find(o=>o.key.endsWith(':request:fire'));if(!ask)throw new Error('Missing actual repair request');startActivity(w,parent,ask.make!()!);for(let n=0;n<600;n++){stepWorld(w);if(w.requests.some(r=>r.kind==='fire'&&r.status!=='pending')&&!parent.convId)break;}
const request=w.requests.find(r=>r.kind==='fire')!,c=helper.commitments.find(c=>c.requestId===request.id)!;if(request.status!=='promised'||!c)throw new Error('No accepted repair');pin(parent);
return {w,parent,helper,hut,request,c};
}
