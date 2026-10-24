// Retention of expired operational timers, not social history or knowledge.
import type {World,Person} from './types';
import {runsRulesVersion} from './rulesversion';
let enabled=true;
export const memoryRetentionOn=()=>enabled;
export function setMemoryRetention(on:boolean):void{enabled=on;}
export const hasMemoryRetention=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,25);
/** Only these keys are deadlines read exclusively as `deadline > tick`.
 * Timestamp/counter keys, whereabouts, kinship, grievances and relationship history remain intact. */
export function retainOperationalMemory(w:World,p:Person):void{
 if(!hasMemoryRetention(w))return;
 for(const key of Object.keys(p.cooldowns))if(/^(talk|invite|sorry|propose|making:)\d+$/.test(key)&&p.cooldowns[key]<=w.tick)delete p.cooldowns[key];
}
