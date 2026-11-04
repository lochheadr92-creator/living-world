// Paid personal fishing gear; passive net ownership remains in capture_gear.
import {runsRulesVersion} from './rulesversion';import {TOOL_RECIPE} from './constants';
import type {Activity,Items,Person,World} from './types';
import {reservedFor} from './reserved_goods';
export const hasRods=(w:World)=>w.settings.dynamics==='rich'&&runsRulesVersion(w,140);
export function rodCraftBlock(w:World,p:Person,a:Activity):string|null{
 if(!hasRods(w))return 'fishing rods are unavailable in these rules';
 const b=w.byId.get(a.targetId);if(b?.ent!=='building'||b.condition<12||b.hhId!==0&&b.hhId!==p.hhId&&b.type!=='storehouse'&&b.type!=='fire')return 'no accessible workspace';
 const dx=Math.max(b.x-p.x,0,p.x-b.x-b.w),dy=Math.max(b.y-p.y,0,p.y-b.y-b.h);if(Math.hypot(dx,dy)>1.5)return 'must reach the workspace';
 if(!a.data.projectCraft)for(const k of ['wood','stone'] as const){const own=p.intentions.filter(i=>i.status==='active'&&i.kind==='tool'&&i.makes==='rod').reduce((n,i)=>n+(i.wants[k]??0),0);if((p.inv[k]??0)-Math.max(0,reservedFor(w,p,k)-own)<TOOL_RECIPE.rod[k])return 'materials are missing or promised elsewhere';}
 return null;
}
export function validateRods(w:World):void{
 const check=(items:Items|undefined)=>{const n=items?.rod;if(n!==undefined&&(!hasRods(w)||!Number.isSafeInteger(n)||n<0))throw Error('Invalid fishing rod holding');};
 for(const p of w.persons){check(p.inv);for(const b of Object.values(p.beliefs))check(b.items);for(const a of [p.activity,p.suspended])if(a){check(a.data.items);if(a.kind==='craft'&&a.data.tool==='rod'&&!hasRods(w))throw Error('Invalid fishing rod craft');}}
 for(const b of w.buildings){check(b.store.items);check(b.ops?.job?.held);check(b.ops?.produced);}for(const p of w.piles)check(p.items);for(const c of w.carts)check(c.load);for(const m of w.meals)check(m.table);for(const s of w.sites){check(s.delivered);check(s.used);}for(const k of ['initial','created','consumed','spoiled'] as const)check(w.ledger[k]);
 const rods=w.tools.filter(t=>t.kind==='rod');for(const t of rods)if(!hasRods(w)||t.tier!==0||!Number.isFinite(t.wear)||t.wear<0||t.wear>=100)throw Error('Invalid fishing rod');
 const containers=[...w.persons.map(p=>({id:p.id,items:p.inv})),...w.buildings.map(b=>({id:b.id,items:b.store.items})),...w.piles.map(p=>({id:p.id,items:p.items})),...w.carts.map(c=>({id:c.id,items:c.load}))];
 for(const c of containers)if((c.items.rod??0)!==rods.filter(t=>t.holder===c.id).length)throw Error('Fishing rod inventory mismatch');
 if(rods.some(t=>!containers.some(c=>c.id===t.holder)))throw Error('Fishing rod has no physical holder');
}
