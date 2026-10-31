import {expect,it} from 'vitest';
import {cartProjectScene} from './helpers/cart_project';
import {stubModel} from '../src/agent/model';
import {runLive,runReplay} from '../src/agent/run';
import {observationFromPrompt} from '../src/agent/protocol';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
it.each([false,true])('legal offered steps saw, assemble and haul with the cart, and the transcript replays exactly (notes %s)',async memory=>{
 const f=cartProjectScene();const initial=serializeWorld(f.w),model=stubModel('cart-steps',req=>{const o=observationFromPrompt(req.user)!,pick=(re:RegExp)=>o.options.find(x=>re.test(x.key)),choice=pick(/^operate:\d+:build_cart$/)??pick(/^operate:\d+:saw_planks$/)??pick(/^cart_haul:/)??o.options[0];return JSON.stringify({choose:choice.key,why:'Finish the prepared cart, then use it'});});
 const result=await runLive(f.w,f.p.id,model,{until:1500,memory});
 expect(result.transcript.calls.some(c=>c.result?.key?.endsWith(':build_cart'))).toBe(true);expect(result.world.carts).toHaveLength(1);
 expect(conservationReport(result.world).ok).toBe(true);expect(serializeWorld(runReplay(deserializeWorld(initial),result.transcript).world)).toBe(serializeWorld(result.world));
});
