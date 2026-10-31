import {afterEach,expect,it} from 'vitest';
import {rememberedNeedScene} from './helpers/remembered_need';
import {knownNeeds,needsFromSigns,rememberedSigns,setRememberedNeed} from '../src/sim/remembered_need';
import {generateOptions} from '../src/sim/decision';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {describePerson} from '../src/sim/inspect';
import {stepWorld} from '../src/sim/world';
import type {Ctx} from '../src/sim/optutil';
afterEach(()=>setRememberedNeed(true));
const care=(ctx:Ctx)=>ctx.options.find(o=>o.key.startsWith('give:'));
const blockedCare=(ctx:Ctx)=>ctx.blocked.find(b=>b.label.startsWith('Care for'));
it('a child who grows hungry out of sight gets no care until the parent sees him; before 106 the live figure was read',()=>{
 const f=rememberedNeedScene();expect(f.ada.whereabouts[f.cal.id].seen).toEqual({hungry:false,thirsty:false,cold:false});
 f.away();f.cal.needs.hunger=30;
 const before=serializeWorld(f.w),ctx=generateOptions(f.w,f.ada,true,true);expect(care(ctx)).toBeUndefined();expect(blockedCare(ctx)).toBeUndefined();describePerson(f.w,f.ada.id);expect(serializeWorld(f.w)).toBe(before);
 const legacy=rememberedNeedScene(105);legacy.away();legacy.cal.needs.hunger=30;expect(legacy.ada.whereabouts[legacy.cal.id].seen).toBeUndefined();expect(care(generateOptions(legacy.w,legacy.ada,true,true))?.label).toBe('Bring bread to Cal');
 // the lab removal restores the live read in a 106 world and nothing else
 setRememberedNeed(false);expect(care(generateOptions(f.w,f.ada,true,true))?.label).toBe('Bring bread to Cal');setRememberedNeed(true);
 // he comes into sight: she sees him hungry and offers from what she sees
 f.back();expect(f.ada.whereabouts[f.cal.id].seen).toMatchObject({hungry:true});const seen=care(generateOptions(f.w,f.ada,true,true));expect(seen?.label).toBe('Bring bread to Cal');expect(seen?.parts.some(([n])=>/looked so when I last saw them/.test(n))).toBe(false);
 // he goes out of sight again and is fed by nobody she knows of: she still means to bring bread, on what she last saw
 f.away();const tick=f.w.tick;f.cal.needs.hunger=100;const remembered=care(generateOptions(f.w,f.ada,true,true));expect(remembered?.label).toBe('Bring bread to Cal');expect(remembered?.parts.some(([n])=>n===`Cal needs bread (looked so when I last saw them, tick ${tick})`)).toBe(true);
});
it('a whereabouts note that came from somebody else carries no signs, and the parent says she has not seen how he is',()=>{
 const f=rememberedNeedScene();f.away();f.cal.needs.hunger=30;const n=f.ada.whereabouts[f.cal.id];f.ada.whereabouts[f.cal.id]={x:n.x,y:n.y,tick:n.tick,from:f.cal.id+1};
 const ctx=generateOptions(f.w,f.ada,true,true);expect(care(ctx)).toBeUndefined();expect(blockedCare(ctx)?.blocked).toBe('has not seen how they are');
 expect(rememberedSigns(f.ada,f.cal.id)).toBeNull();expect(knownNeeds(f.w,f.ada,f.cal,false)).toBeNull();expect(knownNeeds(f.w,f.ada,f.cal,true)).toBe(f.cal.needs);
 expect(needsFromSigns({hungry:true,thirsty:false,cold:true})).toEqual({hunger:41,thirst:100,warmth:34});
});
it('remembered signs are saved only in a 106 world and continue exactly',()=>{
 const f=rememberedNeedScene();f.away();f.cal.needs.hunger=30;const text=serializeWorld(f.w);expect(serializeWorld(deserializeWorld(text))).toBe(text);
 const older=JSON.parse(text) as {world:{settings:Record<string,unknown>}};older.world.settings.rulesVersion=105;expect(()=>deserializeWorld(JSON.stringify(older))).toThrow(/remembered signs/);
 const twin=deserializeWorld(text);f.ada.cooldowns.pause=0;twin.persons.find(p=>p.id===f.ada.id)!.cooldowns.pause=0;
 for(let n=0;n<300;n++){stepWorld(f.w);stepWorld(twin);}expect(serializeWorld(f.w)).toBe(serializeWorld(twin));
});
