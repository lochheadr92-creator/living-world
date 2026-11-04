// Exact observed-vs-twin comparison, daily, as the 30-day investigation did: the observed world comes from the factory, the twin
// from the deserialized initial state; both step in lockstep. Records the first exact-text mismatch, whether parsed values still
// agree, and which top-level person fields differ. Usage: vite-node <this> <profile> <seed> <rules> <days> <out>
import {writeFileSync} from 'node:fs';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {DAY} from '../../src/sim/constants';
const [profile='large',seed='river',rules='159',days='30',out='twin.json']=process.argv.slice(2);
const w=createWorld({...currentWorldSettings(profile as never,seed),rulesVersion:Number(rules)});
const twin=deserializeWorld(serializeWorld(w));
const mismatches:any[]=[];let checked=0;
while(w.tick<Number(days)*DAY){stepWorld(w);stepWorld(twin);if(w.tick%DAY)continue;checked++;
 const a=serializeWorld(w),b=serializeWorld(twin);if(a===b)continue;
 const pa=JSON.parse(a),pb=JSON.parse(b);const sameParsed=JSON.stringify(sortKeys(pa))===JSON.stringify(sortKeys(pb));
 const diff:string[]=[];if(pa.world&&pb.world)for(let i=0;i<Math.min(pa.world.persons.length,pb.world.persons.length);i++){const x=pa.world.persons[i],y=pb.world.persons[i];for(const k of Object.keys(x))if(JSON.stringify(x[k])!==JSON.stringify(y[k])&&diff.length<6)diff.push(`${x.name}.${k}`);}
 mismatches.push({day:w.tick/DAY,tick:w.tick,sameParsedValues:sameParsed,personFieldsDiffering:diff});if(mismatches.length>=4)break;}
function sortKeys(x:any):any{return Array.isArray(x)?x.map(sortKeys):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,sortKeys(x[k])])):x;}
const res={profile,seed,rules:Number(rules),days:Number(days),daysChecked:checked,firstMismatchDay:mismatches[0]?.day??null,exactEqualEveryDay:mismatches.length===0,mismatches};
writeFileSync(out,JSON.stringify(res,null,1));console.log(JSON.stringify(res));
