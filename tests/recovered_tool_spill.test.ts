import {expect,it} from 'vitest';
import {currentStage} from './helpers/current';
import {addPerson,done} from './helpers/kit';
import {newCart,breakCart} from '../src/sim/carts';
import {mintTool} from '../src/sim/tools';
import {toolReport} from '../src/sim/toolreg';
import {transfer,conservationReport} from '../src/sim/economy';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {building} from './helpers/kit';
import {destroyBuilding} from '../src/sim/buildings';
it.each([['cart','rod'],['building','rod'],['cart','net'],['building','net'],['cart','trap'],['building','trap']] as const)('keeps the recovered rod collectible and saveable after a %s collapses (%s)',(kind,tool)=>{
 const s=currentStage('rod-spill'),p=addPerson(s,'Ada',40,40);const rod=mintTool(s.w,tool,0,p.hhId,p.id,p.inv,p.id,'staged equipment',false);
 const holder=kind==='cart'?newCart(s.w,42,40,p.hhId):building(s,'storehouse',42,40,p.hhId);
 const items=holder.ent==='cart'?holder.load:holder.store.items,cap=holder.ent==='cart'?holder.cap:holder.store.cap;done(s);
 expect(transfer(s.w,p.inv,items,cap,tool,1,'person:'+p.id,holder.ent+':'+holder.id,'put away')).toBe(1);
 if(holder.ent==='cart')breakCart(s.w,holder,null);else destroyBuilding(s.w,holder,'staged collapse');
 const pile=s.w.piles.find(x=>x.items[tool]===1)!;expect(pile).toBeDefined();expect(rod.holder).toBe(pile.id);expect(toolReport(s.w).problems).toEqual([]);
 const raw=serializeWorld(s.w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);expect(transfer(s.w,pile.items,p.inv,12,tool,1,'pile:'+pile.id,'person:'+p.id,'retrieve')).toBe(1);expect(rod.holder).toBe(p.id);expect(conservationReport(s.w).ok).toBe(true);
});

it('keeps the old spill behavior below the repair generation',()=>{const s=currentStage('old-rod-spill');s.w.settings.rulesVersion=146;const p=addPerson(s,'Ada',40,40);const t=mintTool(s.w,'rod',0,p.hhId,p.id,p.inv,p.id,'staged equipment',false),c=newCart(s.w,42,40,p.hhId);done(s);transfer(s.w,p.inv,c.load,c.cap,'rod',1,'person:'+p.id,'cart:'+c.id,'put away');breakCart(s.w,c,null);expect(t.holder).toBe(c.id);expect(s.w.piles.some(x=>x.items.rod===1)).toBe(true);});
