// A voluntary public alternative for an already motivated workshop; no private property is converted.
import {BUILD_DEF} from './constants';
import {addOption} from './optutil';
import type {Ctx,Option} from './optutil';
import {runsRulesVersion} from './rulesversion';
import type {BuildingType,World} from './types';
export const SHARED_TYPES:BuildingType[]=['timber_yard','quarry','kiln','smithy','granary','bakery','hall','mine','mill','brewery'];
export const hasSharedProjects=(w:World)=>w.settings.dynamics==='rich'&&runsRulesVersion(w,143);
export const mayShareType=(w:World,t:BuildingType)=>hasSharedProjects(w)&&SHARED_TYPES.includes(t);
export function addSharedProjectOption(ctx:Ctx,type:BuildingType,original:Option|undefined):void{
 const {world:w,p}=ctx;if(!mayShareType(w,type)||!original||original.key!==`plan_site:${type}`||ctx.criticals.length||ctx.night||p.traits.generosity<.55||!ctx.seenPersons.some(s=>!s.child&&!s.asleep&&Math.hypot(s.x-p.x,s.y-p.y)<=10))return;
 if(w.civicProjects?.some(q=>q.organiserId===p.id&&q.status==='active'))return;
 const bonus=2*p.traits.generosity;
 addOption(ctx,{...original,key:`plan_shared:${type}`,label:`Propose a shared ${BUILD_DEF[type].label}`,goal:`ask neighbours to share the work and use of a ${BUILD_DEF[type].label}`,util:original.util+bonus,parts:[...original.parts,['willing to share the work and its result',bonus]],make:()=>{const a=original.make?.();if(!a)return null;a.data.communal=true;a.label=`Marking out a proposed shared ${BUILD_DEF[type].label}`;a.goal=`a shared ${BUILD_DEF[type].label}; construction needs accepted support`;return a;}});
}
export function validateSharedProjects(w:World):void{
 for(const p of w.persons)for(const a of [p.activity,p.suspended])if(a?.data.communal!==undefined&&(!mayShareType(w,a.data.type)||a.kind!=='plan_site'||a.data.communal!==true||a.data.hh!==p.hhId))throw Error('Invalid shared project layout');
 for(const q of w.civicProjects??[])if(q.type!==undefined){if(!mayShareType(w,q.type))throw Error('Invalid shared project type');const physical=w.sites.find(s=>s.id===q.siteId)??w.buildings.find(b=>b.id===q.buildingId);if(physical&&(physical.type!==q.type||physical.hhId!==0))throw Error('Shared project ownership or type mismatch');}
}
