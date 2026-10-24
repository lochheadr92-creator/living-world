// Personally heard opportunities and voluntary physical journeys. Never reads viewer economic totals.
import type { Person, World, ItemKind, Items, Activity, Request } from './types';
import type { Ctx } from './optutil';
import { addOption } from './optutil';
import { newActivity, registerHandler } from './activities';
import { runsRulesVersion } from './rulesversion';
import { DAY, ALL_ITEMS } from './constants';
import { addLog } from './events';
import { roomFor } from './economy';
import { carryCap } from './people';
import { hyp } from './util';

export interface TradeLead { personId:number; name:string; townshipId:number; x:number; y:number; tick:number; goods:Items }
export interface ExchangeReceipt { journeyId:number; requestId:number; tick:number; fromTown:number; toTown:number; buyer:number; seller:number; item:ItemKind; amount:number; offer:ItemKind; offerAmount:number }
export interface ExchangeJourney {
 id:number; started:number; ended?:number; fromTown:number; lead:TradeLead;
 item:ItemKind; amount:number; offer:ItemKind; offerAmount:number;
 status:'travelling'|'talking'|'fulfilled'|'failed'; outcome:string; requestId?:number;
}
let enabled=true;
export const exchangeJourneysOn=():boolean=>enabled;
export function setExchangeJourneys(on:boolean):void {enabled=on;}
export const hasExchangeJourneys=(w:World):boolean=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,22);
const town=(w:World,p:Person):number=>w.households.find(h=>h.id===p.hhId)?.townshipId??0;
const current=(p:Person)=>p.exchangeJourneys?.find(j=>j.status==='travelling'||j.status==='talking');

