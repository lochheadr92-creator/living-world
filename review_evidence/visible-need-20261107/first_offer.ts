// Read-only: steps one ordinary Normal world (arrivals on) at the given rules version and reports the first tick at which a spontaneous offer of food or
// water ('offer' conversation) opens, and how many open in the run. Used to choose a world for the continuation pin of a change to optOffer.
//   vite-node review_evidence/visible-need-20261107/first_offer.ts -- <seed> <rules> [days]
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {DAY} from '../../src/sim/constants';
const args=process.argv.slice(2).filter(a=>a!=='--');
const [seed='aspen',rules='166',days='10']=args;
const w=createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:Number(rules)});
const seen=new Set<number>();let first=-1;
while(w.tick<Number(days)*DAY){stepWorld(w);for(const c of w.conversations)if(c.purpose==='offer'&&!seen.has(c.id)){seen.add(c.id);if(first<0)first=w.tick;}}
console.log(JSON.stringify({seed,rules:Number(rules),days:Number(days),offers:seen.size,firstOfferTick:first}));
