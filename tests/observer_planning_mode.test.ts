import { expect, it } from 'vitest';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { observeInhabitant } from '../src/agent/observe';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { createWorld } from '../src/sim/factory';
import { describePerson } from '../src/sim/inspect';
import { currentWorldSettings } from '../src/sim/profiles';

it('observes a blocked promise without restamping it, distinguishing collect from read-only observer mode',()=>{
  const w=createWorld(currentWorldSettings('normal','observer-promise',{immigration:false}));
  const p=w.persons[0];w.tick=37;
  p.commitments.push({id:w.nextId++,requestId:0,kind:'haul',to:w.persons[1].id,item:'wood',amount:2,siteId:999999,made:0,deadline:1000,status:'active',blocked:'previous reason',blockedAt:3});
  const before=serializeWorld(w);
  const ctx=generateOptions(w,p,true,true);
  observeInhabitant(w,p,ctx,rankOptions(ctx));describePerson(w,p.id,{opportunities:true});
  expect(serializeWorld(w)).toBe(before);expect(p.commitments[0].blockedAt).toBe(3);
  // Sensitivity check: the person's genuine planner is allowed to write this record.
  const deciding=deserializeWorld(before),q=deciding.persons[0];
  generateOptions(deciding,q,true);
  expect(q.commitments[0].blockedAt).toBe(37);
  expect(serializeWorld(deciding)).not.toBe(before);
});
