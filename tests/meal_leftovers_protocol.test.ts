import {expect,it} from 'vitest';
import {leftoverScene} from './helpers/meal_leftovers';
import {cancelMeal} from '../src/sim/meals';
import {observe} from '../src/sim/knowledge';
import {stubModel} from '../src/agent/model';
import {runLive,runReplay} from '../src/agent/run';
import {observationFromPrompt} from '../src/agent/protocol';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
it.each([false,true])('offers actual leftover recovery to the AI and exactly replays its ordinary action (memory %s)',async memory=>{
 const {w,host,meal}=leftoverScene();cancelMeal(w,meal,'declared interrupted meal');const pile=w.piles[0];observe(w,host,pile);
 host.cooldowns.pause=0;host.nextThink=0;const initial=serializeWorld(w);
 const model=stubModel('recover-leftovers',req=>{const o=observationFromPrompt(req.user)!;const chosen=o.options.find(a=>a.key===`collect:${pile.id}:bread`)??o.options[0];return JSON.stringify({choose:chosen.key,why:'Collect the offered household food at its actual place'});});
 const result=await runLive(w,host.id,model,{until:w.tick+60,memory});
 expect(result.world.persons.find(p=>p.id===host.id)!.inv.bread).toBe(6);expect(conservationReport(result.world).ok).toBe(true);
 expect(result.transcript.asks.some(a=>a.observation.options.some(o=>o.key===`collect:${pile.id}:bread`))).toBe(true);
 expect(serializeWorld(runReplay(deserializeWorld(initial),result.transcript).world)).toBe(serializeWorld(result.world));
});
