import {afterEach,expect,it} from 'vitest';
import {repairDutyScene,requestRepair,secondAsker,askRepairFrom} from './helpers/repair_duty';
import {setSingleRoofDuty} from '../src/sim/repair_duty';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
afterEach(()=>setSingleRoofDuty(true));
const duties=(f:ReturnType<typeof repairDutyScene>)=>f.helper.commitments.filter(c=>c.kind==='work'&&c.destId===f.home.id);
it('a roof already promised is declined to a second asker in so many words; one real patch keeps the one promise',()=>{
 const f=repairDutyScene(102,'hut',{wood:1,bread:2,water:2},35),first=requestRepair(f);expect(first.status).toBe('promised');
 const cal=secondAsker(f),second=askRepairFrom(f,cal);
 expect(second.request).toMatchObject({status:'declined',note:'committed'});expect(second.spoken).toBe('I have already promised to see to that roof.');expect(duties(f)).toHaveLength(1);
 const twin=deserializeWorld(serializeWorld(f.w));for(let n=0;n<2500&&first.status==='promised';n++){stepWorld(f.w);stepWorld(twin);}
 expect(first.status).toBe('fulfilled');expect(f.w.ledger.reasons['-repairs']).toBe(1);expect(duties(f)).toHaveLength(1);expect(duties(f)[0]).toMatchObject({status:'done',contrib:40});
 expect(f.w.requests.filter(r=>r.kind==='repair'&&r.status==='fulfilled')).toHaveLength(1);expect(cal.relations[f.helper.id].trust).toBeLessThan(83);expect(cal.socialMemory?.map(m=>m.outcome)).toEqual(['declined']);expect(f.helper.socialMemory?.filter(m=>m.role==='helper'&&m.outcome==='fulfilled')).toHaveLength(1);
 expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
});
it.each(['legacy','ablation'])('the recorded double acceptance and double credit remain under %s',mode=>{
 if(mode==='ablation')setSingleRoofDuty(false);const f=repairDutyScene(mode==='legacy'?101:102,'hut',{wood:1,bread:2,water:2},35),first=requestRepair(f);
 const cal=secondAsker(f),second=askRepairFrom(f,cal);expect(second.request.status).toBe('promised');expect(duties(f)).toHaveLength(2);
 for(let n=0;n<2500&&(first.status==='promised'||second.request.status==='promised');n++)stepWorld(f.w);
 expect(f.w.ledger.reasons['-repairs']).toBe(1);expect([first.status,second.request.status]).toEqual(['fulfilled','fulfilled']);expect(duties(f).map(c=>c.contrib)).toEqual([40,40]);expect(conservationReport(f.w).ok).toBe(true);
});
it('a second ask about a different roof is still answered on its own merits',()=>{
 const f=repairDutyScene(102,'hut',{wood:2,bread:2,water:2},35);expect(requestRepair(f).status).toBe('promised');
 const cal=secondAsker(f);const other=f.home;void other;
 // Cal's household home is the same hut, so his ask names the promised roof: declined. (A different building would need its own staged home.)
 expect(askRepairFrom(f,cal).request.status).toBe('declined');
});
