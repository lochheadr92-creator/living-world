import {afterEach,expect,it} from 'vitest';
import {civilisationOutcome} from '../scripts/lab/civilisation';
import {supperFixture} from './helpers/household_practices';
import {setExternalController} from '../src/sim/external';
import {serializeWorld} from '../src/app/save';
import {stage,done} from './helpers/kit';
import {DAY} from '../src/sim/constants';
afterEach(()=>setExternalController(null));
it('reads actual acquired practice and preserves the full world',()=>{
 const f=supperFixture();for(let i=0;i<4;i++)f.meal();const before=serializeWorld(f.w),m=civilisationOutcome(f.w,0);
 expect(m.supperHoldersAtEnd).toBe(2);expect(m.familySupperAtEnd).toBe(1);expect(m.secondTransmissionAtEnd).toBe(0);expect(m.newbornSupperAtEnd).toBe(0);expect(serializeWorld(f.w)).toBe(before);
});
it('measures retained production mixes only with three days, not assigned specialities',()=>{
 const w=done(stage('civic-metrics'));w.tick=5*DAY;w.economicObservations={since:0,flows:[],production:[]};
 for(const town of [1,2])for(const day of [2,3,4])w.economicObservations.production.push({day,townshipId:town,kind:'gathering',items:town===1?{wood:10}:{stone:10},lastSource:0,lastTick:day*DAY});
 expect(civilisationOutcome(w,0).townsWithRepeatedProduction).toBe(2);expect(civilisationOutcome(w,0).townProductionDistance).toBe(1);
 expect(civilisationOutcome(w,3*DAY).townsWithRepeatedProduction).toBe(0);expect(civilisationOutcome(w,3*DAY).townProductionDistance).toBe(0);
});
it('counts repeated retained exchange pairs and respects the fork window',()=>{
 const w=done(stage('exchange-metrics'));const receipt={journeyId:1,requestId:2,tick:10,fromTown:3,toTown:4,buyer:5,seller:6,item:'wood' as const,amount:2,offer:'stone' as const,offerAmount:1};
 w.exchangeReceipts=[receipt,{...receipt,journeyId:7,tick:20,fromTown:4,toTown:3}];expect(civilisationOutcome(w,0).retainedExchangePairs).toBe(1);expect(civilisationOutcome(w,15).retainedExchangePairs).toBe(0);expect(civilisationOutcome(w,15).retainedExchangeReceipts).toBe(1);
});
