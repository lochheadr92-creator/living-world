// Version A/B probe: one ordinary Normal world (arrivals on, as in the app and the lab), stepped for N days at a given rules version, and
// one JSON file with a final-state hash (the rules number masked, so two versions that behave the same give the same hash) and the basic
// outcomes. Read-only: it only steps the world. It exists so that a rules change can be compared with its predecessor on the lab's own seeds
// without registering a lab branch: run it at the previous version and at the new one on the same seeds (scripts/ab_run.ps1).
//   npx vite-node scripts/ab_probe.ts -- <seed> <days> <rules> <out.json> [--profile normal|large]
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import type {ProfileName} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {serializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {toolReport} from '../src/sim/toolreg';
import {DAY} from '../src/sim/constants';
const args=process.argv.slice(2).filter(a=>a!=='--');
const profile=(args.includes('--profile')?args[args.indexOf('--profile')+1]:'normal') as ProfileName;
// --strip-cause: leave out the causal event ids of rules 182 (`"eventId"` keys) before hashing, so a version that only adds a record can be shown to leave the world's behaviour alone
const strip=args.includes('--strip-cause');
// --strip-extent: leave out the township extent record of rules 185 (the `"extent":{...}` key) before hashing, for the same reason
const stripExtent=args.includes('--strip-extent');
// --strip-builders: empty every `builtBy` list and drop the rules-186 `builtAll` mark before hashing, for the same reason
const stripBuilders=args.includes('--strip-builders');
// --strip-answers: drop the rules-187 `answerWhy` texts before hashing, for the same reason
const stripAnswers=args.includes('--strip-answers');
const [seed='aspen',days='25',rules='0',out='ab.json']=args.filter((a,i)=>a!=='--profile'&&a!=='--strip-cause'&&a!=='--strip-extent'&&a!=='--strip-builders'&&a!=='--strip-answers'&&args[i-1]!=='--profile');
const w=createWorld({...currentWorldSettings(profile,seed,{immigration:true}),rulesVersion:Number(rules)});
const popByDay:number[]=[];
while(w.tick<Number(days)*DAY){stepWorld(w);if(w.tick%DAY===0)popByDay.push(w.persons.filter(p=>p.alive).length);}
const alive=w.persons.filter(p=>p.alive);
const res={
 seed,profile,days:Number(days),rules:Number(rules),
 finalHash:createHash('sha256').update((s=>stripAnswers?s.replace(/,"answerWhy":"[^"]*"/g,''):s)((s=>stripBuilders?s.replace(/"builtBy":\[[\d,]*\]/g,'"builtBy":[]').replace(/,"builtAll":true/g,''):s)((s=>stripExtent?s.replace(/,?"extent":\{[^{}]*\}/g,''):s)((s=>strip?s.replace(/,"eventId":\d+/g,''):s)(serializeWorld(w).replace(/"rulesVersion":\d+/g,'"rulesVersion":0')))))).digest('hex').slice(0,16),
 conserved:conservationReport(w).ok,tools:toolReport(w).ok,
 alive:alive.length,deaths:w.deceased.length,households:w.households.length,coupled:alive.filter(p=>p.partnerId!==0).length/2,
 meanHunger:Number((alive.reduce((a,p)=>a+p.needs.hunger,0)/Math.max(1,alive.length)).toFixed(1)),
 meanMood:Number((alive.reduce((a,p)=>a+(p.mood?.level??0),0)/Math.max(1,alive.length)).toFixed(1)),
 ill:alive.filter(p=>p.illness).length,buildings:w.buildings.length,popByDay,
};
writeFileSync(out,JSON.stringify(res));
console.log(`${seed} r${rules}: alive ${res.alive} deaths ${res.deaths} hh ${res.households} coupled ${res.coupled} hunger ${res.meanHunger} mood ${res.meanMood} ill ${res.ill} hash ${res.finalHash} conserved ${res.conserved} tools ${res.tools}`);
