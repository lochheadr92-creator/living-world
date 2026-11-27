import { drive } from '../src/sim/needs';
import { setEarlierCompany } from '../src/sim/earlier_company';
import { afterEach, expect, it } from 'vitest';
import { newActivity } from '../src/sim/activities';
import { quietCompanyStep, quietCompanyTick, QUIET_COMPANY_PER_TICK, setQuietCompany } from '../src/sim/quiet_company';
import { rebuildMobileGrid } from '../src/sim/registry';
import type { Person, World } from '../src/sim/types';
import { addPerson, done, stage } from './helpers/kit';

afterEach(() => { setQuietCompany(true); setEarlierCompany(true); });
function setup(version = 262) {
  const s = stage('quiet-company'), w = s.w; w.settings.dynamics = 'rich'; w.settings.rulesVersion = version;
  const a = addPerson(s, 'Ada', 40, 30, { age: 35 }), b = addPerson(s, 'Bo', 41, 30, { age: 34 }); done(s);
  for (const p of [a,b]) {
    p.needs.social = 50;
    const act = newActivity(w,p,{kind:'rest',label:'Rest',goal:'rest',here:true,utility:1,minCommit:1,maxTicks:200})!;
    act.phase='work'; p.activity=act; p.pose='sit';
  }
  rebuildMobileGrid(w); return {w,a,b};
}
it('credits quiet time while both people rest nearby without inventing relationship records', () => {
  const {w,a,b}=setup(); const before=JSON.stringify(a.relations); quietCompanyTick(w,a);
  expect(a.needs.social).toBeCloseTo(50+QUIET_COMPANY_PER_TICK); expect(JSON.stringify(a.relations)).toBe(before); expect(b.needs.social).toBe(50);
});
it('does not credit people across walls, distant people, sleeping people, or travelling activities', () => {
  const {w,a,b}=setup(); b.indoors=123; quietCompanyTick(w,a); expect(a.needs.social).toBe(50);
  delete b.indoors; b.x=50; rebuildMobileGrid(w); quietCompanyTick(w,a); expect(a.needs.social).toBe(50);
  b.x=41; rebuildMobileGrid(w); b.pose='sleep'; quietCompanyTick(w,a); expect(a.needs.social).toBe(50);
  b.pose='sit'; b.activity!.phase='travel'; quietCompanyTick(w,a); expect(a.needs.social).toBe(50);
});
it('leaves previous versions and disabled experiments untouched', () => {
  const x=setup(257); quietCompanyTick(x.w,x.a); expect(x.a.needs.social).toBe(50);
  const y=setup(); setQuietCompany(false); quietCompanyTick(y.w,y.a); expect(y.a.needs.social).toBe(50);
});

it('applies quiet company through a world tick when both activities remain in progress', async () => {
  const on=setup(), off=setup();
  for (const v of [on,off]) for (const p of [v.a,v.b]) { p.needs.energy=50; p.nextThink=v.w.tick+1000; p.activity!.duration=100; }
  const {stepWorld}=await import('../src/sim/world');
  setQuietCompany(false); stepWorld(off.w); setQuietCompany(true); stepWorld(on.w);
  expect(on.a.activity?.kind).toBe('rest'); expect(on.b.activity?.kind).toBe('rest');
  expect(on.a.needs.social-off.a.needs.social).toBeCloseTo(QUIET_COMPANY_PER_TICK);
});

it('includes stored meals and blocked waiting, but excludes solitary and authored-world activity', () => {
  const v=setup(); v.a.activity!.kind='eat_store'; v.b.activity!.kind='warm';
  quietCompanyTick(v.w,v.a); expect(v.a.needs.social).toBeCloseTo(50+QUIET_COMPANY_PER_TICK);
  v.a.needs.social=50; v.b.activity!.blocked='waiting for materials'; quietCompanyTick(v.w,v.a); expect(v.a.needs.social).toBeCloseTo(50+QUIET_COMPANY_PER_TICK);
  v.a.needs.social=50; v.b.activity=null; quietCompanyTick(v.w,v.a); expect(v.a.needs.social).toBeCloseTo(50+QUIET_COMPANY_PER_TICK);
  v.a.needs.social=50; v.b.alive=false; quietCompanyTick(v.w,v.a); expect(v.a.needs.social).toBe(50);
  v.b.alive=true; v.w.settings.dynamics='authored'; quietCompanyTick(v.w,v.a); expect(v.a.needs.social).toBe(50);
});

it('uses positions after movement even when the ordinary mobile grid has stale cells', () => {
  const {w,a,b}=setup(); b.x=48; rebuildMobileGrid(w); b.x=42;
  quietCompanyStep(w);
  expect(a.needs.social).toBeCloseTo(50+QUIET_COMPANY_PER_TICK);
  expect(b.needs.social).toBeCloseTo(50+QUIET_COMPANY_PER_TICK);
  b.x=60; quietCompanyStep(w);
  expect(a.needs.social).toBeCloseTo(50+QUIET_COMPANY_PER_TICK);
});

it('offers an independently switched earlier social urge only in the experimental version', () => {
  const {w}=setup(263); expect(drive(55, 'social', w)).toBeGreaterThan(0);
  expect(drive(55, 'hunger', w)).toBe(drive(55, 'hunger'));
  setEarlierCompany(false); expect(drive(55, 'social', w)).toBe(0);
  setEarlierCompany(true); w.settings.rulesVersion=262; expect(drive(55, 'social', w)).toBe(0);
  w.settings.rulesVersion=263; w.settings.dynamics='authored'; expect(drive(55, 'social', w)).toBe(0);
});
