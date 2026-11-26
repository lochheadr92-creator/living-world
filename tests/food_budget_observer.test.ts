import {describe,expect,it} from 'vitest';
import {stage,addPerson,done} from './helpers/kit';
import {consume,harvestPlot,ledgerCreate,ledgerSpoil,takeFrom,transfer} from '../src/sim/economy';
import {createPlot} from '../src/sim/farming';
import {takeNutrition} from '../src/sim/nourishment';
import {updateNeeds} from '../src/sim/needs';
import {observeFoodBudget} from '../scripts/observers/food_budget';
import {stepWorld} from '../src/sim/world';
import {deserializeWorld,serializeWorld} from '../src/app/save';

describe('daily food budget',()=>{
  it('balances edible stock while reporting crop harvest and handover as transfers',()=>{
    const s=stage('food-budget-ledger');
    const p=addPerson(s,'Planter',4,4,{age:28}), q=addPerson(s,'Child',5,4,{age:8,hunger:0});
    const w=done(s), plot=createPlot(w,6,6,p.hhId);
    const finish=observeFoodBudget(w);
    plot.stock=4;
    ledgerCreate(w,'grain',4,'ripened');
    expect(harvestPlot(w,plot,p).grain).toBe(4);
    expect(transfer(w,p.inv,q.inv,20,'grain',2,'person:'+p.id,'person:'+q.id,'give')).toBe(2);
    updateNeeds(w,q);
    consume(w,q.inv,'grain',1,'eaten');
    takeNutrition(w,q,22);
    ledgerSpoil(w,'grain',takeFrom(p.inv,'grain',1),'spoiled');
    const report=finish(), grain=report.byFood.find(f=>f.food==='grain')!;
    expect(grain).toMatchObject({created:4,consumed:1,spoiled:1,balanceError:0});
    expect(grain.closing-grain.opening).toBe(2);
    expect(report.transfers['harvest (plot to person)'].grain).toBe(4);
    expect(report.transfers['give (person to person)'].grain).toBe(2);
    expect(report.standingGrain.closing).toBe(report.standingGrain.opening);
    expect(report.stages.child.intake).toBe(22);
    expect(report.stages.child.unmetTicks).toBe(1);
  });

  it('preserves prior hooks and identical serialized state and random draws',()=>{
    const s=stage('food-budget-twins');
    addPerson(s,'Planter',4,4,{age:28});
    const w=done(s), twin=deserializeWorld(serializeWorld(w)), observed=deserializeWorld(serializeWorld(w));
    let ticks=0;
    const prior={onFoodDemand(){ticks++;}};
    observed.hooks=prior;
    const finish=observeFoodBudget(observed);
    for(let i=0;i<120;i++){stepWorld(observed);stepWorld(twin);}
    const report=finish();
    expect(ticks).toBeGreaterThan(0);
    expect(report.stages.adult.personTicks).toBe(ticks);
    expect(observed.hooks).toBe(prior);
    expect(serializeWorld(observed)).toBe(serializeWorld(twin));
    expect(observed.rng).toEqual(twin.rng);
  });
});
