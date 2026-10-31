import {afterEach,expect,it} from 'vitest';
import {locationQuestionScene} from './helpers/location_question';
import {setLocationQuestions} from '../src/sim/location_question';
import {generateOptions} from '../src/sim/decision';
import {startActivity} from '../src/sim/activities';
import {setExternalController} from '../src/sim/external';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {describePerson} from '../src/sim/inspect';
import {conservationReport} from '../src/sim/economy';
import type {Ctx} from '../src/sim/optutil';
import {hashUnit} from '../src/sim/rng';
afterEach(()=>setLocationQuestions(true));
const askOption=(ctx:Ctx)=>ctx.options.find(o=>o.label==='Ask Cara where Ada is');
const blockedGive=(ctx:Ctx)=>ctx.blocked.find(b=>b.blocked==='does not know where to find them');
function askCara(f:ReturnType<typeof locationQuestionScene>){
 // Cara stays idle (pinned) so her availability for a word is the ordinary idle value; Ben decides freely
 // the engine's own chance that an idle person stops for a word is a hash of the two and the time window; the staged ask
 // waits for a window in which that chance is taken, so the contract is about the question, not about one unlucky window
 for(let n=0;n<400&&hashUnit(f.cara.id,f.ben.id,f.w.tick>>4)>=0.9;n++)stepWorld(f.w);
 f.ben.cooldowns.pause=0;f.cara.nextThink=f.w.tick+600;const o=askOption(generateOptions(f.w,f.ben,true,true));if(!o)throw new Error('No ask option');startActivity(f.w,f.ben,o.make!()!);
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});let spoken='';try{for(let n=0;n<400;n++){stepWorld(f.w);const r=f.w.requests.find(r=>r.kind==='info'&&r.from===f.ben.id);if(r&&r.status!=='pending'&&!spoken)spoken=f.cara.speech?.text??'';if(r&&r.status!=='pending'&&!f.ben.convId)break;}}finally{release();}
 return {info:f.w.requests.find(r=>r.kind==='info'&&r.from===f.ben.id)!,spoken};
}
it('after a failed hand-over the helper asks a present neighbour, keeps her dated answer with the teller, and delivers',()=>{
 const f=locationQuestionScene();expect(f.ben.whereabouts[f.ada.id]).toBeUndefined();
 const before=serializeWorld(f.w),ctx=generateOptions(f.w,f.ben,true,true);expect(blockedGive(ctx)).toBeDefined();expect(askOption(ctx)).toBeDefined();describePerson(f.w,f.ben.id);expect(serializeWorld(f.w)).toBe(before);
 const {info,spoken}=askCara(f);expect(info).toMatchObject({status:'fulfilled',infoKind:'person',destId:f.ada.id});expect(spoken).toMatch(/I saw Ada near there at tick \d+/);
 expect(f.ben.whereabouts[f.ada.id]).toMatchObject({x:f.cara.whereabouts[f.ada.id].x,y:f.cara.whereabouts[f.ada.id].y,from:f.cara.id});expect(f.ben.log.some(l=>/Cara told me where they last saw Ada, at tick \d+/.test(l.text))).toBe(true);
 const after=generateOptions(f.w,f.ben,true,true);expect(blockedGive(after)).toBeUndefined();expect(after.options.some(o=>/fish to Ada as promised/.test(o.label))).toBe(true);
 const twin=deserializeWorld(serializeWorld(f.w));f.ben.cooldowns.pause=0;for(let n=0;n<2500&&f.request.status==='promised';n++){stepWorld(f.w);stepWorld(twin);}
 expect(f.request.status).toBe('fulfilled');expect(f.ada.inv.fish??0).toBeGreaterThan(0);expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
});
it('a neighbour who has not seen her says so; nothing is learned and the promise stays set aside',()=>{
 const f=locationQuestionScene(105,false);const {info,spoken}=askCara(f);expect(info.status).toBe('failed');expect(spoken).toMatch(/haven’t seen Ada/);expect(f.ben.whereabouts[f.ada.id]).toBeUndefined();expect(blockedGive(generateOptions(f.w,f.ben,true,true))).toBeDefined();
});
it('an older account does not overwrite a newer note of one’s own',()=>{
 const f=locationQuestionScene();f.ben.whereabouts[f.ada.id]={x:5,y:5,tick:f.w.tick-5};const mine={...f.ben.whereabouts[f.ada.id]};
 // Ben can place her now, so no question is offered; a direct answer would not replace the newer note either
 expect(askOption(generateOptions(f.w,f.ben,true,true))).toBeUndefined();expect(f.ben.whereabouts[f.ada.id]).toEqual(mine);
});
it.each(['legacy','ablation'])('nobody can be asked after under %s',mode=>{
 if(mode==='ablation')setLocationQuestions(false);const f=locationQuestionScene(mode==='legacy'?104:105);const ctx=generateOptions(f.w,f.ben,true,true);expect(askOption(ctx)).toBeUndefined();expect(blockedGive(ctx)).toBeDefined();
});
it('a told note is refused by a build below rules 105',()=>{
 const f=locationQuestionScene();askCara(f);const text=serializeWorld(f.w);expect(serializeWorld(deserializeWorld(text))).toBe(text);
 const o=JSON.parse(text) as {world:{settings:Record<string,unknown>}};o.world.settings.rulesVersion=104;expect(()=>deserializeWorld(JSON.stringify(o))).toThrow(/location question|told whereabouts/);
});
