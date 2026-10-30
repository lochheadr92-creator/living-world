import {expect,it} from 'vitest';
import {careCapacityScene} from './helpers/care_capacity';
import {generateOptions} from '../src/sim/decision';
it('a food-only recovery trip uses hunger urgency; a separate water hand-over keeps thirst urgency',()=>{
 const f=careCapacityScene();f.failGift();f.elder.needs.hunger=40;f.elder.needs.thirst=70;
 const offered=()=>generateOptions(f.w,f.helper,true,true).options;
 const first=offered().find(o=>o.key.startsWith('care_store:'))!;
 f.elder.needs.thirst=20;
 const next=offered(),food=next.find(o=>o.key.startsWith('care_store:'))!,water=next.find(o=>o.key===`give:${f.elder.id}`)!;
 expect(food.util).toBe(first.util);
 expect(water.label).toBe('Bring water to Eli');
 expect(water.parts.some(([why])=>why.includes('bread'))).toBe(false);
});
