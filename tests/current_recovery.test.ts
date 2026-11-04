import {expect,it} from 'vitest';
import {currentNatural,currentSettings,currentStage} from './helpers/current';
import {addPerson,done} from './helpers/kit';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {describePerson} from '../src/sim/inspect';
import {correctedRouteScene} from './helpers/resolved_route';
import {canObtain} from '../src/sim/social';
it('explicit current fixtures use the product rules without silently moving historic fixtures',()=>{
 for(const profile of ['normal','large','huge','town'] as const){const s=currentSettings('recovery',profile);expect(s.rulesVersion).toBe(CURRENT_RULES_VERSION);expect(s.dynamics).toBe('rich');expect(s.immigration).toBe(true);}
 const s=currentStage('current-stage');const p=addPerson(s,'Ada',40,40);done(s);expect(s.w.settings.rulesVersion).toBe(CURRENT_RULES_VERSION);expect(generateOptions(s.w,p,true,true).options.length).toBeGreaterThan(0);
});
it('current product worlds continue exactly through ordinary decisions and pure observation',()=>{
 const w=currentNatural('river');for(let i=0;i<1200;i++)stepWorld(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw),p=w.persons.find(p=>p.alive)!;
 const ctx=generateOptions(w,p,true,true);rankOptions(ctx);describePerson(w,p.id);expect(serializeWorld(w)).toBe(raw);
 for(let i=0;i<600;i++){stepWorld(w);stepWorld(copy);}expect(serializeWorld(w)).toBe(serializeWorld(copy));expect(conservationReport(w).ok).toBe(true);expect(w.persons.some(p=>p.lastResult)).toBe(true);
});
it('current specific route learning corrects a real failed journey without a blanket place penalty',()=>{
 const {w,p,tree}=correctedRouteScene(CURRENT_RULES_VERSION);expect(p.failures[tree.id].resolved).toBe(true);expect(p.failures[tree.id].route?.events.map(e=>e.outcome)).toEqual(['failed','arrived']);expect(canObtain(w,p,'wood')).toBe(true);expect(conservationReport(w).ok).toBe(true);
 const raw=serializeWorld(w),ctx=generateOptions(w,p,true,true);rankOptions(ctx);describePerson(w,p.id);expect(serializeWorld(w)).toBe(raw);
});
