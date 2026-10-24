import { civicFixture } from './civic';
import { testKit } from '../../src/sim/scenes';
import { RNG } from '../../src/sim/rng';
import { observe } from '../../src/sim/knowledge';
import { relOf } from '../../src/sim/relations';
import { initialiseCouncil } from '../../src/sim/civic_decision';
import { snapshotInitial } from '../../src/sim/economy';
import { abortActivity, newActivity, startActivity } from '../../src/sim/activities';
import { stepWorld } from '../../src/sim/world';
import type { Person,World } from '../../src/sim/types';
export function contestFixture(){
 const {w,a,b,site}=civicFixture();w.settings.rulesVersion=15;w.birthCount=0;
 const q=w.civicProjects![0];initialiseCouncil(w,q);
 const c=testKit.addPerson(w,new RNG(932),{name:'Cora',x:40.5,y:43.5,age:28,sex:'f',inv:{berries:4},traits:{generosity:0,diligence:0,sociability:1},hunger:98,thirst:98});
 for(const p of [a,b,c]){p.cooldowns.pause=1e9;p.needs.safety=95;p.needs.warmth=95;p.traits.sociability=1;}
 relOf(c,a.id).affinity=-80;relOf(c,a.id).trust=-30;
 relOf(b,a.id).affinity=25;relOf(b,a.id).trust=10;
 relOf(b,c.id).affinity=85;relOf(b,c.id).trust=75;
 relOf(a,c.id).affinity=30;relOf(c,b.id).affinity=60;
 observe(w,c,site);snapshotInitial(w);
 return {w,a,b,c,site,q};
}
export function stop(w:World,...ps:Person[]){for(const p of ps){abortActivity(w,p,'fixture holds next conversation');p.cooldowns.pause=1e9;p.cooldowns['talk'+ps[0].id]=0;}}
export function civicTalk(w:World,a:Person,b:Person,siteId:number){
 const after=w.nextId; // wait for this conversation, never an unrelated request
 a.cooldowns.pause=0;b.cooldowns.pause=1e9;
 startActivity(w,a,newActivity(w,a,{kind:'socialize',label:'Discuss coordination',goal:'staged civic choice',targetId:b.id,targetType:'person',tx:b.x,ty:b.y,spotX:b.x-1.3,spotY:b.y,utility:100,minCommit:4000,maxTicks:600,data:{purpose:'recruit',conv:{siteId}}}));
 for(let i=0;i<600;i++){stepWorld(w);if(w.requests.some(r=>r.id>=after&&r.from===a.id&&r.to===b.id&&r.status!=='pending')&&!a.convId)break;}
}
