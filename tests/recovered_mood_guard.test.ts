import {expect,it,afterEach} from 'vitest';
import {stage,addPerson,done} from './helpers/kit';
import {makeCtx} from '../src/sim/optutil';
import type {Option} from '../src/sim/optutil';
import {setOptionChooser,rankOptions} from '../src/sim/decision';
import {setMoodEffects} from '../src/sim/mood';
import {newActivity} from '../src/sim/activities';
afterEach(()=>{setMoodEffects(true);setOptionChooser('utility');});
function fixture(rulesVersion=145){const s=stage('mood-priority');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion};const p=addPerson(s,'Ada',40,40);done(s);p.mood={level:-100,thoughts:[]};p.needs={hunger:80,thirst:60,warmth:80,safety:80,energy:80,social:80};const ctx=makeCtx(s.w,p,true,true);ctx.options=(['drink','rest'] as const).map((kind,i):Option=>({kind,key:kind,label:kind,goal:kind,need:kind==='drink'?'thirst':'energy',util:i?16:20,parts:[],eta:10,targetId:0,make:()=>newActivity(s.w,p,{kind,label:kind,goal:kind,here:true})}));return ctx;}
it('does not let low mood promote idle time above a survival action that wins without mood',()=>{const ctx=fixture();setMoodEffects(false);expect(rankOptions(ctx)[0].kind).toBe('drink');setMoodEffects(true);expect(rankOptions(ctx)[0].kind).toBe('drink');});

it('preserves the predecessor ranking',()=>{expect(rankOptions(fixture(144))[0].kind).toBe('rest');});
it('allows rest that was already the stronger choice',()=>{const ctx=fixture();ctx.options[1].util=30;expect(rankOptions(ctx)[0].kind).toBe('rest');});
it('does not alter random choice or the hard critical filter',()=>{const ctx=fixture();setOptionChooser('random');const a=rankOptions(ctx).map(o=>o.key);ctx.world.settings.rulesVersion=144;expect(rankOptions(ctx).map(o=>o.key)).toEqual(a);setOptionChooser('utility');ctx.world.settings.rulesVersion=145;ctx.criticals=['thirst'];ctx.options[1].util=300;expect(rankOptions(ctx).map(o=>o.kind)).toEqual(['drink']);});
it('does not change simulation state or option utilities while comparing mood',()=>{const ctx=fixture();const before=JSON.stringify(ctx.world),utils=ctx.options.map(o=>o.util);rankOptions(ctx);expect(JSON.stringify(ctx.world)).toBe(before);expect(ctx.options.map(o=>o.util)).toEqual(utils);});
