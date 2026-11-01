import {expect,it} from 'vitest';
import {stage,addPerson,building,done,give,pin} from './helpers/kit';
import {DAY} from '../src/sim/constants';
import {newActivity,startActivity} from '../src/sim/activities';
import {generateOptions} from '../src/sim/decision';
import {reviewIntentions} from '../src/sim/intent';
import {observe} from '../src/sim/knowledge';
import {perceive} from '../src/sim/perception';
import {makeSource} from '../src/sim/sources';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {setExternalController} from '../src/sim/external';
import {relOf} from '../src/sim/relations';
import {updateEnvironment} from '../src/sim/environment';

it('an actual received basket permits the elder to resume and physically make the formerly impossible pick',()=>{
 const s=stage('pavel-physical-resume'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=119;w.tick=1000;updateEnvironment(w);
 const p=addPerson(s,'Pavel',40,40,{age:71,inv:{wood:2},hunger:100,thirst:100,energy:100}),q=addPerson(s,'Dax',41,40,{age:30,hunger:100,thirst:100,energy:100});give(w,q,'basket');
 const home=building(s,'hut',34,34,p.hhId,{grain:12});w.households.find(h=>h.id===p.hhId)!.homeId=home.id;
 const rock=makeSource(w,'rock',43,43,10),trees=[makeSource(w,'tree',44,40,10),makeSource(w,'tree',44,42,10),makeSource(w,'tree',42,44,10)];
 done(s);
 // A staged willing friend; the engine still evaluates contact and the recipient's acceptance.
 relOf(p,q.id).affinity=70;relOf(q,p.id).affinity=70;
 for(const e of [home,rock,...trees])observe(w,p,e);pin(p);pin(q);
 p.intentions=[{id:w.nextId++,kind:'tool',goal:'make a pick',since:1000,until:6000,status:'active',step:'get stone',stepKind:'get',stepItem:'stone',stepTarget:rock.id,stepKey:null,aboutId:0,wants:{wood:2,stone:2},makes:'pick',sheltered:0,worked:0,blocked:'',reason:'',setAside:0,ended:0}];
 reviewIntentions(generateOptions(w,p,true,true));expect(p.intentions[0].status).toBe('dropped');
 const endings:unknown[]=[];w.hooks={onActivityEnd:(who,a,o,d)=>endings.push({who:who.name,kind:a.kind,o,d})};
 q.cooldowns.pause=0;startActivity(w,q,newActivity(w,q,{kind:'socialize',label:'Offer basket',goal:'help',here:true,targetId:p.id,targetType:'person',data:{purpose:'offer',conv:{items:{basket:1}}}}));
 for(let n=0;n<400&&!(p.inv.basket??0);n++)stepWorld(w);
 expect(p.inv.basket,JSON.stringify({p:p.lastInteraction,q:q.lastInteraction,inv:q.inv,endings})).toBe(1);expect(q.inv.basket??0).toBe(0);expect(conservationReport(w).ok).toBe(true);
 for(let n=0;n<200&&q.convId;n++)stepWorld(w);pin(q);
 // Advance the staged clock past the existing private-plan cooldown; no goods or progress are added.
 w.tick+=DAY;updateEnvironment(w);p.cooldowns.pause=0;perceive(w,p);reviewIntentions(generateOptions(w,p,true,true));
 const plan=p.intentions.find(i=>i.kind==='tool'&&i.status==='active'&&i.makes==='pick');expect(plan).toBeTruthy();
 const gather=generateOptions(w,p,true,true).options.find(o=>o.targetId===rock.id&&o.kind==='gather')!;expect(gather).toBeTruthy();startActivity(w,p,gather.make!()!);
 // Restricted selection demonstrates physical feasibility; it does not claim autonomous prioritisation.
 const restore=setExternalController({controls:(_w,who)=>who.id===p.id,choose:(_w,_p,_ctx,ranked)=>{
  const o=ranked.find(o=>o.kind==='craft'&&o.key.includes('pick'))??ranked.find(o=>o.kind==='gather'&&o.targetId===rock.id);
  return o?{kind:'pick',key:o.key}:{kind:'fallback',reason:'no next tool step offered'};
 }});
 try{for(let n=0;n<3600&&!(p.inv.pick??0);n++)stepWorld(w);}finally{restore();}

 expect(p.inv.pick,JSON.stringify({inv:p.inv,plan,a:p.activity,endings})).toBe(1);expect(p.inv.stone??0).toBe(0);expect(p.inv.wood??0).toBe(0);
 stepWorld(w);expect(plan!.status).toBe('done');expect(conservationReport(w).ok).toBe(true);
 const copy=deserializeWorld(serializeWorld(w));for(let n=0;n<60;n++){stepWorld(w);stepWorld(copy);}expect(serializeWorld(copy)).toBe(serializeWorld(w));
});
