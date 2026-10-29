import {expect,it} from 'vitest';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {generateOptions} from '../src/sim/decision';
import {perceive} from '../src/sim/perception';
import {serializeWorld} from '../src/app/save';

it('direct observer planning preserves expired life events; normal planning still expires them',()=>{
 const w=createWorld(currentWorldSettings('normal','meadow',{immigration:false}));
 const p=w.persons.find(p=>p.partnerId)!;
 const q=w.persons.find(q=>q.id===p.partnerId)!;
 q.x=p.x+1;q.y=p.y;p.pose=q.pose='stand';
 p.lifeEvent={kind:'new_parent',about:q.id,since:-100,until:w.tick};
 perceive(w,p);
 const before=serializeWorld(w);
 generateOptions(w,p,true,true);
 expect(serializeWorld(w)===before).toBe(true);
 generateOptions(w,p,true,false);
 expect(p.lifeEvent).toBeUndefined();
});
