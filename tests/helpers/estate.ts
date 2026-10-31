import {stage,addPerson,done,give,pin} from './kit';
/** Declared mixed estate: household goods, borrowed axe, public pick. All physical from the outset. */
export function estateScene(version=93){
 const s=stage('staged-physical-estate');s.w.settings.rulesVersion=version;s.w.settings.dynamics='rich';
 const a=addPerson(s,'Ada',40.5,40.5,{age:34,inv:{wood:3,bread:1},hunger:100,thirst:100,energy:100});
 const b=addPerson(s,'Ben',42.5,40.5,{age:30,hh:a.hhId,hunger:100,thirst:100,energy:100});
 const lender=addPerson(s,'Lena',44.5,40.5,{age:30,hunger:100,thirst:100,energy:100});
 const outsider=addPerson(s,'Oren',46.5,40.5,{age:30,hunger:100,thirst:100,energy:100});
 const own=give(s.w,a,'axe'),borrowed=give(s.w,a,'axe'),publicTool=give(s.w,a,'pick');
 borrowed.ownerHh=lender.hhId;borrowed.loan={lender:lender.id,borrower:a.id,due:2400};publicTool.ownerHh=0;
 done(s);for(const p of [a,b,lender,outsider]){pin(p);p.needs.warmth=100;p.needs.safety=100;}
 return {w:s.w,a,b,lender,outsider,own,borrowed,publicTool};
}
