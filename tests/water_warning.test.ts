import { afterEach, expect, it } from 'vitest';
import { stage, addPerson, done } from './helpers/kit';
import { DAY } from '../src/sim/constants';
import { infoLine } from '../src/sim/dialogue';
import { pickNews, tellBelief } from '../src/sim/news';
import { setWaterWarning } from '../src/sim/water_warning';
import type { Belief } from '../src/sim/types';

afterEach(() => setWaterWarning(true));
function fixture(version = 261) {
  const s = stage('water-warning'); const w = s.w;
  w.settings.dynamics = 'rich'; w.settings.rulesVersion = version; w.tick = 2000;
  const a = addPerson(s, 'Ada', 40, 40), b = addPerson(s, 'Ben', 60, 60); done(s);
  const belief: Belief = { id: 990001, kind: 'water', x: 45, y: 45, amount: 0, max: 0, seen: 1950, learned: 1950, src: 'seen', from: 0, waterSupply: 'dry' };
  a.beliefs = { [belief.id]: belief }; b.beliefs = {};
  return { w, a, b, belief };
}
it('selects fresh low or dry observations and describes their sign', () => {
  const {w,a,b,belief} = fixture();
  for (const sign of ['low','dry'] as const) { belief.waterSupply = sign; expect(pickNews(w,a,b)).toContain(belief); expect(infoLine(w,belief,a.id,b.id)).toContain(`was ${sign}`); }
});
it('does not offer old, wet, future, old-version or switched-off signs', () => {
  const {w,a,b,belief} = fixture(); belief.waterSupply='wet'; expect(pickNews(w,a,b)).toHaveLength(0);
  belief.waterSupply='dry'; belief.seen=w.tick-DAY/2; expect(pickNews(w,a,b)).toHaveLength(0);
  belief.seen=w.tick+1; expect(pickNews(w,a,b)).toHaveLength(0);
  belief.seen=w.tick; w.settings.rulesVersion=257; expect(pickNews(w,a,b)).toHaveLength(0);
  w.settings.rulesVersion=261; setWaterWarning(false); expect(pickNews(w,a,b)).toHaveLength(0);
});
it('passes the dated sign and corrects an older sight without replacing a newer one', () => {
  const {w,a,b,belief}=fixture(); b.beliefs[belief.id]={...belief,seen:1900,waterSupply:'wet'};
  expect(tellBelief(w,a,b,belief)).toBe(true); expect(b.beliefs[belief.id].waterSupply).toBe('dry');
  expect(b.beliefs[belief.id].seen).toBe(1950); expect(b.beliefs[belief.id].amount).toBe(belief.amount);
  b.beliefs[belief.id]={...belief,seen:1990,waterSupply:'wet'}; expect(tellBelief(w,a,b,belief)).toBe(false); expect(b.beliefs[belief.id].waterSupply).toBe('wet');
});
import { parseIntervention } from '../scripts/lab/lab';
it('the lab removal restores old selection and can be undone', () => {
  const {w,a,b} = fixture(); const undo = parseIntervention('rich-no-water-warning').install!();
  try { expect(pickNews(w,a,b)).toHaveLength(0); } finally { undo(); }
  expect(pickNews(w,a,b)).toHaveLength(1);
});
import { waterScene } from './helpers/water';
import { drawWater } from '../src/sim/hydrology';
import { observeShore } from '../src/sim/water_access';
import { deserializeWorld, serializeWorld } from '../src/app/save';
it('passes an actually observed dry shore through save and load', () => {
  const {w,p,s,small}=waterScene(261); const listener=addPerson(s,'Listener',60,60);
  const belief=Object.values(p.beliefs).filter(b=>b.kind==='water').sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
  expect(belief).toBeDefined(); drawWater(w,small,small.amount); observeShore(w,p);
  const observed=p.beliefs[belief.id]; expect(observed.waterSupply).toBe('dry');
  expect(tellBelief(w,p,listener,observed)).toBe(true);
  const loaded=deserializeWorld(serializeWorld(w)); const saved=loaded.persons.find(q=>q.id===listener.id)!.beliefs[belief.id];
  expect(saved.waterSupply).toBe('dry'); expect(saved.seen).toBe(observed.seen);
});
it('a newer dry observation can correct a low warning within the telling cooldown', () => {
  const {w,a,b,belief}=fixture(); belief.waterSupply='low';
  expect(tellBelief(w,a,b,belief)).toBe(true); expect(pickNews(w,a,b)).toHaveLength(0);
  w.tick+=10; belief.seen=w.tick; belief.waterSupply='dry';
  expect(pickNews(w,a,b)).toContain(belief); expect(tellBelief(w,a,b,belief)).toBe(true);
  expect(b.beliefs[belief.id].waterSupply).toBe('dry'); expect(pickNews(w,a,b)).toHaveLength(0);
});
it('does not repeatedly offer a rejected warning', () => {
  const {w,a,b,belief}=fixture(); b.beliefs[belief.id]={...belief,seen:2000,waterSupply:'wet'};
  expect(pickNews(w,a,b)).toContain(belief); expect(tellBelief(w,a,b,belief)).toBe(false);
  expect(pickNews(w,a,b)).toHaveLength(0);
});
it('a newer dry report can correct a previously told wet report', () => {
  const {w,a,b,belief}=fixture(); belief.waterSupply='wet';
  expect(tellBelief(w,a,b,belief)).toBe(true);
  w.tick+=10; belief.seen=w.tick; belief.waterSupply='dry';
  expect(pickNews(w,a,b)).toContain(belief); expect(tellBelief(w,a,b,belief)).toBe(true);
  expect(b.beliefs[belief.id].waterSupply).toBe('dry');
});
it('direct answers describe an older dry observation rather than claiming water is present', () => {
  const {w,a,b,belief}=fixture(); belief.seen=w.tick-DAY; expect(pickNews(w,a,b)).toHaveLength(0);
  expect(infoLine(w,belief,a.id,b.id)).toContain('was dry');
});
it('listener log preserves the date and sign of an older direct report', () => {
  const {w,a,b,belief}=fixture(); belief.seen=w.tick-DAY;
  expect(tellBelief(w,a,b,belief)).toBe(true);
  expect(b.log.at(-1)?.text).toContain(`was dry at tick ${belief.seen}`);
});
