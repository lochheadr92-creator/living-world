// The instrumented probe's meadow twin differed although the census-only probe's did not: something in generateOptions/rankOptions
// changes saved state when called from outside. Find the first call that does, and the first saved path that differs.
// Usage: vite-node <this> <seed> <rules> <days> <out>
import {writeFileSync} from 'node:fs';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {serializeWorld} from '../../src/app/save';
import {DAY} from '../../src/sim/constants';
import {generateOptions,rankOptions} from '../../src/sim/decision';
const [seed='meadow',rules='160',days='25',out='purity.json']=process.argv.slice(2);
const w=createWorld({...currentWorldSettings('normal',seed),rulesVersion:Number(rules)});
const diffs:string[]=[];
function walk(a:any,b:any,path:string){
 if(diffs.length>=12)return;
 if(a===b)return;
 if(typeof a!=='object'||typeof b!=='object'||a===null||b===null){diffs.push(`${path}: ${JSON.stringify(a)?.slice(0,80)} -> ${JSON.stringify(b)?.slice(0,80)}`);return;}
 const keys=new Set([...Object.keys(a),...Object.keys(b)]);
 for(const k of keys)walk(a[k],b[k],`${path}.${k}`);
}
let calls=0;
while(w.tick<Number(days)*DAY){
 for(const p of w.persons){const a=p.activity;if(!p.alive||!a||a.kind!=='gather'||a.need!=='hunger'||w.tick+1<p.nextThink)continue;
  const before=serializeWorld(w);const ctx=generateOptions(w,p,false);rankOptions(ctx);const after=serializeWorld(w);calls++;
  if(before!==after){walk(JSON.parse(before),JSON.parse(after),'world');
   const res={seed,rules:Number(rules),tick:w.tick,person:p.id,callsBefore:calls-1,activity:{kind:a.kind,need:a.need,key:a.data.optKey,phase:a.phase},diffs};
   writeFileSync(out,JSON.stringify(res,null,1));console.log(JSON.stringify(res));process.exit(0);}
 }
 stepWorld(w);
}
writeFileSync(out,JSON.stringify({seed,rules:Number(rules),calls,pure:true}));console.log(JSON.stringify({seed,calls,pure:true}));
