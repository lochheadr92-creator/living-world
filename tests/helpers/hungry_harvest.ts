// STAGED personally known household crop. Ripeness/stock are supplied before the ledger snapshot.
import {stage,addPerson,done} from './kit';
import {createPlot} from '../../src/sim/farming';
import {observe} from '../../src/sim/knowledge';
import {CURRENT_RULES_VERSION} from '../../src/sim/rulesversion';
import type {Items} from '../../src/sim/types';
export function hungryHarvestScene(version=CURRENT_RULES_VERSION,inv:Items={water:3},age=35){
 const s=stage('hungry-household-harvest'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const p=addPerson(s,'Ada',40,40,{age,hunger:10,thirst:95,energy:95,inv});p.needs.warmth=95;p.needs.safety=95;
 const plot=createPlot(w,42,40,p.hhId);plot.state='ripe';plot.progress=1;plot.stock=4;plot.seedStock=1;plot.ripeTick=w.tick;
 done(s);observe(w,p,plot);w.sceneLabel='STAGED hungry person beside a personally known ripe household crop; ripeness and stock supplied before the accounting snapshot. Harvest and eating must happen physically.';
 return {s,w,p,plot};
}
