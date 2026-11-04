// STAGED contract for rules 152: a household's cool store comes after its proper home.
// Ordinary bisection evidence for why: survival_evidence/ordinary-acquisition-20261104/README.md.
import {it,expect} from 'vitest';
import {stage,addPerson,building,done,learn} from './helpers/kit';
import {makeSource} from '../src/sim/sources';
import {cellarDemand} from '../src/sim/cellars';
import {generateOptions} from '../src/sim/decision';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';

function household(rules:number,homeType:'lean_to'|'hut'){
 const s=stage('cellar-home-order');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:rules};
 const p=addPerson(s,'Ada',40.5,30.5,{hunger:95,thirst:95,energy:95,traits:{diligence:0.9}});
 addPerson(s,'Ben',41.5,30.5,{hh:p.hhId,hunger:95,thirst:95,energy:95});
 const home=building(s,homeType,38,27,p.hhId,{berries:14});
 s.w.households.find(h=>h.id===p.hhId)!.homeId=home.id;
 const known=[home,makeSource(s.w,'tree',44,33,12),makeSource(s.w,'tree',45,34,12),makeSource(s.w,'tree',46,33,12),makeSource(s.w,'rock',36,33,12)];
 done(s);learn(s.w,p,...known);s.w.tick=1600;
 return {w:s.w,p,home};
}
const layouts=(f:ReturnType<typeof household>)=>generateOptions(f.w,f.p,true,true).options.filter(o=>o.key.startsWith('plan_site:')).map(o=>o.key);

it('defers a cellar until the household has a proper home from rules 152',()=>{
 const leanTo=household(152,'lean_to'),hut=household(152,'hut');
 expect(cellarDemand(generateOptions(leanTo.w,leanTo.p,true,true))).toBe(0);
 expect(cellarDemand(generateOptions(hut.w,hut.p,true,true))).toBeGreaterThan(0);
});

it('keeps rules 151 and earlier offering a cellar from a lean-to',()=>{
 const old=household(151,'lean_to');
 expect(cellarDemand(generateOptions(old.w,old.p,true,true))).toBeGreaterThan(0);
 expect(layouts(old)).toEqual(expect.arrayContaining(['plan_site:hut','plan_site:cellar']));
});

it('offers the hut, not a cellar, to a provisioned lean-to household, without changing the world',()=>{
 const f=household(152,'lean_to'),before=serializeWorld(f.w);
 const keys=layouts(f);
 expect(keys).toContain('plan_site:hut');expect(keys).not.toContain('plan_site:cellar');
 expect(serializeWorld(f.w)).toBe(before);
 const hut=household(152,'hut');expect(layouts(hut)).toContain('plan_site:cellar');
});

it('continues a rules-152 household exactly after saving and conserves goods',()=>{
 const f=household(152,'lean_to'),copy=deserializeWorld(serializeWorld(f.w));
 for(let i=0;i<600;i++){stepWorld(f.w);stepWorld(copy);}
 expect(serializeWorld(f.w)).toBe(serializeWorld(copy));expect(conservationReport(f.w).ok).toBe(true);
 expect(f.w.sites.some(s=>s.type==='cellar')).toBe(false);
});
