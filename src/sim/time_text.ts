import {DAY} from './constants';
/** Calendar time, independent of playback speed. Shared by the inspector and inhabitant. */
export function worldDuration(ticks:number):string{
 if(ticks<=0)return '0 world min';
 const minutes=Math.round(ticks*1440/DAY);
 if(minutes<1)return 'under 1 world min';
 const days=Math.floor(minutes/1440),hours=Math.floor(minutes%1440/60),mins=minutes%60;
 if(days)return `${days} world ${days===1?'day':'days'}${hours?` ${hours} h`:''}${mins?` ${mins} min`:''}`;
 if(hours)return `${hours} world h${mins?` ${mins} min`:''}`;
 return `${minutes} world min`;
}
export function worldAge(now:number,tick:number):string{
 const elapsed=now-tick;
 return elapsed===0?'just now':elapsed<0?`in ${worldDuration(-elapsed)}`:`${worldDuration(elapsed)} ago`;
}
