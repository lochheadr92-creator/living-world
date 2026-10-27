import {afterEach, expect, it} from 'vitest';
import {createWorld} from '../src/sim/factory';
import {freshRunSettings} from '../src/sim/profiles';
import {personalWorkTaste, setWorkTastes, tiltWorkChoices} from '../src/sim/temperament';
import {generateOptions, rankOptions} from '../src/sim/decision';
import {makeCtx, type Option} from '../src/sim/optutil';
import {serializeWorld, deserializeWorld} from '../src/app/save';
import {hashWorld, stepWorld} from '../src/sim/world';
import {run} from './helpers/util';
import {parseIntervention} from '../scripts/lab/lab';
const make=(seed='taste')=>createWorld(freshRunSettings('rich','normal',seed,{immigration:false}));
const option=(kind:Option['kind'], util=20):Option=>({kind,label:kind,goal:kind,need:null,util,parts:[],eta:10,key:kind,targetId:0,make:()=>null});
afterEach(()=>setWorkTastes(true));
it('installs the lab ablation without changing saved settings and restores the prior switch',()=>{
 const w=make(), before=serializeWorld(w), intervention=parseIntervention('rich-no-work-tastes');
 expect(personalWorkTaste(w,w.persons[0])).not.toBeNull();
 const restore=intervention.install!();
 try { intervention.apply!(w); expect(personalWorkTaste(w,w.persons[0])).toBeNull(); expect(serializeWorld(w)).toBe(before); }
 finally { restore(); }
 expect(personalWorkTaste(w,w.persons[0])).not.toBeNull();
 setWorkTastes(false);const restoreOff=intervention.install!();restoreOff();
 expect(personalWorkTaste(w,w.persons[0])).toBeNull();
});
it('has stable distinct tastes independent of skills and traits, without state or RNG writes',()=>{
 const w=make(), before=serializeWorld(w);
 const tastes=w.persons.map(p=>personalWorkTaste(w,p));
 expect(new Set(tastes.map(t=>JSON.stringify(t))).size).toBeGreaterThan(3);
 expect(tastes.every(t=>t && t.like!==t.dislike)).toBe(true);
 expect(serializeWorld(w)).toBe(before);
 const p=w.persons[0], t=personalWorkTaste(w,p); p.traits={...w.persons[1].traits}; p.skills={...w.persons[1].skills};
 expect(personalWorkTaste(w,p)).toEqual(t);
 expect(personalWorkTaste(w,deserializeWorld(serializeWorld(w)).persons[0])).toEqual(t);
});
it('changes a close real ranking and explains it, but never promotes work above survival',()=>{
 const w=make(); const p=w.persons.find(p=>personalWorkTaste(w,p)?.like==='craft')!;
 expect(p).toBeDefined(); p.needs={hunger:100,thirst:100,energy:100,warmth:100,safety:100,social:100};
 p.intentions=[]; p.trade=null; p.goal=undefined;
 const ctx=makeCtx(w,p,false,true); const craft=option('craft'), build=option('build');
 // Fix the underlying ranked scores, including their deterministic tie draw, so build narrowly leads.
 ctx.options=[build,craft]; setWorkTastes(false);
 for(let u=20;u<=22;u+=0.1){build.util=u;if(rankOptions(ctx)[0].kind==='build')break;}
 expect(rankOptions(ctx)[0].kind).toBe('build'); setWorkTastes(true);
 expect(rankOptions(ctx)[0].kind).toBe('craft'); expect(rankOptions(ctx)[0].workTasteReason).toContain('enjoy');
 const food={...option('eat',100),need:'hunger' as const}; ctx.options.push(food);
 expect(rankOptions(ctx)[0].kind).toBe('eat');
 ctx.criticals=['hunger']; expect(rankOptions(ctx).map(o=>o.kind)).toEqual(['eat']);
});
it('preserves the maximum work score and all non-work scores, including ties',()=>{
 const w=make(), p=w.persons[0];
 const rows=[{o:option('craft'),s:19},{o:option('build'),s:20},{o:option('till'),s:20},{o:{...option('eat'),need:'hunger' as const},s:20.1},{o:option('wander'),s:6}];
 tiltWorkChoices(w,p,rows);
 expect(Math.max(...rows.slice(0,3).map(x=>x.s))).toBe(20);
 expect(rows.slice(3).map(x=>x.s)).toEqual([20.1,6]);
});
it('leaves versions 28 to 30 and authored worlds exactly unchanged with the ablation',()=>{
 for(const old of [{rulesVersion:28},{rulesVersion:29},{rulesVersion:30},{dynamics:'authored' as const}]){
  const settings={...freshRunSettings('rich','normal','old-taste',{immigration:false}),...old};
  setWorkTastes(true);const a=createWorld(settings);run(a,600);
  expect(personalWorkTaste(a,a.persons[0])).toBeNull();
  setWorkTastes(false);const b=createWorld(settings);run(b,600);
  expect(serializeWorld(a)).toBe(serializeWorld(b));
 }
});
it('continues deterministically through saving during ordinary work and observers are pure',()=>{
 const a=make('river'), b=make('river');run(a,800);run(b,800);
 expect(hashWorld(a)).toBe(hashWorld(b));
 const before=serializeWorld(a); for(const p of a.persons)rankOptions(generateOptions(a,p,true,true));
 expect(serializeWorld(a)).toBe(before);
 const c=deserializeWorld(before);run(a,400);run(c,400);expect(hashWorld(c)).toBe(hashWorld(a));
 expect(c.persons.map(p=>personalWorkTaste(c,p))).toEqual(a.persons.map(p=>personalWorkTaste(a,p)));
});
it('changes Sven’s actual ordinary-world choice, with a recorded reason rather than an assigned job',()=>{
 const a=make('meadow');run(a,105);
 const on=a.persons.find(p=>p.id===1000)!;
 expect(on.name).toBe('Sven');expect(on.activity?.kind).toBe('till');
 expect(on.lastDecision?.because).toContain('I enjoy farming');
 setWorkTastes(false);const b=make('meadow');run(b,105);
 expect(b.persons.find(p=>p.id===1000)?.activity?.kind).toBe('gather');
});
