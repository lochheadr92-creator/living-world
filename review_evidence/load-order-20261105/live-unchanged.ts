// Live behaviour must not change at 160: a 159 world and a 160 world from the same seed step in lockstep; compared after
// replacing only the explicit rules-version labels. Usage: vite-node <this> <profile> <seed> <days>
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {serializeWorld} from '../../src/app/save';
import {DAY} from '../../src/sim/constants';
const [profile='normal',seed='river',days='5']=process.argv.slice(2);
const a=createWorld({...currentWorldSettings(profile as never,seed),rulesVersion:159}),b=createWorld({...currentWorldSettings(profile as never,seed),rulesVersion:160});
const norm=(s:string)=>s.replaceAll('"rulesVersion":160','"rulesVersion":159').replaceAll('"rulesGeneration":"160"','"rulesGeneration":"159"');
let firstDiff:number|null=null;
while(a.tick<Number(days)*DAY){stepWorld(a);stepWorld(b);if(a.tick%DAY===0&&norm(serializeWorld(b))!==serializeWorld(a)&&firstDiff===null){firstDiff=a.tick;break;}}
console.log(JSON.stringify({profile,seed,days:Number(days),tick:a.tick,identicalExceptVersionLabel:firstDiff===null,firstDiffTick:firstDiff}));
