import {expect,it} from 'vitest';
import {estateScene} from './helpers/estate';
import {killPerson} from '../src/sim/lifecycle';
import {startActivity,newActivity} from '../src/sim/activities';
import {stepWorld} from '../src/sim/world';
import {conservationReport,snapshotInitial} from '../src/sim/economy';
import {setExternalController} from '../src/sim/external';
import {observe} from '../src/sim/knowledge';
import {generateOptions} from '../src/sim/decision';
import type {World,Person,Pile,Items} from '../src/sim/types';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {describeEntity} from '../src/sim/inspect';
import {makeHousePile} from '../src/sim/buildings';
import {newCart,hitch} from '../src/sim/carts';
import {makeSource} from '../src/sim/sources';
import {setEstateCustody} from '../src/sim/estate';
import {site} from './helpers/kit';
import {lendTool} from '../src/sim/tools';
function collect(w:World,p:Person,pile:Pile,items:Items){p.cooldowns.pause=0;p.nextThink=w.tick+1000;const a=newActivity(w,p,{kind:'withdraw',label:'Staged estate collection',goal:'recover belongings physically',targetId:pile.id,targetType:'pile',here:true,utility:100,minCommit:100,maxTicks:200,data:{items}});startActivity(w,p,a);return a;}
function advance(w:World,n=40){const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{for(let k=0;k<n;k++)stepWorld(w);}finally{release();}}
it('a foreign household cannot withdraw the deceased household\'s goods',()=>{
 const f=estateScene();killPerson(f.w,f.a,'declared staged loss');const pile=f.w.piles.find(p=>(p.items.wood??0)>0)!;f.outsider.x=pile.x+.5;f.outsider.y=pile.y+1.5;
 collect(f.w,f.outsider,pile,{wood:3});advance(f.w);expect(f.outsider.inv.wood??0).toBe(0);expect(pile.items.wood).toBe(3);expect(conservationReport(f.w).ok).toBe(true);
});
it('past knowledge or same-household status does not permit remote collection',()=>{
 const f=estateScene();killPerson(f.w,f.a,'declared staged loss');const pile=f.w.piles.find(p=>(p.items.wood??0)>0)!;observe(f.w,f.b,pile);f.b.x=10;f.b.y=10;
 collect(f.w,f.b,pile,{wood:3});advance(f.w);expect(f.b.inv.wood??0).toBe(0);expect(pile.items.wood).toBe(3);
});
it('observed foreign estate food is not offered as public food',()=>{
 const f=estateScene();killPerson(f.w,f.a,'declared staged loss');const pile=f.w.piles.find(p=>(p.items.bread??0)>0)!;observe(f.w,f.outsider,pile);f.outsider.needs.hunger=30;
 expect(generateOptions(f.w,f.outsider,true,true).options.some(o=>o.kind==='eat_store'&&o.targetId===pile.id)).toBe(false);
});
it('separates household, borrowed and public equipment without changing tool identity, wear or ownership',()=>{
 const f=estateScene();f.borrowed.wear=27;killPerson(f.w,f.a,'declared staged loss');const parcels=f.w.piles.filter(p=>p.estate);
 expect(parcels).toHaveLength(3);expect(parcels.find(p=>p.estate?.hhId===f.a.hhId)?.items).toMatchObject({wood:3,bread:1,axe:1});
 for(const t of [f.own,f.borrowed,f.publicTool])expect(parcels.find(p=>p.id===t.holder)?.estate?.hhId).toBe(t.ownerHh);
 expect(f.borrowed.wear).toBe(27);expect(f.borrowed.loan).toBeNull();expect(f.a.inv).toEqual({});expect(conservationReport(f.w).ok).toBe(true);
 const before=serializeWorld(f.w);for(const p of parcels)describeEntity(f.w,p.id);expect(serializeWorld(f.w)).toBe(before);expect(serializeWorld(deserializeWorld(before))).toBe(before);
});
it('a household collector spends actual time, respects capacity and leaves the rest physically in place',()=>{
 const f=estateScene();f.b.inv={grain:10};snapshotInitial(f.w);killPerson(f.w,f.a,'declared staged loss');const pile=f.w.piles.find(p=>(p.items.wood??0)>0)!;f.b.x=pile.x+.5;f.b.y=pile.y+1.5;
 collect(f.w,f.b,pile,{wood:3});advance(f.w,4);expect(f.b.inv.wood??0).toBe(0);const twin=deserializeWorld(serializeWorld(f.w));
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{for(let n=0;n<40;n++){stepWorld(f.w);stepWorld(twin);}}finally{release();}
 expect(serializeWorld(twin)).toBe(serializeWorld(f.w));expect(f.b.inv.wood).toBe(1);expect(pile.items.wood).toBe(2);expect(conservationReport(f.w).ok).toBe(true);
});
it('leaving contact during collection prevents a later remote transfer',()=>{
 const f=estateScene();killPerson(f.w,f.a,'declared staged loss');const pile=f.w.piles.find(p=>(p.items.wood??0)>0)!;f.b.x=pile.x+.5;f.b.y=pile.y+1.5;
 collect(f.w,f.b,pile,{wood:3});advance(f.w,4);f.b.x=10;f.b.y=10;advance(f.w);expect(f.b.inv.wood??0).toBe(0);expect(pile.items.wood).toBe(3);
});
it('knowledge of foreign goods suppresses salvage offers while public tool recovery stays available',()=>{
 const f=estateScene();killPerson(f.w,f.a,'declared staged loss');const own=f.w.piles.find(p=>p.estate?.hhId===f.a.hhId)!,pub=f.w.piles.find(p=>p.estate?.hhId===0)!;
 observe(f.w,f.outsider,own);observe(f.w,f.outsider,pub);const ctx=generateOptions(f.w,f.outsider,true,true);
 expect(ctx.options.some(o=>o.kind==='withdraw'&&o.targetId===own.id)).toBe(false);expect(ctx.options.some(o=>o.kind==='withdraw'&&o.targetId===pub.id)).toBe(true);
});
it('the lender physically recovers their own axe and uses that same worn tool in real gathering',()=>{
 const f=estateScene(),tree=makeSource(f.w,'tree',36,40,12),home=site({w:f.w,rng:null!},'lean_to',48,43,f.lender.hhId,f.lender.id);observe(f.w,f.lender,tree);observe(f.w,f.lender,home);snapshotInitial(f.w);f.borrowed.wear=27;killPerson(f.w,f.a,'declared staged loss');
 const parcel=f.w.piles.find(p=>p.estate?.hhId===f.lender.hhId)!;f.lender.x=parcel.x+.5;f.lender.y=parcel.y+1.5;
 collect(f.w,f.lender,parcel,{axe:1});advance(f.w);expect(f.borrowed.holder).toBe(f.lender.id);expect(f.borrowed.ownerHh).toBe(f.lender.hhId);expect(f.borrowed.wear).toBe(27);
 const offer=generateOptions(f.w,f.lender,true,true).options.find(o=>o.targetId===tree.id&&o.kind==='gather');expect(offer).toBeDefined();startActivity(f.w,f.lender,offer!.make!()!);
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{for(let n=0;n<1500&&(f.lender.inv.wood??0)<1;n++)stepWorld(f.w);}finally{release();}
 expect(f.lender.inv.wood??0).toBeGreaterThan(0);expect(f.borrowed.wear).toBeGreaterThan(27);expect(conservationReport(f.w).ok).toBe(true);
});
it('a full pack can eat owned estate food at the real pile, while an outsider cannot',()=>{
 for(const outsider of [true,false]){const f=estateScene(),p=outsider?f.outsider:f.b;p.inv={grain:12};p.needs.hunger=40;snapshotInitial(f.w);killPerson(f.w,f.a,'declared staged loss');const pile=f.w.piles.find(p=>(p.items.bread??0)>0)!;
 p.x=pile.x+.5;p.y=pile.y+1.5;p.cooldowns.pause=0;p.nextThink=1000;startActivity(f.w,p,newActivity(f.w,p,{kind:'eat_store',label:'Staged estate meal',goal:'eat physically',targetId:pile.id,targetType:'pile',here:true,utility:100,minCommit:100,maxTicks:300,data:{}}));advance(f.w,120);
 expect(f.w.ledger.consumed.bread??0).toBe(outsider?0:1);expect(conservationReport(f.w).ok).toBe(true);}
});
it('cart loading checks estate ownership again at the actual loading place',()=>{
 for(const outsider of [true,false]){const f=estateScene(),p=outsider?f.outsider:f.b;killPerson(f.w,f.a,'declared staged loss');const pile=f.w.piles.find(p=>(p.items.wood??0)>0)!;p.x=pile.x+.5;p.y=pile.y+1.5;
 const cart=newCart(f.w,p.x,p.y,p.hhId);hitch(f.w,p,cart);p.cooldowns.pause=0;p.nextThink=1000;
 startActivity(f.w,p,newActivity(f.w,p,{kind:'cart_haul',label:'Staged estate cart loading',goal:'load known goods',targetId:pile.id,targetType:'pile',here:true,utility:100,minCommit:100,maxTicks:300,data:{cartId:cart.id,leg:1,fromId:pile.id,toId:999999,items:{wood:3}}}));advance(f.w,40);
 expect(cart.load.wood??0).toBe(outsider?0:3);expect(conservationReport(f.w).ok).toBe(true);}
});
it('a public drop does not merge into an estate, and later deposits cannot change its provenance',()=>{
 const f=estateScene();f.b.inv={stone:1};snapshotInitial(f.w);killPerson(f.w,f.a,'declared staged loss');const pile=f.w.piles.find(p=>(p.items.wood??0)>0)!;
 // A separate initial public holding is a declared fixture, counted before execution.
 const publicPile=makeHousePile(f.w,pile.x,pile.y,{grain:1},'declared public grain')!;snapshotInitial(f.w);expect(publicPile.id).not.toBe(pile.id);
 f.b.x=pile.x+.5;f.b.y=pile.y+1.5;f.b.cooldowns.pause=0;f.b.nextThink=1000;
 startActivity(f.w,f.b,newActivity(f.w,f.b,{kind:'deposit',label:'Staged mixing attempt',goal:'exercise provenance boundary',targetId:pile.id,targetType:'pile',here:true,utility:100,minCommit:100,maxTicks:200,data:{items:{stone:1}}}));advance(f.w);
 expect(f.b.inv.stone).toBe(1);expect(pile.items.stone??0).toBe(0);expect(conservationReport(f.w).ok).toBe(true);
});
it('rejects malformed custody and mismatched registered owners, while the removal keeps historical public heaps',()=>{
 const f=estateScene();killPerson(f.w,f.a,'declared staged loss');const parcel=f.w.piles.find(p=>p.id===f.borrowed.holder)!;parcel.estate!.hhId=f.b.hhId;
 expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow(/Estate tool owner/);parcel.estate!.hhId=f.lender.hhId;parcel.estate!.deathTick=-1;expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow(/estate custody/);
 const old=estateScene();setEstateCustody(false);try{killPerson(old.w,old.a,'declared staged loss');expect(old.w.piles.every(p=>!p.estate)).toBe(true);expect(conservationReport(old.w).ok).toBe(true);}finally{setEstateCustody(true);}
});
it('a tool already lent out stays with its borrower and is not copied into the estate',()=>{
 const f=estateScene();expect(lendTool(f.w,f.own,f.a,f.outsider,2400)).toBe(true);killPerson(f.w,f.a,'declared staged loss');
 expect(f.own.holder).toBe(f.outsider.id);expect(f.own.ownerHh).toBe(f.b.hhId);expect(f.own.loan?.lender).toBe(f.b.id);
 expect(f.w.piles.filter(p=>p.estate?.hhId===f.b.hhId).reduce((n,p)=>n+(p.items.axe??0),0)).toBe(0);expect(conservationReport(f.w).ok).toBe(true);
});
it('a remembered parcel already collected by its owner cannot be collected twice',()=>{
 const f=estateScene();killPerson(f.w,f.a,'declared staged loss');const pile=f.w.piles.find(p=>(p.items.wood??0)>0)!;f.b.x=pile.x+.5;f.b.y=pile.y+1.5;
 collect(f.w,f.b,pile,{wood:3});advance(f.w);expect(f.b.inv.wood).toBe(3);collect(f.w,f.b,pile,{wood:3});advance(f.w);expect(f.b.inv.wood).toBe(3);expect(conservationReport(f.w).ok).toBe(true);
});
