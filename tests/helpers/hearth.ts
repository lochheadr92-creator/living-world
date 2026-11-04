import {stage,addPerson,building,done,learn} from './kit';
export function hearthScene(){
  const s=stage('staged-hearth');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:123};
  const p=addPerson(s,'Ada',40.5,43.5,{hunger:90,thirst:90,energy:90});
  const b=building(s,'hut',40,40,p.hhId,{});b.hearth={fuel:0,heat:0};p.inv={wood:2};
  done(s);learn(s.w,p,b);s.w.weather.temp=-8;p.needs.warmth=35;
  return {...s,p,b};
}
