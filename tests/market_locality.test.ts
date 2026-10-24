import { afterEach,expect,it } from 'vitest';
import { stage,addPerson,building,done,give } from './helpers/kit';
import { marketSwap,marketExchange } from '../src/sim/occasions';
import { conservationReport,invWeight,snapshotInitial } from '../src/sim/economy';
import { serializeWorld,deserializeWorld } from '../src/app/save';
import { carryCap } from '../src/sim/people';
import { generateOptions,rankOptions } from '../src/sim/decision';
import { observe } from '../src/sim/knowledge';
import { setLocalMarket } from '../src/sim/market_contact';
import type { Occasion } from '../src/sim/types';
afterEach(()=>setLocalMarket(true));
function fixture(version=16){
 const s=stage('market-contact');s.w.settings.dynamics='rich';s.w.settings.rulesVersion=version;s.w.birthCount=0;
 const p=addPerson(s,'Ada',40.5,40.5,{inv:{wood:4,berries:1},hunger:40,thirst:95});
 const q=addPerson(s,'Ben',42,40.5,{inv:{fish:6,berries:3},hunger:90,thirst:95});
 give(s.w,q,'basket');
 const hall=building(s,'fire',40,43);done(s);
 const o:Occasion={id:s.w.nextId++,kind:'market',placeId:hall.id,placeName:'the fire',x:40.5,y:43.5,called:0,at:0,until:2400,about:[],attended:[q.id,p.id],status:'gathering',end:''};s.w.occasions=[o];
 return {w:s.w,p,q,o};
}
it('reproduces the historical teleport: an earlier attendee can trade from far away',()=>{
 const {w,p,q,o}=fixture(15);q.x=75;expect(marketSwap(w,p,o)).toBe(true);expect(p.inv.fish).toBeGreaterThan(0);
});
it.each(['distant','indoors','asleep','closed','wrong-place'] as const)('refuses %s exchange without touching packs, relations or logs',reason=>{
 const {w,p,q,o}=fixture();
 if(reason==='distant')q.x=75;if(reason==='indoors')q.indoors=123;if(reason==='asleep')q.pose='sleep';if(reason==='closed')o.status='done';if(reason==='wrong-place'){p.x=75;q.x=76;}
 const before=serializeWorld(w);expect(marketSwap(w,p,o)).toBe(false);marketExchange(w,q,o);expect(serializeWorld(w)).toBe(before);
});
it('co-present barter conserves items and both capacities across save/load',()=>{
 const {w,p,q,o}=fixture();const loaded=deserializeWorld(serializeWorld(w));
 for(const world of [w,loaded]){
  const a=world.persons.find(x=>x.id===p.id)!,b=world.persons.find(x=>x.id===q.id)!;
  expect(marketSwap(world,a,world.occasions![0])).toBe(true);expect(a.inv.fish).toBe(2);expect(b.inv.wood).toBe(2);
  expect(invWeight(a)).toBeLessThanOrEqual(carryCap(world,a));expect(invWeight(b)).toBeLessThanOrEqual(carryCap(world,b));expect(conservationReport(world).ok).toBe(true);
 }
 expect(serializeWorld(w)).toBe(serializeWorld(loaded));
});
it('a capacity-limited barter reports exactly the equal quantities that actually move',()=>{
 const {w,p,q,o}=fixture();p.inv={wood:4,berries:1,seeds:6};snapshotInitial(w); // constrain incoming room
 // Explicit material fixture: reset initial accounting after defining its packs.
 const moves:{item:string;n:number}[]=[];w.hooks={onTransfer:t=>moves.push({item:t.item,n:t.n})};
 const traded=marketSwap(w,p,o);
 expect(traded).toBe(true);expect(moves).toEqual([{item:'fish',n:1},{item:'wood',n:1}]);
 expect(invWeight(p)).toBeLessThanOrEqual(carryCap(w,p));expect(conservationReport(w).ok).toBe(true);
 expect(w.events.at(-1)?.text).toContain('swapped 1 wood for 1 fish');
});
it('a remote market is not an option until the place is known',()=>{
 const {w,p,o}=fixture();o.attended=[];p.needs.hunger=90;delete p.beliefs[o.placeId];p.bykind.building=(p.bykind.building??[]).filter(id=>id!==o.placeId);
 expect(rankOptions(generateOptions(w,p,true,true)).some(x=>x.key===`attend:${o.id}`)).toBe(false);
 observe(w,p,w.byId.get(o.placeId)!);o.attended=[];
 expect(rankOptions(generateOptions(w,p,true,true)).some(x=>x.key===`attend:${o.id}`)).toBe(true);
});
it('lab ablation restores the legacy remote transfer for comparison',()=>{
 const {w,p,q,o}=fixture();q.x=75;setLocalMarket(false);expect(marketSwap(w,p,o)).toBe(true);
});

it('market gifts respect promised food and full packs refuse honestly',()=>{
 const {w,p,q,o}=fixture();
 for(const item of ['fish','berries'] as const)q.commitments.push({id:w.nextId++,requestId:0,kind:'deliver',to:p.id,item,amount:q.inv[item]!,siteId:0,made:0,deadline:2400,status:'active',delivered:0,grace:0});
 const before=serializeWorld(w);marketExchange(w,q,o);expect(serializeWorld(w)).toBe(before);
 p.inv={wood:4,berries:4};q.commitments=[];snapshotInitial(w);expect(marketSwap(w,p,o)).toBe(false);expect(conservationReport(w).ok).toBe(true);
});
