import {afterEach,expect,it} from 'vitest';
import {Game} from '../src/app/game';
import {InhabitDriver,settingsFromConfig} from '../src/app/inhabit';
import type {InhabitConfig} from '../src/app/inhabit';
import {externalController,setExternalController} from '../src/sim/external';
import {hashWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {runReplay} from '../src/agent/run';
const cfg:InhabitConfig={person:'Talia',api:'openai',model:'manual',effort:'',memory:true,showScores:false,fromDay:0,days:3,seed:'meadow',harsh:false,rich:true,size:'normal',arrivals:true,manual:true};
afterEach(()=>setExternalController(null));
for(const operation of ['load','restart'] as const)it(`${operation} ends a pending inhabitant session before replacing its world`,async()=>{
 const game=new Game(settingsFromConfig(cfg)),driver=new InhabitDriver(game,cfg);await driver.start();
 const start=serializeWorld(game.world);game.setSpeed(16);
 for(let i=0;i<1000&&!driver.manual()!.waiting();i++)game.advance(.1);
 const pending=driver.manual()!.waiting();expect(pending).toBeTruthy();
 const oldTick=game.world.tick,oldHash=hashWorld(game.world);
 if(operation==='load'){
  const saved=new Game(settingsFromConfig({...cfg,seed:'river'}));const bytes=serializeWorld(saved.world);
  game.restoreWorld(deserializeWorld(bytes),saved.settings);expect(serializeWorld(game.world)).toBe(bytes);
 }else game.restart({seed:'forest'});
 const replacement=game.world,replacementBytes=serializeWorld(replacement);
 expect(driver.status).toBe('finished');expect(driver.manual()!.waiting()).toBeNull();
 expect(game.tickHooks).toBeNull();expect(externalController()).toBeNull();
 expect(driver.manual()!.submit('{"choose":"wander"}',pending!.id)).toBe(false);
 await driver.idle();expect(game.world).toBe(replacement);expect(serializeWorld(game.world)).toBe(replacementBytes);
 const transcript=driver.transcriptNow()!;expect(transcript.end?.tick).toBe(oldTick);expect(transcript.end?.hash).toBe(oldHash);
 expect(hashWorld(runReplay(deserializeWorld(start),transcript).world)).toBe(oldHash);
});
it('loading during initial fast-forward cancels preparation without attaching to the loaded world',async()=>{
 const game=new Game(settingsFromConfig(cfg)),driver=new InhabitDriver(game,{...cfg,fromDay:10});
 const starting=driver.start();const replacement=new Game(settingsFromConfig({...cfg,seed:'river'}));
 game.restoreWorld(replacement.world,replacement.settings);const bytes=serializeWorld(game.world);await starting;
 expect(driver.status).toBe('finished');expect(driver.session).toBeNull();expect(game.tickHooks).toBeNull();expect(externalController()).toBeNull();
 expect(serializeWorld(game.world)).toBe(bytes);
});
