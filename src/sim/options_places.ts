import {DAY} from './constants';
import {faceToward,newActivity,registerHandler} from './activities';
import {addLog} from './events';
import {think} from './mood';
import {hasPersonalPlaces,placeHold} from './personal_places';
import {Scorer,addOption,eta,pen,spotNear} from './optutil';
import type {Ctx} from './optutil';
import type {Activity,Person,World} from './types';
function visit(w:World,p:Person,a:Activity){
 if(!hasPersonalPlaces(w)||p.indoors||!p.alive||Math.min(p.needs.hunger,p.needs.thirst,p.needs.warmth,p.needs.energy)<35)return;
 const m=p.placeMemories?.find(m=>m.kind==='grave'&&m.graveId===a.targetId&&m.about===a.data.about),g=w.byId.get(a.targetId);
 if(!m||placeHold(w,m)<=.15||(m.visited!==undefined&&w.tick-m.visited<DAY)||g?.ent!=='grave'||g.death?.id!==m.about||Math.hypot(p.x-g.x-.5,p.y-g.y-.5)>2)return;
 return m;
}
registerHandler('pay_respects',{availability:.1,pose:()=> 'stand',begin(w,p,a){if(!visit(w,p,a))return 'cannot pay respects at this grave now';a.duration=50;},work(w,p,a){const m=visit(w,p,a);if(!m)return 'fail:grave visit is no longer possible';faceToward(p,m.x,m.y);if(++a.progress<50)return 'continue';m.visited=w.tick;const loss=p.mood?.thoughts.find(t=>t.kind==='lost:'+m.about&&t.until>w.tick);if(loss)loss.until=w.tick+Math.round((loss.until-w.tick)*.7);think(w,p,'respects:'+m.about,5,DAY/2,`spent time at ${m.name}'s grave`);addLog(w,p,'life',`Paid respects at ${m.name}'s grave.`);return 'done';}});
export function placeOptions(ctx:Ctx):void{
 const {world:w,p}=ctx;if(!hasPersonalPlaces(w)||ctx.night||ctx.criticals.length||Math.min(p.needs.hunger,p.needs.thirst,p.needs.warmth,p.needs.energy)<55)return;
 for(const m of p.placeMemories??[]){const hold=placeHold(w,m);if(m.kind!=='grave'||hold<=.15||(m.visited!==undefined&&w.tick-m.visited<DAY))continue;
 const walk=eta(ctx,m.x,m.y),sc=new Scorer().add('remembered loss',4+16*hold).add('walking',-pen(walk));
 addOption(ctx,{kind:'pay_respects',label:`Visit ${m.name}'s grave`,goal:'remember someone lost',need:null,util:sc.total,parts:sc.parts,eta:walk+50,key:`respects:${m.graveId}`,targetId:m.graveId!,tag:'social',make:()=>{const b=p.beliefs[m.graveId!];const spot=b?spotNear(w,p,b):null;return spot?newActivity(w,p,{kind:'pay_respects',label:`Paying respects to ${m.name}`,goal:'remember someone lost',targetId:m.graveId,targetType:'grave',tx:m.x,ty:m.y,spotX:spot.x,spotY:spot.y,minCommit:50,maxTicks:900,utility:sc.total,data:{about:m.about}}):null;}});
 }
}
