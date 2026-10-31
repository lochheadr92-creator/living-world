// STAGED depleted carried water and thirst. No water location is inserted into knowledge.
import {homeReplacementScene} from './home_replacement';
import {consume} from '../../src/sim/economy';
import {updateEnvironment} from '../../src/sim/environment';
import {CURRENT_RULES_VERSION} from '../../src/sim/rulesversion';
export function waterSearchScene(night=false,critical=true,version=CURRENT_RULES_VERSION){
 const f=homeReplacementScene(version,false);consume(f.w,f.p.inv,'water',3,'staged prior drinking');
 f.p.needs.thirst=critical?5:50;f.w.tick=night?1800:1000;updateEnvironment(f.w);
 f.w.sceneLabel='STAGED critical thirst after dark, carried water already consumed, no remembered water source. Search, discovery and drinking use ordinary decisions and physical water.';
 return f;
}
