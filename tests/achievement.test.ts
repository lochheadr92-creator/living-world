import { afterEach, expect, it } from 'vitest';
import { addPerson, stage, done } from './helpers/kit';
import { createSite, completeSite } from '../src/sim/buildings';
import { constructionAftermath, setAchievementAftermath } from '../src/sim/achievement';
import { lifeTickRich } from '../src/sim/life';
import { DAY } from '../src/sim/constants';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { observeNow } from './helpers/inhabit';
import { moodWeight, updateMood } from '../src/sim/mood';
import { parseIntervention } from '../scripts/lab/lab';
import type { Person, World, GoalKind } from '../src/sim/types';
afterEach(()=>setAchievementAftermath(true));
function fixture(version=38){
 const s=stage('aftermath');s.w.settings.dynamics='rich';s.w.settings.rulesVersion=version;
 const p=addPerson(s,'Ada',40,40,{age:30,hunger:90,thirst:90});
 const distant=addPerson(s,'Ben',70,70,{age:30});
 done(s);s.w.tick=100;
 return {w:s.w,p,distant};
}
const lifeCheck=(w:World,p:Person)=>{while((w.tick+p.id*53)%(DAY/2)!==0)w.tick++;lifeTickRich(w,p);};
it('actual completion gives the present builder a bounded thought, visible in the restricted observation and affecting effort',()=>{
 const {w,p,distant}=fixture();distant.x=41;distant.y=41;const site=createSite(w,'hut',40,42,p.hhId,p.id);
 const b=completeSite(w,site,p);
 const thought=p.mood!.thoughts.find(t=>t.kind==='achievement')!;
 expect(thought.why).toBe('helped finish a hut');expect(thought.until-thought.since).toBe(2*DAY);
 expect(moodWeight(p,'build')).toBeGreaterThan(1);
 expect(observeNow(w,p).self.thoughts?.join(' ')).toContain('helped finish a hut');
 expect(distant.mood?.thoughts.some(t=>t.kind==='achievement')??false).toBe(false);
 const saved=serializeWorld(w);constructionAftermath(w,b);expect(serializeWorld(w)).toBe(saved);
 expect(serializeWorld(deserializeWorld(saved))).toBe(saved);
 w.tick=thought.until;while((w.tick+p.id)%30!==0)w.tick++;updateMood(w,p);
 expect(p.mood!.thoughts.some(t=>t.kind==='achievement')).toBe(false);
});
it('no delayed remote credit, no credit for a bystander, and no generic double home-goal reward',()=>{
 const {w,p,distant}=fixture();p.goal={kind:'home',since:1,progress:0,done:0};
 const site=createSite(w,'hut',40,42,p.hhId,p.id);const b=completeSite(w,site,p);
 expect(p.mood?.thoughts.some(t=>t.kind==='achievement')??false).toBe(false);
 lifeCheck(w,p);expect(p.goal.done).toBeGreaterThan(0);
 expect(p.mood!.thoughts.filter(t=>t.kind==='goal')).toHaveLength(1);
 b.builtBy=[distant.id];distant.x=42;distant.y=43;
 constructionAftermath(w,b);expect(distant.mood?.thoughts.some(t=>t.kind==='achievement')??false).toBe(false);
});
it('takes a new unmet hope only after three days, remembers fulfilment and survives save/load',()=>{
 const {w,p}=fixture();p.goal={kind:'home',since:1,progress:1,done:100};
 lifeCheck(w,p);expect(p.goal.kind).toBe('home');
 w.tick=100+3*DAY;
 const restored=deserializeWorld(serializeWorld(w));const copy=restored.persons.find(q=>q.id===p.id)!;
 lifeCheck(w,p);lifeCheck(restored,copy);
 expect(p.goal.kind).not.toBe('home');expect(p.goal.done).toBe(0);
 expect(p.goal.previous).toEqual([{kind:'home',done:100}]);
 expect(serializeWorld(restored)).toBe(serializeWorld(w));
 expect(observeNow(w,p).self.aspiration).toContain('earlier achieved');
 expect(observeNow(w,p,false,10).self.aspiration).toBeUndefined();
 const before=serializeWorld(w);observeNow(w,p);expect(serializeWorld(w)).toBe(before);
});
it('does not repeat already fulfilled kinds or invent a sixth goal',()=>{
 const {w,p}=fixture();
 const kinds:GoalKind[]=['home','family','trade','stocked','respected'];
 p.goal={kind:'respected',since:1,progress:1,done:100,previous:kinds.slice(0,4).map(kind=>({kind,done:50}))};
 w.tick=100+4*DAY;lifeCheck(w,p);
 expect(p.goal.kind).toBe('respected');expect(p.goal.done).toBe(100);
});
it('legacy and the lab switch preserve finished aspirations and omit construction satisfaction',()=>{
 for(const mode of ['legacy','off']){
  const {w,p}=fixture(mode==='legacy'?37:38);p.goal={kind:'home',since:1,progress:1,done:100};w.tick=100+4*DAY;
  const restore=mode==='off'?parseIntervention('rich-no-achievement-aftermath').install!():()=>{};
  try{
   lifeCheck(w,p);expect(p.goal.kind).toBe('home');expect(p.goal.previous).toBeUndefined();
   completeSite(w,createSite(w,'storehouse',40,42,0,p.id),p);
   expect(p.mood?.thoughts.some(t=>t.kind==='achievement')??false).toBe(false);
  }finally{restore();}
 }
});
it('rejects malformed or repeated fulfilled history rather than repairing it on load',()=>{
 const {w,p}=fixture();p.goal={kind:'trade',since:1,progress:0,done:0,previous:[{kind:'home',done:50},{kind:'home',done:50}]};
 expect(()=>deserializeWorld(serializeWorld(w))).toThrow('Invalid fulfilled-goal history');
});

it('a sleeping contributor does not witness completion',()=>{
 const {w,p}=fixture();p.pose='sleep';
 completeSite(w,createSite(w,'hut',40,42,p.hhId,p.id),p);
 expect(p.mood?.thoughts.some(t=>t.kind==='achievement')??false).toBe(false);
});
