import {stage,addPerson,building,done,learn,pin} from './kit';
import {CURRENT_RULES_VERSION} from '../../src/sim/rulesversion';

/** Explicitly staged stock/equipment for contract and rendered checks. */
export function preservationScene(){
  const s=stage('staged-preservation');
  s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:CURRENT_RULES_VERSION};
  const p=addPerson(s,'Ada',40.5,43.5,{hunger:90,thirst:100,energy:100});
  const b=building(s,'food_rack',40,40,p.hhId,{fish:6,wood:2});
  done(s);learn(s.w,p,b);pin(p);
  s.w.sceneLabel='STAGED · Preserving spare fish';
  return {...s,p,b};
}
