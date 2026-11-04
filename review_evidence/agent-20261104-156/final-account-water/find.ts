// Diagnosis: find the first deceased final account whose water entry fails save validation (forest, rules 156, ordinary).
import {createWorld} from '../../../src/sim/factory';
import {currentWorldSettings} from '../../../src/sim/profiles';
import {stepWorld} from '../../../src/sim/world';
import {validateFinalAccounts} from '../../../src/sim/final_account';
const [seed='forest',rules='156']=process.argv.slice(2);
const w=createWorld({...currentWorldSettings('normal',seed),rulesVersion:Number(rules)});
while(w.tick<60000){stepWorld(w);if(w.tick<54600||w.tick%600)continue;
 try{validateFinalAccounts(w);}catch(e){
  const bad=w.deceased.filter(d=>d.last?.water).map(d=>({id:d.id,name:d.name,tick:d.tick,water:d.last!.water,W:w.W,H:w.H})).filter(x=>{const b=x.water!;return !(Number.isFinite(b.x)&&Number.isFinite(b.y)&&Number.isFinite(b.distance)&&Number.isSafeInteger(b.seen)&&b.seen>=0&&b.seen<=x.tick&&b.x>=0&&b.y>=0&&b.x<w.W&&b.y<w.H);});
  console.log(JSON.stringify({at:w.tick,error:String(e),bad}));process.exit(0);}
}
console.log(JSON.stringify({at:w.tick,ok:true}));
