// Ordinary worlds, read-only probe: how often one person asks another to share a life or a home, how those asks come out, and what the
// settlement looks like afterwards. Usage: vite-node <this> -- <seed> <days> <rules> <out.json>
//   asks      new conversations with purpose 'propose' (by joinKind), counted when they open
//   refused   a proposer's 'propose<id>' cooldown written at tick+2400 (social.ts: the answer was no)
//   noRoom    the same cooldown written at tick+1500 (the answer was yes but nobody could move)
//   couples   people holding a partner / 2, daily; households and mean household size, daily
// Nothing is changed: the probe only steps the world and reads it.
import {writeFileSync} from 'node:fs';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {toolReport} from '../../src/sim/toolreg';
import {DAY} from '../../src/sim/constants';
import {generateOptions} from '../../src/sim/decision';
import {serializeWorld} from '../../src/app/save';
import {createHash} from 'node:crypto';
import {stageOf} from '../../src/sim/people';
// Offers are sampled every SAMPLE ticks through the observer entry point (whileObserving: it leaves the world exactly as it was, as the
// observer-purity tests check), for every adult or elder: how many people were offered a proposal, to whom, and for how many of those
// offers the OTHER person's private regard would have passed the rules-163 gate (so would have been offered at 163 as well).
const SAMPLE=120;
const offered=new Map<string,{kind:string;from163:boolean;samples:number;firstTick:number}>();
let sampled=0,samplesWithOffer=0;
const [seed='econ-cc3',days='25',rules='163',out='proposals.json']=process.argv.slice(2);
const w=createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:Number(rules)});
const seenConv=new Set<number>();
const lastCool=new Map<string,number>();
const asks={partner:0,roommate:0,other:0},askList:{tick:number;a:number;b:number;kind:string}[]=[];
let refused=0,noRoom=0;
const daily:unknown[]=[];
while(w.tick<Number(days)*DAY){
 stepWorld(w);
 for(const c of w.conversations){
  if(c.purpose!=='propose'||seenConv.has(c.id))continue;
  seenConv.add(c.id);
  const k=(c.data?.joinKind as string|undefined)==='partner'?'partner':(c.data?.joinKind as string|undefined)==='roommate'?'roommate':'other';
  asks[k as 'partner']++;if(askList.length<400)askList.push({tick:w.tick,a:c.a,b:c.b,kind:k});
 }
 for(const p of w.persons){
  if(!p.alive)continue;
  for(const key in p.cooldowns){
   if(!key.startsWith('propose'))continue;
   const v=p.cooldowns[key],id=p.id+':'+key,prev=lastCool.get(id);
   if(v!==prev){
    const d=v-w.tick;
    if(prev!==undefined||v>w.tick){if(d>=2300&&d<=2400)refused++;else if(d>=1400&&d<=1500)noRoom++;}
    lastCool.set(id,v);
   }
  }
 }
 if(w.tick%SAMPLE===0){
  for(const p of w.persons){
   if(!p.alive)continue;const st=stageOf(w,p);if(st!=='adult'&&st!=='elder')continue;
   sampled++;let any=false;
   for(const o of generateOptions(w,p,true,true).options){
    const m=/^socialize:(\d+):propose$/.exec(o.key);if(!m)continue;
    any=true;const q=w.byId.get(Number(m[1])) as {relations:Record<number,{affinity:number}>}|undefined;
    const roommate=/sharing a home/.test(o.label),back=q?.relations[p.id];
    const k=`${p.id}->${m[1]}`,e=offered.get(k);
    if(e)e.samples++;else offered.set(k,{kind:roommate?'roommate':/mean a lot/.test(o.label)?'couple at home':'couple',from163:!!back&&back.affinity>=(roommate?32:26),samples:1,firstTick:w.tick});
   }
   if(any)samplesWithOffer++;
  }
 }
 if(w.tick%DAY===0){
  const alive=w.persons.filter(p=>p.alive);
  daily.push({day:w.tick/DAY,alive:alive.length,coupled:alive.filter(p=>p.partnerId!==0).length/2,households:w.households.length,meanHouseholdSize:Number((alive.length/Math.max(1,w.households.length)).toFixed(2)),asks:asks.partner+asks.roommate+asks.other,refused,noRoom});
 }
}
const alive=w.persons.filter(p=>p.alive);
const res={
 seed,days:Number(days),rules:Number(rules),conserved:conservationReport(w).ok,tools:toolReport(w).ok,
 finalHash:createHash('sha256').update(serializeWorld(w).replace(/"rulesVersion":\d+/g,'"rulesVersion":0')).digest('hex').slice(0,16),
 alive:alive.length,deaths:w.deceased.length,households:w.households.length,coupledAtEnd:alive.filter(p=>p.partnerId!==0).length/2,
 asks,refused,noRoom,askList,
 sampling:{every:SAMPLE,adultSamples:sampled,samplesWithAnOffer:samplesWithOffer,pairsOffered:offered.size,
  pairsOfferedAlsoAt163:[...offered.values()].filter(v=>v.from163).length,
  pairsOfferedOnlyWithoutTheGate:[...offered.values()].filter(v=>!v.from163).length,
  byKind:Object.fromEntries(['couple','couple at home','roommate'].map(k=>[k,[...offered.values()].filter(v=>v.kind===k).length])),
  firstOffers:[...offered.entries()].slice(0,40).map(([k,v])=>({pair:k,...v}))},
 daily,
};
writeFileSync(out,JSON.stringify(res,null,1));
console.log(`${seed} r${rules}: asks ${asks.partner}p/${asks.roommate}r/${asks.other}o refused ${refused} noRoom ${noRoom} coupled ${res.coupledAtEnd} alive ${res.alive} deaths ${res.deaths} offers: ${res.sampling.pairsOffered} pairs (${res.sampling.pairsOfferedAlsoAt163} also at 163) in ${res.sampling.samplesWithAnOffer}/${res.sampling.adultSamples} samples hash ${res.finalHash} conserved ${res.conserved} tools ${res.tools}`);