/** Called only when this speaker actually reaches the news phase, using their own surplus. */
export function tellTradeLead(w:World,speaker:Person,listener:Person,goods:Items):void {
 if(!hasExchangeJourneys(w)||(speaker.indoors??0)!==(listener.indoors??0)||hyp(speaker.x-listener.x,speaker.y-listener.y)>4)return;
 const t=town(w,speaker);if(!t||t===town(w,listener)||!Object.keys(goods).length)return;
 const leads=listener.tradeLeads??=[];
 const old=leads.findIndex(l=>l.personId===speaker.id);if(old>=0)leads.splice(old,1);
 leads.push({personId:speaker.id,name:speaker.name,townshipId:t,x:speaker.x,y:speaker.y,tick:w.tick,goods:{...goods}});
 if(leads.length>12)leads.shift();
 addLog(w,listener,'social',`${speaker.name} described spare ${Object.keys(goods).join(', ')} from their township here. This is a remembered meeting place, not a promise to wait.`);
}
function conclude(w:World,p:Person,j:ExchangeJourney,ok:boolean,reason:string):void {
 if(j.status==='fulfilled'||j.status==='failed')return;
 j.status=ok?'fulfilled':'failed';j.ended=w.tick;j.outcome=reason;
 if(ok&&j.requestId){
  const seller=w.byId.get(j.lead.personId),toTown=seller?.ent==='person'?town(w,seller):0;
  const fromTown=town(w,p);
  if(fromTown&&toTown&&fromTown!==toTown){const receipts=w.exchangeReceipts??=[];receipts.push({journeyId:j.id,requestId:j.requestId,tick:w.tick,fromTown,toTown,buyer:p.id,seller:j.lead.personId,item:j.item,amount:j.amount,offer:j.offer,offerAmount:j.offerAmount});if(receipts.length>128)receipts.shift();}
 }
 p.cooldowns['exchange:'+j.lead.personId]=w.tick+DAY;
 addLog(w,p,'social',`Exchange journey #${j.id}: ${reason}.`);
}
export function endExchangeTalk(w:World,p:Person,id:number|undefined,request:Request|undefined,reason:string):void {
 if(!id)return;const j=p.exchangeJourneys?.find(j=>j.id===id);if(!j||j.status==='fulfilled'||j.status==='failed')return;
 j.requestId=request?.id;
 // A swap already completed remains a fulfilled journey even if the later chat is cut short.
 conclude(w,p,j,request?.status==='fulfilled',request?.status==='fulfilled'?request.note:request?.note||reason);
}
export function endExchangeApproach(w:World,p:Person,a:Activity,reason:string):void {
 const id=a.data.conv?.exchangeJourney as number|undefined;
 endExchangeTalk(w,p,id,undefined,reason);
}
export function exchangeJourneyOptions(ctx:Ctx,want:{item:ItemKind;n:number},offer:{item:ItemKind;n:number}):void {
 const {world:w,p}=ctx;
 if(!hasExchangeJourneys(w)||current(p)||ctx.critical||ctx.night||ctx.stage==='child'||ctx.stage==='youth'||ctx.dependents.length)return;
 for(const l of p.tradeLeads??[]){
  const distance=hyp(l.x-p.x,l.y-p.y),amount=Math.min(want.n,l.goods[want.item]??0),pay=Math.min(offer.n,amount+1);
  if(w.tick-l.tick>DAY*2||l.townshipId===town(w,p)||distance<12||distance>50||amount<=0||pay<=0||(p.cooldowns['exchange:'+l.personId]??0)>w.tick)continue;
  if(ctx.seenPersons.some(s=>s.id===l.personId)||roomFor(p.inv,carryCap(w,p),want.item)<amount)continue;
  const travel=distance/Math.max(.03,ctx.speed);
  // No guaranteed delivery: enough personal provisions for a bounded trip, ordinary survival remains active.
  if(ctx.food<2||ctx.water<2||ctx.drives.hunger>25||ctx.drives.thirst>25||ctx.drives.energy>25)continue;
  const util=24-Math.min(12,travel/80);
  addOption(ctx,{kind:'exchange_journey',key:`exchange:${l.personId}:${want.item}:${offer.item}`,label:`Seek ${l.name} to swap ${offer.item} for ${want.item}`,goal:`a remembered source of ${want.item} for my household`,need:null,util,parts:[['a personally heard source of needed goods',24],['journey',util-24]],eta:travel+160,targetId:0,tag:'trade',
   make:()=>{
    const j:ExchangeJourney={id:w.nextId++,started:w.tick,fromTown:town(w,p),lead:{...l,goods:{...l.goods}},item:want.item,amount,offer:offer.item,offerAmount:pay,status:'travelling',outcome:'carrying an offer to the remembered meeting place; no agreement yet'};
    const history=p.exchangeJourneys??=[];history.push(j);if(history.length>8)history.shift();
    return newActivity(w,p,{kind:'exchange_journey',label:`Seeking ${l.name} for a swap`,goal:`offer ${pay} ${offer.item} for ${amount} ${want.item}`,tx:l.x,ty:l.y,spotX:l.x,spotY:l.y,maxTicks:DAY,minCommit:60,utility:util,data:{exchangeJourney:j.id,sticky:true}});
   }});
 }
}
registerHandler('exchange_journey',{
 availability:.5,pose:()=> 'stand',
 work(w,p,a){
  const j=p.exchangeJourneys?.find(j=>j.id===a.data.exchangeJourney);
  if(!j||!hasExchangeJourneys(w))return 'fail:the exchange journey is unavailable';
  const seen=p.seen.find(s=>s.id===j.lead.personId);
  const q=seen?w.byId.get(seen.id):undefined;
  if(!seen||q?.ent!=='person'||!q.alive||(q.indoors??0)!==(p.indoors??0)||hyp(seen.x-p.x,seen.y-p.y)>4)return 'fail:the counterparty was not at the remembered meeting place';
  if((p.inv[j.offer]??0)<j.offerAmount)return 'fail:the carried offer is no longer available';
  // Hand off to the existing co-present, timed conversation and barter authority.
  j.status='talking';j.outcome='arrived; asking whether the counterparty accepts the swap';
  a.kind='socialize';a.targetId=q.id;a.targetType='person';a.data={purpose:'trade',conv:{item:j.item,amount:j.amount,offer:j.offer,offerAmount:j.offerAmount,exchangeJourney:j.id}};
  return 'continue';
 },
 onEnd(w,p,a,outcome,detail){const j=p.exchangeJourneys?.find(j=>j.id===a.data.exchangeJourney);if(j)conclude(w,p,j,false,detail||outcome);},
});
export function exchangeHistory(w:World,p:Person):string[]{
 return [
  ...(p.tradeLeads??[]).slice(-3).map(l=>`Heard from ${l.name} at tick ${l.tick}: spare ${Object.entries(l.goods).map(([k,n])=>`${n} ${k}`).join(', ')}; last meeting ${l.x.toFixed(0)}, ${l.y.toFixed(0)}. They may have moved or used these goods.`),
  ...(p.exchangeJourneys??[]).slice(-3).map(j=>`Exchange journey #${j.id} to ${j.lead.name}: ${j.status}; ${j.offerAmount} ${j.offer} for ${j.amount} ${j.item}. ${j.outcome}${j.requestId?`; request #${j.requestId}`:''}.`),
 ];
}
export function exchangeTownHistory(w:World,townshipId:number):string[]{
 const rows:string[]=[];
 const groups=new Map<number,ExchangeReceipt[]>();
 for(const r of w.exchangeReceipts??[]){if(r.fromTown!==townshipId&&r.toTown!==townshipId)continue;const other=r.fromTown===townshipId?r.toTown:r.fromTown;const group=groups.get(other)??[];group.push(r);groups.set(other,group);}
 for(const [id,rs] of groups){const received:Items={},given:Items={};for(const r of rs){const incoming=r.fromTown===townshipId?r.item:r.offer,outgoing=r.fromTown===townshipId?r.offer:r.item;received[incoming]=(received[incoming]??0)+(r.fromTown===townshipId?r.amount:r.offerAmount);given[outgoing]=(given[outgoing]??0)+(r.fromTown===townshipId?r.offerAmount:r.amount);}
 const words=(v:Items)=>Object.entries(v).map(([k,n])=>`${n} ${k}`).join(', ');
 rows.push(`${rs.length>1?'Recurring exchange':'Completed exchange'} with ${w.townships?.find(t=>t.id===id)?.name??'recorded township'}: ${rs.length} retained journey receipts; received ${words(received)}, gave ${words(given)}. Last tick ${rs.at(-1)!.tick}. This is exchange evidence, not proof of dependence.`);}
 return rows;
}
export function validateExchangeJourneys(w:World):void {
 const finite=(n:number)=>Number.isFinite(n)&&n>=0;
 const lead=(l:TradeLead)=>l&&finite(l.personId)&&finite(l.tick)&&finite(l.x)&&finite(l.y)&&l.x<w.W&&l.y<w.H&&typeof l.name==='string'&&w.townships?.some(t=>t.id===l.townshipId)&&Object.entries(l.goods).every(([k,n])=>ALL_ITEMS.includes(k as ItemKind)&&finite(n)&&n>0);
 if(w.exchangeReceipts&&(!runsRulesVersion(w,22)||w.exchangeReceipts.length>128||w.exchangeReceipts.some(r=>!Number.isFinite(r.tick)||r.amount<=0||!Number.isFinite(r.amount)||r.offerAmount<=0||!Number.isFinite(r.offerAmount)||!ALL_ITEMS.includes(r.item)||!ALL_ITEMS.includes(r.offer)||!w.townships?.some(t=>t.id===r.fromTown)||!w.townships?.some(t=>t.id===r.toTown))))throw new Error('Invalid exchange receipts');
 for(const p of w.persons){
  if(!p.tradeLeads&&!p.exchangeJourneys)continue;
  if(!runsRulesVersion(w,22)||(p.tradeLeads?.length??0)>12||(p.exchangeJourneys?.length??0)>8||p.tradeLeads?.some(l=>!lead(l))||(p.exchangeJourneys??[]).filter(j=>j.status==='travelling'||j.status==='talking').length>1)throw new Error('Invalid exchange journey history');
  for(const j of p.exchangeJourneys??[])if(!lead(j.lead)||!finite(j.id)||!finite(j.started)||!['travelling','talking','fulfilled','failed'].includes(j.status)||!ALL_ITEMS.includes(j.item)||!ALL_ITEMS.includes(j.offer)||!finite(j.amount)||j.amount<=0||!finite(j.offerAmount)||j.offerAmount<=0)throw new Error('Invalid exchange journey');
 }
}
