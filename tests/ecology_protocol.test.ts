import {expect,it} from 'vitest';
import {ecologyScene} from './helpers/ecology';
import {observe} from '../src/sim/knowledge';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {observeInhabitant} from '../src/agent/observe';
import {observationFromPrompt,observationVersionFor,protocolHasMemory,PROTOCOL_V21,PROTOCOL_V22,PROTOCOL_V29,PROTOCOL_V30} from '../src/agent/protocol';
import {stubModel} from '../src/agent/model';
import {runLive,runReplay} from '../src/agent/run';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {hashWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
it.each([false,true])('exposes coarse ecology through the actual live/stub protocol and replays the physical rest action (memory %s)',async memory=>{
 const {w,p,a}=ecologyScene();w.ecology={[a.y*w.W+a.x]:{condition:0.4,lastUse:w.tick}};observe(w,p,a);p.cooldowns.pause=0;p.nextThink=0;const start=serializeWorld(w);
 const model=stubModel('ecology-rest',req=>{const o=observationFromPrompt(req.user)!;const rest=o.options.find(o=>o.label==='Prepare the field to rest');return JSON.stringify({choose:(rest??o.options[0]).key,why:'Use an offered physical action'});});
 const result=await runLive(w,p.id,model,{until:150,memory});expect(result.transcript.header.protocol).toBe(memory?PROTOCOL_V30:PROTOCOL_V29);expect(result.transcript.header.observationVersion).toBe(16);
 expect(result.transcript.asks[0].observation.remembered.places.find(pl=>pl.id===a.id)?.ecology).toContain('worn when observed');expect(result.world.plots.find(pl=>pl.id===a.id)?.fallowUntil).toBeGreaterThan(150);
 expect(result.world.persons.find(q=>q.id===p.id)?.inv.water).toBe(3);expect(conservationReport(result.world).ok).toBe(true);expect(hashWorld(runReplay(deserializeWorld(start),result.transcript).world)).toBe(hashWorld(result.world));
});
it('keeps historical protocols 21/22 bound to observation 12 without ecological fields',()=>{
 const {w,p}=ecologyScene(),ctx=generateOptions(w,p,true,true);for(const protocol of [PROTOCOL_V21,PROTOCOL_V22]){expect(observationVersionFor(protocol)).toBe(12);const obs=observeInhabitant(w,p,ctx,rankOptions(ctx),{version:observationVersionFor(protocol)});expect(obs.remembered.places.every(pl=>pl.ecology===undefined&&pl.fieldRest===undefined)).toBe(true);}expect(protocolHasMemory(PROTOCOL_V21)).toBe(false);expect(protocolHasMemory(PROTOCOL_V22)).toBe(true);
});
