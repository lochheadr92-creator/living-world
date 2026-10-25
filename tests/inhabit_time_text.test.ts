import { expect, it } from 'vitest';
import { worldDuration, observedAge, observedDuration } from '../src/agent/time_text';
import { DAY } from '../src/sim/constants';
import { craftAuditWorld } from '../scripts/fixtures/craft_audit_world';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { observeInhabitant } from '../src/agent/observe';
import { serializeWorld } from '../src/app/save';
import { observationVersionFor, protocolHasMemory } from '../src/agent/protocol';

it('formats short, hour and day durations on the same world clock',()=>{
  expect(worldDuration(0)).toBe('0 world min');
  expect(worldDuration(0.5)).toBe('under 1 world min');
  expect(worldDuration(1)).toBe('1 world min');
  expect(worldDuration(10)).toBe('6 world min');
  expect(worldDuration(100)).toBe('1 world h');
  expect(worldDuration(210)).toBe('2 world h 6 min');
  expect(worldDuration(DAY)).toBe('1 world day');
  expect(worldDuration(DAY*2+110)).toBe('2 world days 1 h 6 min');
});
it('ages, zero/future timestamps, and rounding boundaries are explicit; old wording is immutable',()=>{
  const w=craftAuditWorld(); w.tick=5000;
  expect(observedAge(w,6,5000)).toBe('just now');
  expect(observedAge(w,6,4999)).toBe('1 world min ago');
  expect(observedAge(w,6,4901)).toBe('59 world min ago');
  expect(observedAge(w,6,4900)).toBe('1 world h ago');
  expect(observedAge(w,6,5000-DAY)).toBe('1 world day ago');
  expect(observedAge(w,6,5000+100)).toBe('in 1 world h');
  expect(observedAge(w,5,4950)).toBe('5s ago');
  expect(observedDuration(210,5)).toBe('21s');
});
it('observation time wording changes neither full saved state nor offered execution',()=>{
  const w=craftAuditWorld(),p=w.persons[0],before=serializeWorld(w);
  const c=generateOptions(w,p,true,true),ranked=rankOptions(c);
  const old=observeInhabitant(w,p,c,ranked,{version:5});
  const now=observeInhabitant(w,p,c,ranked);
  expect(now.options.map(o=>[o.key,o.goal,o.limits])).toEqual(old.options.map(o=>[o.key,o.goal,o.limits]));
  expect(now.options.every(o=>o.eta==='now'||o.eta.includes('world'))).toBe(true);
  expect(serializeWorld(w)).toBe(before);
});
it('each historical protocol retains its recorded observation and memory meaning',()=>{
  expect(Array.from({length:10},(_,i)=>observationVersionFor(`inhabitant/${i+1}`))).toEqual([1,2,3,3,4,4,5,5,6,6]);
  expect(Array.from({length:10},(_,i)=>protocolHasMemory(`inhabitant/${i+1}`))).toEqual([false,true,false,true,false,true,false,true,false,true]);
});
