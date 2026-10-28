// STAGED inhabitant contract: paid-for materials are initial fixture stock, not natural emergence.
import { mkdirSync,writeFileSync,existsSync } from 'node:fs';
import { stage,addPerson,site,done } from '../tests/helpers/kit';
import { observe } from '../src/sim/knowledge';
import { serializeWorld,deserializeWorld } from '../src/app/save';
import { runLive,runReplay } from '../src/agent/run';
import { stubModel } from '../src/agent/model';
import { observationFromPrompt } from '../src/agent/protocol';
import { hashWorld } from '../src/sim/world';
import { conservationReport } from '../src/sim/economy';
const out=process.argv[2]??'inhabitant_evidence/achievement-r38';
if(existsSync(out))throw new Error('Use a fresh output directory');mkdirSync(out,{recursive:true});
const s=stage('achievement-inhabitant');s.w.settings.dynamics='rich';s.w.settings.rulesVersion=38;
const p=addPerson(s,'Ada',40,40,{age:30,inv:{berries:6},hunger:100,thirst:100,energy:100});
p.needs.warmth=100;p.needs.safety=100;p.goal={kind:'family',since:1,progress:0,done:0};
const st=site(s,'hut',42,42,p.hhId,p.id,{wood:8,stone:4});done(s);observe(s.w,p,st);
const start=serializeWorld(s.w);writeFileSync(`${out}/start.json`,start);
const observations:ReturnType<typeof observationFromPrompt>[]=[];
const model=stubModel('achievement-witness',req=>{
 const o=observationFromPrompt(req.user)!;observations.push(o);
 const a=o.options.find(a=>a.kind==='build')??o.options[0];
 return JSON.stringify({choose:a.key,why:a.kind==='build'?'Work on the home site I can see.':'Attend to my next available need.'});
});
const r=await runLive(s.w,p.id,model,{until:1400});
const replay=runReplay(deserializeWorld(start),r.transcript);
writeFileSync(`${out}/transcript.json`,JSON.stringify(r.transcript));writeFileSync(`${out}/observations.json`,JSON.stringify(observations,null,2));writeFileSync(`${out}/final.json`,serializeWorld(r.world));
const witnessed=observations.some(o=>o?.self.thoughts?.some(t=>t.includes('helped finish a hut')));
const report={staged:true,witnessed,hash:hashWorld(r.world),replayHash:hashWorld(replay.world),conservation:conservationReport(r.world),built:r.world.buildings.filter(b=>b.type==='hut').map(b=>({id:b.id,built:b.built}))};
writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));console.log(report);
if(!witnessed||report.hash!==report.replayHash||!report.conservation.ok)throw new Error('Achievement inhabitant contract failed');
// A second staged run follows a fulfilled home aspiration into its next chapter.
const homeWorld=deserializeWorld(start),homePerson=homeWorld.persons.find(q=>q.id===p.id)!;
homePerson.goal={kind:'home',since:0,progress:0,done:0};
const homeStart=serializeWorld(homeWorld);writeFileSync(`${out}/home-start.json`,homeStart);
const homeObs:NonNullable<ReturnType<typeof observationFromPrompt>>[]=[];
const homeModel=stubModel('next-hope-witness',req=>{
 const o=observationFromPrompt(req.user)!;homeObs.push(o);const a=o.options.find(a=>a.kind==='build')??o.options[0];
 return JSON.stringify({choose:a.key,why:'Work on my home when possible, otherwise attend to my needs.'});
});
const next=await runLive(homeWorld,p.id,homeModel,{until:10000});
const nextReplay=runReplay(deserializeWorld(homeStart),next.transcript);
writeFileSync(`${out}/home-transcript.json`,JSON.stringify(next.transcript));writeFileSync(`${out}/home-observations.json`,JSON.stringify(homeObs,null,2));
writeFileSync(`${out}/home-final.json`,serializeWorld(next.world));
const chapter=next.world.persons.find(q=>q.id===p.id)!.goal;
const nextReport={staged:true,chapter,observedNewHope:homeObs.some(o=>o.self.aspiration?.includes('earlier achieved')),hash:hashWorld(next.world),replayHash:hashWorld(nextReplay.world),conservation:conservationReport(next.world)};
writeFileSync(`${out}/home-report.json`,JSON.stringify(nextReport,null,2));console.log(nextReport);
if(!nextReport.observedNewHope||nextReport.hash!==nextReport.replayHash||!nextReport.conservation.ok)throw new Error('Next hope inhabitant contract failed');
