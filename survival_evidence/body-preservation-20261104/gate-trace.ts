// STAGED diagnostic (read-only probes): same body-origin setup as continuation-20261104/preservation-final151.ts.
// Steps the ordinary pipeline and, at each sample, reports the inputs to preservationSurplus and the rack gate.
import {stage,addPerson,building,done,learn} from '../../tests/helpers/kit';
import {CURRENT_RULES_VERSION} from '../../src/sim/rulesversion';
import {makeWolf} from '../../src/sim/wildlife';
import {makeCarcass} from '../../src/sim/carcass';
import {stepWorld} from '../../src/sim/world';
import {generateOptions} from '../../src/sim/decision';
import {preservationSurplus} from '../../src/sim/production';
import {knownCarcassUnits} from '../../src/sim/carcass_supply';
import {foodUnits} from '../../src/sim/economy';
import {serializeWorld} from '../../src/app/save';
import {DAY} from '../../src/sim/constants';
const s=stage('preserved-meat-autonomy'),w=s.w;
w.settings={...w.settings,dynamics:'rich',rulesVersion:CURRENT_RULES_VERSION,immigration:false};
const p=addPerson(s,'Ada',40.5,40.5,{hunger:90,thirst:100,energy:100,inv:{berries:3}});
const rack=building(s,'food_rack',42,40,p.hhId,{wood:2});
const home=building(s,'hut',38,36,p.hhId);w.households.find(h=>h.id===p.hhId)!.homeId=home.id;
const deer=makeWolf(w,41.5,40.5,'deer');
done(s);learn(w,p,rack,home);makeCarcass(w,deer,p);
const until=Number(process.argv[2]??1400);
for(let n=0;n<=until;n++){
 if(n%120===0&&n>=600){
  const before=serializeWorld(w);const ctx=generateOptions(w,p,true,true);
  const rb=p.beliefs[rack.id];
  const fresh=Object.values(p.beliefs).filter(b=>b.kind==='building'&&w.tick-b.seen<=DAY&&(b.hh===p.hhId||b.hh===0));
  console.log(JSON.stringify({tick:w.tick,inv:p.inv,rackTruth:rack.store.items,rackBelief:{seen:rb?.seen,items:rb?.items,job:rb?.ops?.job},
   freshBuildingFood:fresh.map(b=>({id:b.id,food:foodUnits(b.items??{}),meat:b.items?.meat})),
   carcassMeat:knownCarcassUnits(ctx,"meat"),invFood:foodUnits(p.inv),surplus:preservationSurplus(ctx),rackOptions:ctx.options.filter(o=>o.targetId===rack.id||/meat/.test(o.key)).map(o=>[o.key,+o.util.toFixed(1),o.blocked??""]),rackBlocked:ctx.blocked.filter(o=>o.targetId===rack.id||/meat|dry/i.test(o.key+o.label)).map(o=>[o.key,o.label,o.blocked])}));
  if(serializeWorld(w)!==before)throw Error('impure');
 }
 stepWorld(w);
}
