import { expect, it } from 'vitest';
import { lastInhabitantSummary } from '../src/ui/inhabit_summary';
import type { InhabitantObservation } from '../src/agent/observe';
const doing: InhabitantObservation['doing'] = {
  activity:null, suspended:null, conversation:null, lastChoice:null,
  lastResult:{label:'Construction',outcome:'success',detail:'done',when:'earlier',t:900},
  lastInteraction:{purpose:'chat',outcome:'friendly chat',detail:'',when:'later',t:987},
};
it('conversation after work appears in Last without inventing its contents',()=>{
  expect(lastInhabitantSummary(doing)).toBe('chat — friendly chat');
});
it('later work supersedes a conversation; equal ticks stably prefer the work result',()=>{
  expect(lastInhabitantSummary({...doing,lastResult:{...doing.lastResult!,t:988}})).toBe('Construction — success');
  expect(lastInhabitantSummary({...doing,lastResult:{...doing.lastResult!,t:987}})).toBe('Construction — success');
});
it('missing records are handled and missing timestamps do not fabricate an order',()=>{
  expect(lastInhabitantSummary({...doing,lastResult:null})).toBe('chat — friendly chat');
  expect(lastInhabitantSummary({...doing,lastInteraction:null})).toBe('Construction — success');
  expect(lastInhabitantSummary({...doing,lastInteraction:null,lastResult:null})).toBe('');
  expect(lastInhabitantSummary({...doing,lastResult:{...doing.lastResult!,t:undefined}})).toBe('Construction — success; chat — friendly chat (order unknown)');
});
