import { afterEach, expect, it } from 'vitest';
import { craftAuditWorld } from '../scripts/fixtures/craft_audit_world';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { observeInhabitant } from '../src/agent/observe';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { runLive, runReplay } from '../src/agent/run';
import { chooser } from './helpers/inhabit';
import { setExternalController } from '../src/sim/external';
afterEach(() => setExternalController(null));
function observation(w = craftAuditWorld(), version = 5) {
  const p = w.persons[0], ctx = generateOptions(w,p,true,true);
  return observeInhabitant(w,p,ctx,rankOptions(ctx),{version});
}
it('explains the actual hunger gate for a material-ready pick without mutating complete saved state', () => {
  const w = craftAuditWorld(), before = serializeWorld(w);
  const o = observation(w);
  expect(o.self.needs.hunger.state).toBe('ok');
  expect(o.options.some(o => o.key === 'craft:pick')).toBe(false);
  expect(o.setAside.find(o => o.label === 'Make a pick')?.reason).toContain('eat before starting tool work');
  expect(serializeWorld(w)).toBe(before);
  expect(observation(w,4).setAside.some(o => o.label === 'Make a pick')).toBe(false);
});
it('names thirst and both gates accurately, and does not invent material-ready work', () => {
  const w=craftAuditWorld(), p=w.persons[0];
  p.needs.hunger=95; p.needs.thirst=52;
  expect(observation(w).setAside.find(o=>o.label==='Make a pick')?.reason).toContain('drink before');
  p.needs.hunger=48;
  expect(observation(w).setAside.find(o=>o.label==='Make a pick')?.reason).toContain('eat and drink before');
  p.inv.wood=0;
  expect(observation(w).setAside.some(o=>o.label==='Make a pick')).toBe(false);
});
it('real eating restores the offered craft; real crafting spends its materials, and replay matches', async () => {
  const w=craftAuditWorld(), p=w.persons[0], initial=serializeWorld(w);
  const model=chooser('eat-then-craft',o=>{
    const craft=o.options.find(o=>o.key==='craft:pick');
    if(craft) expect(o.setAside.some(o=>o.label==='Make a pick')).toBe(false);
    return (craft ?? o.options.find(o=>o.kind==='eat') ?? o.options[0]).key;
  });
  const result=await runLive(w,p.id,model,{until:500});
  const end=result.world.persons[0];
  expect(end.inv.pick, JSON.stringify({outcomes:result.transcript.outcomes,activity:end.activity})).toBe(1); expect(end.inv.wood??0).toBe(0); expect(end.inv.stone??0).toBe(0);
  expect(result.transcript.outcomes.some(o=>o.label==='Making a pick'&&o.outcome==='success')).toBe(true);
  expect(serializeWorld(runReplay(deserializeWorld(initial),result.transcript).world)).toBe(serializeWorld(result.world));
});
