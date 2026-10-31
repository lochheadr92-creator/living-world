import {afterEach,expect,it} from 'vitest';
import {checkedAccountsScene} from './helpers/checked_accounts';
import {accountsExperience,checkableAccount,setCheckedAccounts} from '../src/sim/checked_accounts';
import {generateOptions} from '../src/sim/decision';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {describePerson} from '../src/sim/inspect';
import {relationshipHistory} from '../src/sim/history';
import {observe} from '../src/sim/knowledge';
import {tellBelief} from '../src/sim/news';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
import {DAY} from '../src/sim/constants';
import type {Belief} from '../src/sim/types';
afterEach(()=>setCheckedAccounts(true));
// what she lacks a lead for after the check is wood (no home, fewer than two trees known): the question the engine offers of its own accord
const ask=(f:ReturnType<typeof checkedAccountsScene>,who:'Ben'|'Cara')=>generateOptions(f.w,f.ada,true,true).options.find(o=>o.label===`Ask ${who} where to find wood`);
it('a first-hand account found bare on the spot is held to its teller, once, with a dated note, and changes whom she asks next',()=>{
 const f=checkedAccountsScene();expect(f.ada.beliefs[f.bush.id]).toMatchObject({src:'told',from:f.ben.id,hops:1,amount:6});
 const trust=f.ada.relations[f.ben.id].trust;f.goCheck();
 expect(f.ada.relations[f.ben.id].accounts).toMatchObject({checked:1,borneOut:0,last:{id:f.bush.id,kind:'berry_bush',described:6,borneOut:false,toldAt:0}});expect(f.ada.relations[f.ben.id].accounts!.last.found).toBeLessThanOrEqual(1); // the bush regrows a little while she walks
 expect(f.ada.relations[f.ben.id].trust).toBe(trust-3);expect(f.ada.log.filter(l=>/Ben's account of the berry bush \(about 6, told 0\.\d days ago from their own sight\) was not borne out: (it was bare|1 there)\. 0 of 1/.test(l.text)).length).toBe(1);
 expect(f.cara.relations[f.ben.id]?.accounts).toBeUndefined();expect(f.ben.relations[f.ada.id]?.accounts).toBeUndefined();
 // seeing it again is the same grounds, not new ones
 observe(f.w,f.ada,f.bush);expect(f.ada.relations[f.ben.id].accounts!.checked).toBe(1);expect(f.ada.relations[f.ben.id].trust).toBe(trust-3);
 const before=serializeWorld(f.w),b=ask(f,'Ben'),c=ask(f,'Cara');describePerson(f.w,f.ada.id);expect(serializeWorld(f.w)).toBe(before);
 expect(b&&c&&c.util-b.util).toBeCloseTo(4,5);expect(b!.parts.some(([n,v])=>/0 of 1 of their accounts of places was borne out when I checked \(last: the berry bush, tick \d+\)/.test(n)&&v===-4)).toBe(true);
 expect(relationshipHistory(f.w,f.ada).some(r=>/^Accounts of places checked: 1, borne out 0\. Last: the berry bush #\d+ described as about 6 \(told at tick 0\), (bare|1 there) at tick \d+ against about 6(\.\d)? expected: not borne out\./.test(r))).toBe(true);
 // below 107, and with the lab removal, nothing is held and the two are asked alike
 setCheckedAccounts(false);const b2=ask(f,'Ben'),c2=ask(f,'Cara');expect(b2!.util).toBeCloseTo(c2!.util,5);setCheckedAccounts(true);
 const legacy=checkedAccountsScene(106);legacy.goCheck();expect(legacy.ada.relations[legacy.ben.id].accounts).toBeUndefined();expect(legacy.ada.relations[legacy.ben.id].trust).toBe(10);expect(ask(legacy,'Ben')!.util).toBeCloseTo(ask(legacy,'Cara')!.util,5);
});
it('an account borne out counts for its teller; relayed, stale and late checks are no grounds',()=>{
 const f=checkedAccountsScene(107,false);f.goCheck();
 expect(f.ada.relations[f.ben.id].accounts).toMatchObject({checked:1,borneOut:1,last:{found:6,borneOut:true}});expect(f.ada.relations[f.ben.id].trust).toBe(11);
 expect(accountsExperience(f.w,f.ada,f.ben.id)).toMatchObject({bonus:4});expect(accountsExperience(f.w,f.ada,f.cara.id).bonus).toBe(0);
 const told:Belief={...f.ben.beliefs[f.bush.id],src:'told',from:f.ben.id,learned:f.w.tick,hops:1};
 expect(checkableAccount(f.w,told)).toBe(true);
 expect(checkableAccount(f.w,{...told,hops:2})).toBe(false);
 expect(checkableAccount(f.w,{...told,seen:told.learned-DAY-1})).toBe(false);
 expect(checkableAccount(f.w,{...told,learned:f.w.tick-2*DAY-1})).toBe(false);
 expect(checkableAccount(f.w,{...told,amount:1})).toBe(false);
 // a relayed account: Cara passes on what Ben told her; found short, it is logged and held against nobody
 const g=checkedAccountsScene();if(!tellBelief(g.w,g.ben,g.cara,g.ben.beliefs[g.bush.id]))throw new Error('Not told');
 g.ada.beliefs={};g.ada.bykind={};if(!tellBelief(g.w,g.cara,g.ada,g.cara.beliefs[g.bush.id]))throw new Error('Not relayed');expect(g.ada.beliefs[g.bush.id].hops).toBe(2);
 g.goCheck();expect(g.ada.relations[g.cara.id]?.accounts).toBeUndefined();expect(g.ada.relations[g.ben.id]?.accounts).toBeUndefined();
 expect(g.ada.log.some(l=>/What Cara passed on from somebody else about the berry bush \(about 6\) was not borne out: (it was bare|1 there)\. I hold it against nobody\./.test(l.text))).toBe(true);
});
it('a newer differing account of a place she saw herself is adopted and the disagreement logged; saves are exact and refused below 107',()=>{
 const f=checkedAccountsScene();f.goCheck();f.goHome();
 for(let n=0;n<1000;n++)stepWorld(f.w);if((f.bush.amount)<3)throw new Error('Bush did not regrow: '+f.bush.amount);observe(f.w,f.cara,f.bush); // the bush regrows at its ordinary ledgered rate; Cara's later sight of it is declared
 expect(tellBelief(f.w,f.cara,f.ada,f.cara.beliefs[f.bush.id])).toBe(true);
 expect(f.ada.beliefs[f.bush.id]).toMatchObject({src:'told',from:f.cara.id,amount:f.bush.amount});
 expect(f.ada.log.some(l=>/Cara says the berry bush holds about [3-6]; I remembered about [01] when I saw it myself at tick \d+\. Theirs is the newer sight/.test(l.text))).toBe(true);
 const text=serializeWorld(f.w);expect(serializeWorld(deserializeWorld(text))).toBe(text);
 const older=JSON.parse(text) as {world:{settings:Record<string,unknown>}};older.world.settings.rulesVersion=106;expect(()=>deserializeWorld(JSON.stringify(older))).toThrow(/checked accounts/);
 const twin=deserializeWorld(text);f.ada.cooldowns.pause=0;twin.persons.find(p=>p.id===f.ada.id)!.cooldowns.pause=0;
 for(let n=0;n<400;n++){stepWorld(f.w);stepWorld(twin);}expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
});
