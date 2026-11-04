// REVIEW D (knowledge boundaries): welfare.ts reads a remote subject's true life state and true health at decision time.
// STAGED: Ada worries about Ben, whom she saw hungry 14 tiles east (out of her sight radius of 9). What she is offered to do
// about it is the engine's own ranking; what is declared is Ben's position, his death out of her sight, and his health.
import {expect,it} from 'vitest';
import {stage,addPerson,done,pin} from './helpers/kit';
import {perceive} from '../src/sim/perception';
import {rebuildMobileGrid} from '../src/sim/registry';
import {generateOptions} from '../src/sim/decision';
import {killPerson} from '../src/sim/lifecycle';
import {knowsDeath} from '../src/sim/death_knowledge';
import {relOf} from '../src/sim/relations';
import {SELF_FIX_WINDOW,CONCERN_LIFE} from '../src/sim/welfare';
import {serializeWorld} from '../src/app/save';

function scene(concernAge=0){
 const s=stage('review-d-welfare'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=115;
 const ada=addPerson(s,'Ada',40,40,{age:35,inv:{bread:4,water:2},hunger:95,thirst:95,energy:95,traits:{generosity:0.9}});
 const ben=addPerson(s,'Ben',54,40,{age:30,hunger:95,thirst:95,energy:95});
 done(s);for(const p of [ada,ben]){pin(p);p.needs.warmth=100;p.needs.safety=100;}
 rebuildMobileGrid(w);perceive(w,ada);
 expect(ada.seen.some(x=>x.id===ben.id)).toBe(false); // 14 tiles: out of sight
 relOf(ada,ben.id).affinity=30; // a friend worth walking to
 // declared: she saw him there, hungry, `concernAge` ticks ago (the ordinary noteConcerns would have written exactly this)
 ada.whereabouts[ben.id]={x:ben.x,y:ben.y,tick:w.tick-concernAge};
 ada.concerns.push({about:ben.id,kind:'hungry',seen:w.tick-concernAge,src:'seen',from:ada.id,checked:-99999});
 return {w,ada,ben};
}
const visit=(w:ReturnType<typeof scene>['w'],ada:ReturnType<typeof scene>['ada'],ben:ReturnType<typeof scene>['ben'])=>generateOptions(w,ada,true,true).options.find(o=>o.key===`visit:${ben.id}`);

it('welfare.ts:129 — the walk to a worried-about neighbour vanishes the moment he dies out of sight, although the worrier has no knowledge of the death',()=>{
 const f=scene();
 const before=serializeWorld(f.w);
 expect(visit(f.w,f.ada,f.ben)?.label).toBe('Bring bread to Ben');
 expect(serializeWorld(f.w)).toBe(before); // observer purity of the question
 // Ben dies 14 tiles away: nobody within hearing (10), nobody tells Ada, she sees no grave
 killPerson(f.w,f.ben,'hunger');
 expect(knowsDeath(f.ada,f.ben.id)).toBe(false);
 expect(f.ada.concerns.some(c=>c.about===f.ben.id)).toBe(true); // her worry is as it was
 expect(f.ada.whereabouts[f.ben.id]).toBeDefined(); // and so is her note of where he was
 const ctx=generateOptions(f.w,f.ada,true,true);
 // LEAK: the option is gone, with no set-aside reason; by her own knowledge she should still set out and find him gone
 expect(ctx.options.find(o=>o.key===`visit:${f.ben.id}`)).toBeUndefined();
 expect(ctx.blocked.find(b=>b.targetId===f.ben.id)).toBeUndefined();
});

it('welfare.ts:43/138 — whether an old worry about a grown neighbour is still worth a walk is decided from his live health out of sight',()=>{
 const age=SELF_FIX_WINDOW+40;expect(age).toBeLessThan(CONCERN_LIFE);
 const healthy=scene(age);
 // an adult seen hungry 520 ticks ago will have seen to it himself: the worry is out of date
 expect(visit(healthy.w,healthy.ada,healthy.ben)).toBeUndefined();
 const hurt=scene(age);
 hurt.ben.health=30; // badly hurt since, out of her sight; nobody saw it, nobody told her
 // LEAK: the same worry is now kept and acted on, because isDependent(world, subject) reads his true health
 const o=visit(hurt.w,hurt.ada,hurt.ben);
 expect(o?.label).toBe('Bring bread to Ben');
 expect(o?.parts.some(([n])=>n==='someone who cannot manage alone')).toBe(true);
});
