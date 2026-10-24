import { addPerson, building, done, stage } from './kit';
import { createSite } from '../../src/sim/buildings';
import { newActivity, startActivity } from '../../src/sim/activities';
import { observe } from '../../src/sim/knowledge';
import { relOf } from '../../src/sim/relations';
import { stepWorld } from '../../src/sim/world';
import { proposeProject } from '../../src/sim/townships';
import type { World, Person } from '../../src/sim/types';
export function civicFixture(generous = true) {
 const s = stage('civic-contract'); s.w.settings.dynamics = 'rich'; s.w.settings.rulesVersion = 12;
 const a = addPerson(s,'Ada',40.5,40.5,{traits:{generosity:0.9,diligence:0.9,sociability:0.8}, inv:{wood:6,berries:4}, hunger:98,thirst:98});
 const b = addPerson(s,'Ben',42,40.5,{sex:'m',traits:{generosity:generous?0.9:0,diligence:generous?0.9:0}, inv:{wood:4,stone:4,berries:4},hunger:98,thirst:98});
 for (const p of [a,b]) {
  p.cooldowns.pause=1e9; p.cooldowns.trade=1e9;
  p.needs.warmth=95; p.needs.safety=95;
  building(s,'hut',p===a?35:48,39,p.hhId,{berries:12});
 }
 relOf(a,b.id).affinity=40; relOf(b,a.id).affinity=generous?40:-40;
 const site=createSite(s.w,'storehouse',43,43,a.hhId,a.id);
 proposeProject(s.w,a,site,'our known households need a shared store');
 observe(s.w,a,site);
 done(s);
 return {w:s.w,a,b,site};
}
export function civicTalk(w:World,a:Person,b:Person,siteId:number) {
 a.cooldowns.pause=0; b.cooldowns.pause=0;
 startActivity(w,a,newActivity(w,a,{kind:'socialize',label:'Propose shared work',goal:'staged contract',targetId:b.id,targetType:'person',tx:b.x,ty:b.y,spotX:b.x-1.3,spotY:b.y,utility:100,minCommit:4000,maxTicks:600,data:{purpose:'recruit',conv:{siteId}}}));
 for(let i=0;i<600;i++){stepWorld(w); if(w.requests.some(r=>r.siteId===siteId && r.status!=='pending') && !a.convId) break;}
}
