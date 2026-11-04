// Observer-only, bounded snapshot taken before death cleanup. Never read by decisions.
import {ALL_ITEMS} from './constants';
import {runsRulesVersion} from './rulesversion';
import type {Items,Needs,Person,World} from './types';
export interface FinalAccount {needs:Needs;pack:Items;doing:string;why:string;attempt:string;blocked:string[];memories:string[];water?:{x:number;y:number;distance:number;seen:number};}
export const hasFinalAccounts=(w:World)=>w.settings.dynamics==='rich'&&runsRulesVersion(w,144);
const short=(s:string)=>s.slice(0,500);
export function captureFinalAccount(w:World,p:Person):FinalAccount|undefined{
 if(!hasFinalAccounts(w)||!p.alive)return;
 const water=Object.values(p.beliefs).filter(b=>b.kind==='water').sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y)||a.id-b.id)[0];
 return {needs:{...p.needs},pack:{...p.inv},doing:short(p.activity?.label??'Between activities'),why:short(p.activity?.goal??p.lastDecision?.because??''),attempt:short(p.lastResult?`${p.lastResult.label}: ${p.lastResult.outcome}; ${p.lastResult.detail}`:''),blocked:(p.lastDecision?.blocked??[]).slice(0,3).map(o=>short(`${o.label}: ${o.blocked??'unavailable'}`)),memories:p.log.slice(-3).map(l=>short(`Tick ${l.tick}: ${l.text}`)),...(water?{water:{x:water.x,y:water.y,distance:Math.hypot(water.x-p.x,water.y-p.y),seen:water.seen}}:{})};
}
export function trimFinalAccounts(w:World):void{let n=0;for(let i=w.deceased.length-1;i>=0;i--)if(w.deceased[i].last&&++n>40)delete w.deceased[i].last;}
export function validateFinalAccounts(w:World):void{
 let n=0;for(const d of w.deceased){const a=d.last;if(!a)continue;n++;
 const text=(s:unknown)=>typeof s==='string'&&s.length<=500;
 if(!hasFinalAccounts(w)||!a.needs||!a.pack||!['hunger','thirst','energy','warmth','safety','social'].every(k=>Number.isFinite(a.needs[k as keyof Needs]))||![a.doing,a.why,a.attempt].every(text)||!Array.isArray(a.blocked)||a.blocked.length>3||!a.blocked.every(text)||!Array.isArray(a.memories)||a.memories.length>3||!a.memories.every(text))throw Error('Invalid final account');
 for(const [k,v] of Object.entries(a.pack))if(!(ALL_ITEMS as readonly string[]).includes(k)||!Number.isFinite(v)||v<0)throw Error('Invalid final account pack');
 // A founder's water memory can predate the world (worldgen.ts dates pre-start knowledge before tick 0).
 const b=a.water;if(b&&(!Number.isFinite(b.x)||!Number.isFinite(b.y)||b.x<0||b.y<0||b.x>=w.W||b.y>=w.H||!Number.isFinite(b.distance)||b.distance<0||!Number.isSafeInteger(b.seen)||b.seen>d.tick))throw Error('Invalid final account water');
 }if(n>40)throw Error('Too many final accounts');
}
