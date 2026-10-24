// Labelled contract scene: a witness walks to a distant partner and tells the news.
import { stage, addPerson, done, pin } from '../tests/helpers/kit';
import { killPerson } from '../src/sim/lifecycle';
import { relOf } from '../src/sim/relations';
import { newActivity, startActivity } from '../src/sim/activities';
import { stepWorld } from '../src/sim/world';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { conservationReport } from '../src/sim/economy';
import { mkdirSync, writeFileSync } from 'node:fs';
const s=stage('death-news-contract');s.w.settings.dynamics='rich';s.w.settings.rulesVersion=14;s.w.birthCount=0;
const a=addPerson(s,'Ada',40,40,{inv:{berries:4},hunger:98,thirst:98});
const b=addPerson(s,'Ben',42,40,{inv:{berries:4},hunger:98,thirst:98,traits:{sociability:1}});
const c=addPerson(s,'Cora',66,40,{inv:{berries:4},hunger:98,thirst:98,traits:{sociability:1}});
a.partnerId=c.id;c.partnerId=a.id;relOf(c,a.id).kin='partner';relOf(c,a.id).affinity=90;
for(const [p,q]of [[b,c],[c,b]]){relOf(p,q.id).affinity=70;relOf(p,q.id).trust=50;}
for(const p of [a,b,c]){p.needs.warmth=98;p.needs.safety=98;pin(p);}
done(s);const w=s.w;w.tick=100;w.sceneLabel='STAGED: death news travels with a witness';
killPerson(w,a,'injuries');
mkdirSync('civic_evidence',{recursive:true});
writeFileSync('civic_evidence/death-before-save.json',serializeWorld(w));
b.cooldowns.pause=0;
startActivity(w,b,newActivity(w,b,{kind:'socialize',label:'Talk with Cora',goal:'staged journey to tell a witness story',targetId:c.id,targetType:'person',tx:c.x,ty:c.y,spotX:c.x-1.3,spotY:c.y,utility:100,minCommit:4000,maxTicks:1800,data:{purpose:'chat',conv:{}}}));
for(let i=0;i<100;i++)stepWorld(w);
if(c.relations[a.id].deathKnown)throw new Error('news arrived before the staged mid-journey snapshot');
const resumed=deserializeWorld(serializeWorld(w));
let ticks=100;for(;ticks<2000&&!c.relations[a.id].deathKnown;ticks++){stepWorld(w);stepWorld(resumed);}
if(serializeWorld(w)!==serializeWorld(resumed))throw new Error('mid-journey continuation differs');
const learned=c.relations[a.id].deathKnown;
if(!learned||learned.source!=='told'||learned.via!==b.id)throw new Error('Cora did not learn through the witness conversation');
const report={label:w.sceneLabel,ticks,midJourneyContinuation:true,ben:{x:b.x,y:b.y},cora:{x:c.x,y:c.y,learned},ledger:conservationReport(w)};
if(!report.ledger.ok)throw new Error('ledger mismatch');
writeFileSync('civic_evidence/death-after-save.json',serializeWorld(w));
writeFileSync('civic_evidence/death-news-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
