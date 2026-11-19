import type {FoodKind, Items, Stage, World} from '../../src/sim/types';
import {NUTRITION} from '../../src/sim/constants';
import {nutritionOf} from '../../src/sim/bread_feeds';
import {totalItems} from '../../src/sim/economy';
import {stageOf} from '../../src/sim/people';

const foods = Object.keys(NUTRITION) as FoodKind[];

function snapshot(w:World){
  return {
    tick:w.tick, stock:totalItems(w), standingGrain:w.plots.reduce((sum,p)=>sum+p.stock,0),
    created:{...w.ledger.created}, consumed:{...w.ledger.consumed}, spoiled:{...w.ledger.spoiled},
  };
}
function stageTotals(){
  return {personTicks:0, demand:0, intake:0, unmet:0, unmetTicks:0, awakeTicks:0, hungryAwakeTicks:0};
}

/** One interval. Install before stepping, then finish before installing the next interval. */
export function observeFoodBudget(w:World){
  const open=snapshot(w);
  const stages:Record<Stage,ReturnType<typeof stageTotals>>={
    child:stageTotals(), youth:stageTotals(), adult:stageTotals(), elder:stageTotals(),
  };
  const activityTicks:Record<string,number>={};
  const transfers:Record<string,Items>={};
  const previous=w.hooks;
  w.hooks={
    ...previous,
    onFoodDemand(p,stage,demand,unmet){
      previous?.onFoodDemand?.(p,stage,demand,unmet);
      const row=stages[stage];
      row.personTicks++; row.demand+=demand; row.unmet+=unmet;
      if(unmet>0)row.unmetTicks++;
      if(p.pose!=='sleep'){
        row.awakeTicks++;
        if(p.needs.hunger<62)row.hungryAwakeTicks++;
      }
      const a=p.activity;
      if(a){
        const target=w.byId.get(a.targetId);
        const purpose=a.kind==='gather' && target?.ent==='source' ? 'gather '+target.item : a.kind;
        const key=purpose+' / '+a.phase;
        activityTicks[key]=(activityTicks[key]??0)+1;
      }
    },
    onFoodIntake(p,input){
      previous?.onFoodIntake?.(p,input);
      stages[stageOf(w,p)].intake+=input;
    },
    onTransfer(e){
      previous?.onTransfer?.(e);
      if(!Object.hasOwn(NUTRITION,e.item))return;
      const key=e.reason+' ('+e.from.split(':')[0]+' to '+e.to.split(':')[0]+')';
      const items=transfers[key]??={};
      items[e.item]=(items[e.item]??0)+e.n;
    },
  };
  return function finish(){
    w.hooks=previous;
    const close=snapshot(w);
    const byFood=foods.map(food=>{
      const opening=open.stock[food]??0, closing=close.stock[food]??0;
      const created=(close.created[food]??0)-(open.created[food]??0);
      const consumed=(close.consumed[food]??0)-(open.consumed[food]??0);
      const spoiled=(close.spoiled[food]??0)-(open.spoiled[food]??0);
      return {food,nutritionPerUnit:nutritionOf(w,food),opening,created,consumed,spoiled,closing,
        balanceError:opening+created-consumed-spoiled-closing};
    });
    const nutrition={opening:0,created:0,consumed:0,spoiled:0,closing:0};
    for(const food of byFood){
      for(const key of ['opening','created','consumed','spoiled','closing'] as const){
        nutrition[key]+=food[key]*food.nutritionPerUnit;
      }
    }
    return {nutrition,start:open.tick,end:close.tick,byFood,standingGrain:{opening:open.standingGrain,closing:close.standingGrain},
      transfers,stages,activityTicks};
  };
}
