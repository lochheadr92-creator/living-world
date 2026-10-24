import {afterEach,expect,it} from 'vitest';
import {exchangeFixture} from './helpers/exchange_journeys';
import {setExchangeJourneys,tellTradeLead} from '../src/sim/exchange_journeys';
import {setExternalController} from '../src/sim/external';
import {generateOptions} from '../src/sim/decision';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {describePerson} from '../src/sim/inspect';
import {conservationReport,transfer} from '../src/sim/economy';
import {endActivity} from '../src/sim/activities';
import {DAY} from '../src/sim/constants';
afterEach(()=>{setExternalController(null);setExchangeJourneys(true);});
it('learns through a real conversation, carries an offer to a remembered place and completes real barter',()=>{
 const f=exchangeFixture();f.learnAndSeparate();const {w,a,b}=f;
 expect(a.tradeLeads![0]).toMatchObject({personId:b.id,goods:{wood:2}});
 expect(a.x).toBeGreaterThan(59);const original={a:{...a.inv},b:{...b.inv}};
 f.choose('exchange:');for(let i=0;i<50;i++)stepWorld(w);
 expect(a.x).toBeLessThan(59);expect(a.x).toBeGreaterThan(43);expect(a.inv).toEqual(original.a);expect(b.inv).toEqual(original.b);
 f.finish();expect(a.exchangeJourneys![0].status).toBe('fulfilled');expect(a.inv.wood).toBe(2);expect(a.inv.berries).toBe(2);expect(b.inv.berries).toBe(4);expect(b.inv.wood??0).toBe(0);
 expect(a.exchangeJourneys![0].requestId).toBeGreaterThan(0);expect(conservationReport(w).ok).toBe(true);
 expect(describePerson(w,a.id)?.civic.lines.join(' ')).toContain('fulfilled');
});
it('preserves mid-journey and mid-conversation full-state continuation',()=>{
 const f=exchangeFixture();f.learnAndSeparate();f.choose('exchange:');for(let i=0;i<35;i++)stepWorld(f.w);
 let loaded=deserializeWorld(serializeWorld(f.w));for(let i=0;i<35;i++){stepWorld(f.w);stepWorld(loaded);}expect(serializeWorld(loaded)).toBe(serializeWorld(f.w));
 for(let i=0;i<700&&!f.a.convId;i++)stepWorld(f.w);expect(f.a.convId).toBeGreaterThan(0);
 loaded=deserializeWorld(serializeWorld(f.w));for(let i=0;i<100;i++){stepWorld(f.w);stepWorld(loaded);}expect(serializeWorld(loaded)).toBe(serializeWorld(f.w));
 expect(f.a.exchangeJourneys![0].status).toBe('fulfilled');
});
it('does not track a departed counterparty remotely or invent a swap',()=>{
 const f=exchangeFixture();f.learnAndSeparate();f.choose('exchange:');const target=f.a.activity!.spotX;
 // Labelled failure condition: counterparty has left the remembered place.
 f.b.x=75;f.b.y=55;f.finish();expect(f.a.x).toBeCloseTo(target);expect(f.a.exchangeJourneys![0].outcome).toContain('not at');expect(f.a.inv.wood??0).toBe(0);expect(conservationReport(f.w).ok).toBe(true);
});
it('records unavailable goods and refusal at the actual conversation',()=>{
 const f=exchangeFixture();f.learnAndSeparate();transfer(f.w,f.b.inv,f.buildingSite.delivered,999,'wood',2,`person:${f.b.id}`,`site:${f.buildingSite.id}`,'staged changed availability');
 f.choose('exchange:');f.finish();expect(f.a.exchangeJourneys![0]).toMatchObject({status:'failed',outcome:'nothing to spare'});expect(f.a.inv.berries).toBe(5);expect(conservationReport(f.w).ok).toBe(true);
});
it('keeps observers pure, rejects stale/unknown leads, and respects the lab and historical gates',()=>{
 const f=exchangeFixture();f.learnAndSeparate();const {w,a}=f,before=serializeWorld(w);generateOptions(w,a,true,true);describePerson(w,a.id);expect(serializeWorld(w)).toBe(before);
 const offered=()=>generateOptions(w,a,true,true).options.some(o=>o.kind==='exchange_journey');expect(offered()).toBe(true);
 setExchangeJourneys(false);expect(offered()).toBe(false);setExchangeJourneys(true);w.settings.rulesVersion=21;expect(offered()).toBe(false);expect(()=>deserializeWorld(serializeWorld(w))).toThrow('exchange');w.settings.rulesVersion=22;
 a.tradeLeads![0].tick=w.tick-DAY*3;expect(offered()).toBe(false);a.tradeLeads=[];expect(offered()).toBe(false);
});
it('records interruption without goods movement and enforces bounded personal histories',()=>{
 const f=exchangeFixture();f.learnAndSeparate();f.choose('exchange:');endActivity(f.w,f.a,'interrupted','urgent thirst');expect(f.a.exchangeJourneys![0]).toMatchObject({status:'failed',outcome:'urgent thirst'});expect(f.a.inv.berries).toBe(5);
 f.a.x=f.b.x;f.a.y=f.b.y;for(let i=0;i<20;i++)tellTradeLead(f.w,f.b,f.a,{wood:1});expect(f.a.tradeLeads).toHaveLength(1);
});
it('urgent thirst really interrupts travel through normal decision review',()=>{
 const f=exchangeFixture();f.learnAndSeparate();f.choose('exchange:');f.a.needs.thirst=1;f.a.nextThink=f.w.tick;stepWorld(f.w);
 expect(f.a.exchangeJourneys![0].status).toBe('failed');expect(f.a.activity?.kind).toBe('drink');expect(f.a.inv.berries).toBe(5);
});
it('autonomous activity review retains the bounded trip while nonurgent alternatives exist',()=>{
 const f=exchangeFixture();f.learnAndSeparate();f.choose('exchange:');setExternalController(null);
 for(let i=0;i<500&&f.a.exchangeJourneys![0].status==='travelling';i++)stepWorld(f.w);
 expect(f.a.exchangeJourneys![0].status).toBe('talking');
});
it('records fulfilled transfers immediately and keeps them when the later conversation is interrupted',()=>{
 const f=exchangeFixture();f.learnAndSeparate();f.choose('exchange:');
 for(let i=0;i<700&&f.a.exchangeJourneys![0].status!=='fulfilled';i++)stepWorld(f.w);
 expect(f.a.convId).toBeGreaterThan(0);expect(f.w.exchangeReceipts).toHaveLength(1);endActivity(f.w,f.a,'interrupted','urgent danger after swap');
 expect(f.a.exchangeJourneys![0].status).toBe('fulfilled');expect(f.w.exchangeReceipts).toHaveLength(1);expect(conservationReport(f.w).ok).toBe(true);
});
it('received goods physically return through ordinary hauling to the known household site',()=>{
 const f=exchangeFixture();f.learnAndSeparate();f.choose('exchange:');f.finish();const x=f.a.x;
 f.choose(`haul:${f.buildingSite.id}`);f.finish();expect(f.a.x).toBeGreaterThan(x+12);expect(f.buildingSite.delivered.wood).toBe(2);expect(f.a.inv.wood??0).toBe(0);expect(conservationReport(f.w).ok).toBe(true);
});
it('cannot learn a lead remotely, and records a real refusal to talk without exchanging anything',()=>{
 const f=exchangeFixture();f.a.x=65;tellTradeLead(f.w,f.b,f.a,{wood:2});expect(f.a.tradeLeads).toBeUndefined();f.a.x=40.5;
 f.learnAndSeparate();f.b.relations[f.a.id].avoidUntil=f.w.tick+DAY;f.choose('exchange:');f.finish();expect(f.a.exchangeJourneys![0].status).toBe('failed');expect(f.a.exchangeJourneys![0].outcome).toContain('did not want to talk');expect(f.a.inv.berries).toBe(5);expect(f.w.exchangeReceipts).toBeUndefined();
});
it('fails a physically blocked route without moving goods or recording an exchange',()=>{
 const f=exchangeFixture();f.learnAndSeparate();for(let y=0;y<f.w.H;y++)f.w.solid[y*f.w.W+50]=1;
 expect(()=>f.choose('exchange:')).toThrow('Did not select');expect(f.a.exchangeJourneys![0].status).toBe('failed');expect(f.a.exchangeJourneys![0].outcome).toContain('no way');expect(f.a.inv.berries).toBe(5);expect(f.w.exchangeReceipts).toBeUndefined();
});
