import { afterEach, expect, it } from 'vitest';
import { testKit } from '../src/sim/scenes';
import { currentWorldSettings } from '../src/sim/profiles';
import { RNG } from '../src/sim/rng';
import { createBuilding } from '../src/sim/buildings';
import { observe } from '../src/sim/knowledge';
import { generateOptions } from '../src/sim/decision';
import { newActivity, startActivity } from '../src/sim/activities';
import { setExternalController } from '../src/sim/external';
import { stepWorld } from '../src/sim/world';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { updateEnvironment } from '../src/sim/environment';
import { setNightWaitBoundary } from '../src/sim/night_wait';

afterEach(() => { setExternalController(null); setNightWaitBoundary(true); });
function setup(version: number) {
 const w = testKit.flatWorld({...currentWorldSettings('normal', 'night-chat'), rulesVersion: version, immigration: false});
 const rng = new RNG(7);
 const p = testKit.addPerson(w,rng,{name:'Ada',x:40.5,y:40.5,hunger:95,thirst:95,energy:95});
 const q = testKit.addPerson(w,rng,{name:'Ben',x:40.5,y:41.5,hunger:95,thirst:95,energy:95});
 const home=createBuilding(w,'lean_to',41,40,p.hhId);
 w.households.find(h=>h.id===p.hhId)!.homeId=home.id;
 p.inv.water=2; testKit.finish(w,'natural'); w.tick=1673; updateEnvironment(w); observe(w,p,home);
 p.traits.sociability=1;
 setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});
 const o=generateOptions(w,p).options.find(o=>o.key===`shelter:${home.id}`)!;
 const a=o.make!()!; a.data.optKey=o.key; startActivity(w,p,a);
 return {w,p,q,a,home};
}
function interrupt(s:ReturnType<typeof setup>, at=2177) {
 while(s.w.tick<at) stepWorld(s.w);
 startActivity(s.w,s.q,newActivity(s.w,s.q,{kind:'socialize',label:'Chat with Ada',goal:'a chat',targetId:s.p.id,targetType:'person',here:true,data:{purpose:'chat'}}));
 for(let n=0;n<10 && !s.p.convId;n++) stepWorld(s.w);
 expect(s.p.convId,'actual accepted conversation').toBeGreaterThan(0);
 expect(s.p.suspended?.id).toBe(s.a.id);
 return s;
}
it('reproduces the historical night restart through an actual conversation',()=>{
 const s=interrupt(setup(26));
 while(s.w.tick<2402) stepWorld(s.w);
 expect(s.p.lastResult?.detail).toBe('took too long');
});
it('finishes at daylight after a real conversation, including save/load during that conversation',()=>{
 const s=interrupt(setup(27));
 const saved=serializeWorld(s.w);
 const loaded=deserializeWorld(saved);
 while(s.w.tick<2402) stepWorld(s.w);
 while(loaded.tick<2402) stepWorld(loaded);
 expect(s.p.lastInteraction?.purpose).toBe('chat');
 expect(s.p.lastResult?.outcome).toBe('success');
 expect(s.p.lastResult?.detail).toBe('daylight arrived');
 expect(serializeWorld(loaded)).toBe(serializeWorld(s.w));
});
it('an uninterrupted wait ends at the same daylight boundary',()=>{
 const s=setup(27);
 while(s.w.tick<2402) stepWorld(s.w);
 expect(s.p.lastResult?.detail).toBe('daylight arrived');
 expect(s.p.lastResult?.tick).toBe(s.a.data.daylightAt);
});
it('a conversation across dawn completes the wait when it resumes',()=>{
 const s=interrupt(setup(27),2255);
 while(s.w.tick<2500) stepWorld(s.w);
 expect(s.p.lastResult?.detail).toBe('daylight arrived');
 expect(s.p.lastResult!.tick).toBeGreaterThan(s.a.data.daylightAt);
});
it('shelter lost during a conversation is a real failure, not a successful night',()=>{
 const s=interrupt(setup(27));
 s.w.byId.delete(s.home.id);s.w.buildings=s.w.buildings.filter(b=>b.id!==s.home.id);
 while(s.w.tick<2402) stepWorld(s.w);
 expect(s.p.lastResult?.detail).toBe('the shelter is no longer there');
 expect(s.p.lastResult?.outcome).toBe('failed');
});
it('the lab ablation restores the historical timeout without changing old saves',()=>{
 setNightWaitBoundary(false);
 const s=interrupt(setup(27));
 while(s.w.tick<2402) stepWorld(s.w);
 expect(s.p.lastResult?.detail).toBe('took too long');
});
it('an urgent need still interrupts rather than being relabelled as dawn completion',()=>{
 const s=setup(27);s.p.needs.thirst=1;
 for(let n=0;n<100;n++) stepWorld(s.w);
 expect(s.p.lastResult?.detail).not.toBe('daylight arrived');
 expect(s.p.activity?.id).not.toBe(s.a.id);
});
