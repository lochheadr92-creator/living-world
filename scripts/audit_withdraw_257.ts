// Targeted read-only replay of the recorded River unseen ending.
import { argsOf, worldFromArgs } from './world_args';
import { ageYears } from '../src/sim/people';
import { hashWorld, stepWorld } from '../src/sim/world';
import { WithdrawCheck } from './observers/withdraw_check';

const { opt } = argsOf(process.argv);
const { w } = worldFromArgs(opt);
const target = 49531, events: object[] = [];
const initialHash = hashWorld(w);
w.hooks = {
  onActivityStart(p, a) { if (p.id === target && a.kind === 'withdraw') events.push({ event:'start', tick:w.tick, id:a.id, phase:a.phase, age:ageYears(w,p), indoors:p.indoors, target:a.targetId }); },
  onActivityEnd(p, a, outcome, detail) { if (p.id === target && a.kind === 'withdraw') events.push({ event:'end', tick:w.tick, id:a.id, phase:a.phase, age:ageYears(w,p), indoors:p.indoors, target:a.targetId, outcome, detail, moved:a.cycle }); },
};
const watched = opt('watched', 'true') === 'true';
const observer = new WithdrawCheck(); if (watched) observer.attach(w);
while (w.tick <= 231305) { if (watched) observer.sampleTick(w); stepWorld(w); }
console.log(JSON.stringify({ watched, initialHash, finalHash:hashWorld(w), endTick:w.tick, events, ...(watched ? {counts:observer.report().counts, unseen:observer.report().unseenEndDetails} : {}) }));
