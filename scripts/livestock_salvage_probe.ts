import {createWorld} from '../src/sim/factory';
import {stepWorld,hashWorld} from '../src/sim/world';
import {currentWorldSettings} from '../src/sim/profiles';
import {conservationReport} from '../src/sim/economy';
import {DAY} from '../src/sim/constants';

const version=Number(process.argv[2]??262);
const w=createWorld({...currentWorldSettings('normal','aspen'),rulesVersion:version});
const bodies=new Map<number,object>();
const timings=new Map<number,{firstSeen?:number;started?:number;firstCut?:number;lastCut?:number;worker?:string}>();
for(let i=0;i<15*DAY;i++){
  stepWorld(w);
  for(const pile of w.piles){
    const c=pile.carcass;
    if(!c||c.species==='deer'||c.species==='wolf')continue;
    const times=timings.get(c.animalId)??{};
    timings.set(c.animalId,times);
    if(c.initial.meat>0){
      if(times.firstSeen===undefined&&w.persons.some(p=>p.alive&&p.hhId===c.hhId&&p.beliefs[pile.id]?.carcassParts?.meat))times.firstSeen=w.tick;
      const worker=w.persons.find(p=>p.activity?.kind==='butcher'&&p.activity.targetId===pile.id&&p.activity.data.part==='meat');
      if(times.started===undefined&&worker){times.started=w.tick;times.worker=worker.name;}
      if(c.recovered.meat>0)times.firstCut??=w.tick;
      if(c.recovered.meat===c.initial.meat)times.lastCut??=w.tick;
    }
    bodies.set(c.animalId,{...times,species:c.species,animal:c.animalId,death:pile.since,initial:c.initial.meat,recovered:c.recovered.meat,remaining:c.remaining.meat,lost:c.lost.meat,hh:c.hhId});
  }
  if(w.tick%DAY===0)console.log(JSON.stringify({day:w.tick/DAY,hash:hashWorld(w),ok:conservationReport(w).ok,bodies:[...bodies.values()]}));
}
