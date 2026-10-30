// Derived personal provisioning options. Only a selected, physically started action adopts an intention.
import {DAY,NUTRITION,WORK} from './constants';
import {SOURCE_FOOD} from './food_help';
import {workWindow} from './action_scope';
import {newActivity} from './activities';
import {weightOf} from './economy';
import {carryCap} from './people';
import {collectLeaf} from './production';
import {foragePlans} from './options_survival';
import {eta,rankWaterSpots,spotNear} from './optutil';
import {hasJourneys,journeyAvailable,JOURNEY_LIMITS} from './journey_supplies';
import type {Ctx,Option} from './optutil';
import type {FoodKind,Intention,Items,SourceType} from './types';

function attach(ctx:Ctx,o:Option,work:Option,water:number,food:number):void{
 const {p,world}=ctx,e=work.scopeEstimate!;
 const j={key:work.key,label:work.label,kind:work.kind,target:work.targetId,item:e.item??null,quantity:Math.max(1,e.amount??1),water,food,expected:e.walk+e.work*(e.amount??1)};
 o.journeyFor=j;o.key=`journey:${work.key}:${o.key}`;
 o.goal=`prepare to ${work.label.toLowerCase()}`;
 o.selectionReason=`carry provisions for ${work.label.toLowerCase()}; estimated outward work trip ${Math.ceil(j.expected)} ticks; eating and drinking still take real actions`;
 const make=o.make!;
 o.make=()=>{
  const a=make();if(!a)return null;
  let i=p.intentions.find(i=>i.kind==='journey'&&i.status==='active');
  if(!i){
   i={id:world.nextId++,kind:'journey',goal:`prepare for ${work.label.toLowerCase()}`,since:world.tick,until:world.tick+2*DAY,status:'active',reason:o.selectionReason!,setAside:0,aboutId:work.targetId,wants:{},makes:'',sheltered:0,worked:0,ended:0,step:o.label,stepKind:'none',stepTarget:o.targetId,stepItem:null,stepKey:o.key,blocked:'',journey:{...j,tries:0,history:[]}} as Intention;
   p.intentions.push(i);
  }
  // Claim only this bounded private provision. Existing promises and other plans retain their claims.
  const wants:Items={water:Math.min(2,Math.floor(journeyAvailable(world,p,'water'))+water)};
  let left=2;
  for(const k of Object.keys(NUTRITION) as FoodKind[]){
   const pending=food?Number(a.data.items?.[k]??(SOURCE_FOOD[a.data.stype as SourceType]===k?a.amount:0)):0;
   const n=Math.min(left,Math.floor(journeyAvailable(world,p,k))+pending);if(n)wants[k]=n;left-=n;
  }
  i.wants=wants;
  a.data.journeyId=i.id;a.goal=o.goal;return a;
 };
}

export function journeyOptions(ctx:Ctx):void{
 const {world,p}=ctx;if(!hasJourneys(world)||ctx.stage==='child')return;
 const active=p.intentions.find(i=>i.kind==='journey'&&i.status==='active');
 const candidates=ctx.options.filter(o=>o.make&&o.need===null&&o.util>0&&o.scopeEstimate&&['gather','build','operate'].includes(o.kind)&&p.beliefs[o.targetId]&&(active?o.key===active.journey!.key:o.scopeEstimate.walk>=160)).sort((a,b)=>b.util-a.util||a.key.localeCompare(b.key)).slice(0,JOURNEY_LIMITS.candidates);
 for(const work of candidates){
  const e=work.scopeEstimate!,minimum=e.amount!==undefined?e.work:16;
  if(workWindow(ctx,work,e).work>=minimum)continue;
  let need:{water:number;food:number}|undefined;
  for(let total=1;total<=4&&!need;total++)for(let water=0;water<=2;water++){
   const food=total-water;if(food<0||food>2||workWindow(ctx,work,e,water,food).work<minimum)continue;
   // Retain space for one productive unit; use the same weight accounting as physical carrying.
   const load:Items={...p.inv,water:(p.inv.water??0)+water,berries:(p.inv.berries??0)+food};
   if(e.item)load[e.item]=(load[e.item]??0)+1;
   if(weightOf(load)>carryCap(world,p))continue;
   need={water,food};break;
  }
  if(!need)continue;
  const begin=ctx.options.length,base=Math.max(1,work.util-3);
  if(need.water){
   for(const spot of rankWaterSpots(ctx,2)){
    if(spot.e>JOURNEY_LIMITS.prepDistance||spot.dng>0||spot.trouble>0)continue;
    const amount=need.water,b=spot.b,util=base-spot.cost;
    ctx.options.push({kind:'fetch_water',label:'Fetch water for the work trip',goal:'prepare provisions',need:null,util,parts:[['useful work trip',base],['water access',-spot.cost]],eta:spot.e+amount*WORK.water,key:`fetch_water:${b.id}`,targetId:b.id,tag:'journey',bounds:[{kind:'count',field:'amount',min:1,max:amount,note:'portable water for the intended work trip'}],make:()=>{
     const sp=spotNear(world,p,b);if(!sp)return null;
     return newActivity(world,p,{kind:'fetch_water',label:'Fetching water for the work trip',goal:'prepare provisions',targetId:b.id,targetType:'tile',tx:sp.x,ty:sp.y,spotX:sp.x,spotY:sp.y,amount,utility:util,minCommit:40,maxTicks:600});
    }});
   }
  }else if(need.food){
   for(const b of Object.values(p.beliefs).filter(b=>b.kind==='building'&&b.hh===p.hhId&&eta(ctx,b.x,b.y)<=JOURNEY_LIMITS.prepDistance).sort((a,b)=>a.id-b.id)){
    const items:Items={};let left=need.food;
    for(const k of Object.keys(NUTRITION) as FoodKind[]){const n=Math.min(left,Math.floor(b.items?.[k]??0));if(n)items[k]=n;left-=n;}
    if(!left)collectLeaf(ctx,b,items,base,'provisions for the work trip','journey');
   }
   const start=ctx.options.length;
   foragePlans(ctx,{mode:'stock',urgency:base,baseLabel:'provisions for the work trip'});
   for(const o of ctx.options.splice(start)){
    if(!o.scopeEstimate||o.scopeEstimate.walk>JOURNEY_LIMITS.prepDistance)continue;
    const make=o.make!,amount=Math.min(need.food,o.scopeEstimate.amount??1);
    o.make=()=>{const a=make();if(a){a.amount=amount;a.data.purpose='stock';}return a;};
    o.bounds=[{kind:'count',field:'amount',min:1,max:amount,note:'portable food for the intended work trip'}];delete o.scopeEstimate;
    ctx.options.push(o);
   }
  }
  for(const o of ctx.options.slice(begin))attach(ctx,o,work,need.water,need.food);
  if(ctx.options.length>begin)break; // one bounded proposed purpose, no speculative forest of plans
 }
}
