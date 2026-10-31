import {afterEach,expect,it} from 'vitest';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld,hashWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {describePerson} from '../src/sim/inspect';
import {decisionHistory} from '../src/sim/history';
import {DECISION_LEDGER_CAP,setDecisionLedger} from '../src/sim/decision_ledger';
import {promisedSupplyScene,askWood} from './helpers/promised_supply';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {observeInhabitant} from '../src/agent/observe';
import type {World} from '../src/sim/types';
afterEach(()=>setDecisionLedger(true));
const river=(version:number)=>createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:version});
it('every ordinary decision is kept with the activity it launched and how that activity ended, bounded and counted',()=>{
 const w=river(103);const started=new Map<number,number>(),ended=new Map<number,string>();
 w.hooks={onActivityStart:(p,a)=>started.set(a.id,p.id),onActivityEnd:(_p,a,o)=>ended.set(a.id,o)};
 for(let n=0;n<900;n++)stepWorld(w);delete w.hooks;
 let entries=0,closed=0,dropped=0;
 for(const p of w.persons){if(!p.alive)continue;const d=p.decisions!;expect(d.length).toBeLessThanOrEqual(DECISION_LEDGER_CAP);dropped+=p.decisionsDropped??0;
  for(let i=1;i<d.length;i++)expect(d[i].tick).toBeGreaterThanOrEqual(d[i-1].tick);
  for(const e of d){entries++;if(e.activityId){expect(started.get(e.activityId)??p.id).toBe(p.id);if(e.outcome){closed++;expect(ended.get(e.activityId)).toBe(e.outcome);expect(e.endedAt).toBeGreaterThanOrEqual(e.tick);}}}}
 expect(entries).toBeGreaterThan(100);expect(closed).toBeGreaterThan(50);expect(dropped).toBeGreaterThan(0);
 const p=w.persons.find(p=>p.alive&&(p.decisions?.length??0)===DECISION_LEDGER_CAP&&(p.decisionsDropped??0)>0)!;const rows=decisionHistory(w,p);
 expect(rows.some(r=>/chose “.+”; ended (success|failed|interrupted|partial) at tick \d+/.test(r))).toBe(true);expect(rows.at(-1)).toMatch(/earlier decisions? (was|were) compacted/);
});
it('the ledger is saved and reloaded exactly, never fingerprinted, and never written below rules 103 or with the switch off',()=>{
 const w=river(103);for(let n=0;n<300;n++)stepWorld(w);const text=serializeWorld(w);expect(serializeWorld(deserializeWorld(text))).toBe(text);
 const hash=hashWorld(w);for(const p of w.persons){p.decisions=[];p.decisionsDropped=0;}expect(hashWorld(w)).toBe(hash);
 const old=river(102);for(let n=0;n<300;n++)stepWorld(old);expect(old.persons.every(p=>p.decisions===undefined&&p.decisionsDropped===undefined)).toBe(true);expect(decisionHistory(old,old.persons[0])[0]).toMatch(/not kept/);
 setDecisionLedger(false);const off=river(103);for(let n=0;n<300;n++)stepWorld(off);expect(off.persons.every(p=>p.decisions?.length===0)).toBe(true);setDecisionLedger(true);
 const tampered=JSON.parse(text) as {world:{persons:{decisions?:{tick:number}[]}[]|{decisions?:unknown}}};const persons=tampered.world.persons;
 if(Array.isArray(persons)){const q=persons.find(p=>p.decisions?.length)!;q.decisions![0].tick=10**7;expect(()=>deserializeWorld(JSON.stringify(tampered))).toThrow(/decision/i);}
 const older=JSON.parse(serializeWorld(old)) as {world:{settings:{rulesVersion:number},persons:unknown}};older.world.settings.rulesVersion=103;const re=deserializeWorld(JSON.stringify(older));expect(re.persons.every(p=>Array.isArray(p.decisions)&&p.decisionsDropped===0)).toBe(true);
});
it('a staged decision keeps what was known then: the choice, what was passed over, what was set aside and why, and the ending',()=>{
 const f=promisedSupplyScene(103,3,[70,12]);askWood(f);f.ada.cooldowns.pause=0;f.ada.nextThink=f.w.tick;const t=f.w.tick;
 for(let n=0;n<200&&!(f.ada.decisions?.some(e=>e.tick>=t&&e.activityId));n++)stepWorld(f.w);
 const e=f.ada.decisions!.find(e=>e.tick>=t&&e.activityId)!;expect(e.setAside.some(s=>/Ben promised 3 wood, expected by tick \d+/.test(s.reason))).toBe(true);
 const before=serializeWorld(f.w);const view=describePerson(f.w,f.ada.id)!;expect(view.decisionHistory.some(r=>r.includes(`chose “${e.chosen}”`)&&/Set aside then: .*Ben promised 3 wood/.test(r))).toBe(true);
 const ctx=generateOptions(f.w,f.ada,true,true);observeInhabitant(f.w,f.ada,ctx,rankOptions(ctx));expect(serializeWorld(f.w)).toBe(before);
 for(let n=0;n<1200&&!e.outcome;n++)stepWorld(f.w);expect(e.outcome).toBeDefined();expect(decisionHistory(f.w,f.ada).some(r=>r.includes(`chose “${e.chosen}”`)&&r.includes(`ended ${e.outcome} at tick ${e.endedAt}`))).toBe(true);
 // the entry is not re-scored: the reason recorded then survives even after the promise has lapsed
 f.w.tick=(f.ada.socialMemory!.find(m=>m.expectation)!.expectation!.deadline)+1;expect(decisionHistory(f.w,f.ada).some(r=>/Set aside then: .*Ben promised 3 wood/.test(r))).toBe(true);
});
