import { stage,addPerson,building,done,pin,give } from '../tests/helpers/kit';
import { serializeWorld,deserializeWorld } from '../src/app/save';
import { conservationReport } from '../src/sim/economy';
import { newActivity,startActivity } from '../src/sim/activities';
import { stepWorld } from '../src/sim/world';
import { marketSwap } from '../src/sim/occasions';
import { mkdirSync,writeFileSync } from 'node:fs';
import type { Occasion } from '../src/sim/types';
const s=stage('physical-market');s.w.settings.dynamics='rich';s.w.settings.rulesVersion=16;s.w.birthCount=0;
const a=addPerson(s,'Ada',65,40.5,{inv:{wood:4,berries:1},hunger:40,thirst:98});
const b=addPerson(s,'Ben',42,40.5,{inv:{fish:6,berries:3},hunger:95,thirst:98});give(s.w,b,'basket');
const fire=building(s,'fire',40,43);for(const p of [a,b]){p.needs.warmth=95;p.needs.safety=95;pin(p);}
done(s);const w=s.w;w.sceneLabel='STAGED: barter waits for physical arrival';
const o:Occasion={id:w.nextId++,kind:'market',placeId:fire.id,placeName:'the fire',x:40.5,y:43.5,called:0,at:0,until:2400,about:[],attended:[b.id],status:'gathering',end:''};w.occasions=[o];
const before=serializeWorld(w);if(marketSwap(w,a,o)||serializeWorld(w)!==before)throw new Error('remote trade changed state');
mkdirSync('civic_evidence',{recursive:true});writeFileSync('civic_evidence/market-before-save.json',before);
a.cooldowns.pause=0;
startActivity(w,a,newActivity(w,a,{kind:'attend',label:'Go to the market',goal:'staged physical barter',need:'social',targetId:o.id,targetType:'occasion',tx:o.x,ty:o.y,spotX:40.5,spotY:40.5,utility:100,minCommit:60,maxTicks:900,data:{occasion:o.id}}));
for(let i=0;i<50;i++)stepWorld(w);const loaded=deserializeWorld(serializeWorld(w));
let ticks=50;for(;ticks<900&&!w.events.some(e=>e.kind==='trade');ticks++){stepWorld(w);stepWorld(loaded);}
if(serializeWorld(w)!==serializeWorld(loaded))throw new Error('mid-walk save continuation differs');
const trade=w.events.find(e=>e.kind==='trade');if(!trade)throw new Error('no trade on arrival');
const report={label:w.sceneLabel,ticks,trade,ada:{x:a.x,y:a.y,items:a.inv},ben:{x:b.x,y:b.y,items:b.inv},ledger:conservationReport(w),midWalkContinuation:true};
if(!report.ledger.ok)throw new Error('ledger mismatch');
writeFileSync('civic_evidence/market-after-save.json',serializeWorld(w));writeFileSync('civic_evidence/market-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
