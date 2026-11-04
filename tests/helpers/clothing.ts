import {stage,addPerson,building,done,learn} from './kit';
export function clothingScene(){
 const s=stage('staged-clothing');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:124};
 const p=addPerson(s,'Ada',40,40,{hunger:90,thirst:90,energy:90});
 const b=building(s,'timber_yard',42,42,p.hhId,{wood:2});
 done(s);learn(s.w,p,b);s.w.weather.temp=0;p.needs.warmth=40;
 return {...s,p,b};
}
