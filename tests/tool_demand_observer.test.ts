import {expect,it} from 'vitest';
import {toolPrecedenceScene} from './helpers/tool_precedence';
import {ToolDemandTrace} from '../scripts/observers/tool_demand';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {toolPrecedenceOn} from '../src/sim/production';
it('observes the same-state displacement without changing world, random state or subsequent autonomous decisions',()=>{
 const f=toolPrecedenceScene(),trace=new ToolDemandTrace(),before=serializeWorld(f.w);
 trace.sample(f.w);expect(trace.counts.displaced).toBe(1);expect(trace.counts.craftOffered).toBe(0);
 expect(serializeWorld(f.w)).toBe(before);expect(toolPrecedenceOn()).toBe(true);
 f.p.cooldowns.pause=0;f.p.nextThink=f.w.tick;
 const twin=deserializeWorld(serializeWorld(f.w)),detach=trace.attach(f.w);
 for(let n=0;n<1200;n++){if(n%120===0)trace.sample(f.w);stepWorld(f.w);stepWorld(twin);}
 detach();expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(toolPrecedenceOn()).toBe(true);
});
