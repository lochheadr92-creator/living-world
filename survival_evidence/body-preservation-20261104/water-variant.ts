// STAGED diagnostic. Same body-origin scene as continuation-20261104/preservation-final151.ts ('body').
// Variant 'well' adds one known household well 3 tiles away (it proves out of reach of water, WELL_REACH 14).
// Variant 'near-water' moves the identical layout 15 tiles north, beside the known lake shore, with the camp
// (the area people are taught) centred on it. Nothing else changes. Decisions are ordinary.
import {stage,addPerson,building,done,learn} from '../../tests/helpers/kit';
import {CURRENT_RULES_VERSION} from '../../src/sim/rulesversion';
import {makeWolf} from '../../src/sim/wildlife';
import {makeCarcass} from '../../src/sim/carcass';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {writeFileSync} from 'node:fs';
const out:unknown[]=[];
for(const variant of ['no-well','well','near-water']){
 const dy=variant==='near-water'?-15:0;
 const s=stage('preserved-meat-autonomy'),w=s.w;
 w.settings={...w.settings,dynamics:'rich',rulesVersion:CURRENT_RULES_VERSION,immigration:false};
 const p=addPerson(s,'Ada',40.5,40.5+dy,{hunger:90,thirst:100,energy:100,inv:{berries:3}});
 const rack=building(s,'food_rack',42,40+dy,p.hhId,{wood:2});
 const home=building(s,'hut',38,36+dy,p.hhId);w.households.find(h=>h.id===p.hhId)!.homeId=home.id;
 const well=variant==='well'?building(s,'well',37,41,p.hhId):undefined;
 const deer=makeWolf(w,41.5,40.5+dy,'deer');
 if(dy)w.camp={x:40.5,y:40.5+dy};
 done(s);learn(w,p,rack,home,...(well?[well]:[]));makeCarcass(w,deer,p);
 const twin=deserializeWorld(serializeWorld(w));
 const events:unknown[]=[];
 w.hooks={onActivityStart(_p,a){events.push([w.tick,'start',a.kind,a.targetId,a.data.recipe??a.data.part??'',(a.data.why??'').slice(0,90)]);},onActivityEnd(_p,a,o,d){events.push([w.tick,'end',a.kind,o,d]);}};
 for(let n=0;n<3600;n++){stepWorld(w);stepWorld(twin);}
 delete w.hooks;const exactTwin=serializeWorld(w)===serializeWorld(twin);
 const r={variant,version:CURRENT_RULES_VERSION,exactTwin,created:w.ledger.created,consumed:w.ledger.consumed,conserved:conservationReport(w).ok,finalInv:p.inv,rack:rack.store.items,alive:p.alive,events};
 out.push(r);console.log(JSON.stringify({variant,exactTwin,created:r.created,consumed:r.consumed,conserved:r.conserved}));
}
writeFileSync('survival_evidence/body-preservation-20261104/water-variant.json',JSON.stringify(out,null,1));
