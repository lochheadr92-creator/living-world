import {expect,it} from 'vitest';
import {waterScene} from './helpers/water';
import {stubModel} from '../src/agent/model';
import {runLive,runReplay} from '../src/agent/run';
import {observationFromPrompt,observationVersionFor,PROTOCOL_V23,PROTOCOL_V24,PROTOCOL_V27,PROTOCOL_V28} from '../src/agent/protocol';
import {observeInhabitant} from '../src/agent/observe';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
it.each([false,true])('uses current protocol coarse water observations and replays actual shore drinking (memory %s)',async memory=>{
  const {w,p,small}=waterScene();p.cooldowns.pause=0;p.nextThink=0;const initial=serializeWorld(w);
  const model=stubModel('local-water',req=>{const o=observationFromPrompt(req.user)!,near=o.remembered.water.find(b=>b.waterSupply?.startsWith('wet'));const chosen=o.options.find(a=>a.key===`drink:${near?.id}`)??o.options[0];return JSON.stringify({choose:chosen.key,why:'Use my observed water access'});});
  const result=await runLive(w,p.id,model,{until:180,memory});
  expect(result.transcript.header.protocol).toBe(memory?PROTOCOL_V28:PROTOCOL_V27);expect(result.transcript.header.observationVersion).toBe(15);
  const places=result.transcript.asks[0].observation.remembered.water;expect(places.some(b=>b.waterSupply?.includes('wet when observed'))).toBe(true);expect(places.every(b=>!('capacity' in b)&&!('amount' in b))).toBe(true);
  expect(result.world.waterBodies?.find(b=>b.id===small.id)?.drawn).toBe(2);expect(conservationReport(result.world).ok).toBe(true);
  expect(serializeWorld(runReplay(deserializeWorld(initial),result.transcript).world)).toBe(serializeWorld(result.world));
});
it('preserves historical observation 13 without new hydrological fields',()=>{
  const {w,p}=waterScene(),ctx=generateOptions(w,p,true,true);
  for(const version of [PROTOCOL_V23,PROTOCOL_V24]){expect(observationVersionFor(version)).toBe(13);const obs=observeInhabitant(w,p,ctx,rankOptions(ctx),{version:13});expect(obs.remembered.water.every(b=>b.waterSupply===undefined)).toBe(true);}
});
