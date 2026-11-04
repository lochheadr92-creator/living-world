// STAGED contract for rules 153: a remembered net catch is not collected into a full pack again and again.
// Ordinary origin: river rules 152, seven back-to-back zero-transfer checks (survival_evidence/ordinary-acquisition-20261104).
import {it,expect} from 'vitest';
import {stage,addPerson,done,learn} from './helpers/kit';
import {makeSource} from '../src/sim/sources';
import {mintTool} from '../src/sim/tools';
import {gearTick} from '../src/sim/passive_gear';
import {newActivity,startActivity,stepActivity} from '../src/sim/activities';
import {generateOptions} from '../src/sim/decision';
import {stepWorld} from '../src/sim/world';
import {snapshotInitial,conservationReport} from '../src/sim/economy';
import {serializeWorld,deserializeWorld} from '../src/app/save';

function caught(rules:number){
 const s=stage('net-full-pack');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:rules};
 const p=addPerson(s,'Ada',40.5,40.5,{hunger:75,thirst:95,energy:90});const fish=makeSource(s.w,'fish_spot',41,40,3);
 const t=mintTool(s.w,'net',0,p.hhId,p.id,p.inv,p.id,'fixture',false);done(s);learn(s.w,p,fish);const w=s.w;
 startActivity(w,p,newActivity(w,p,{kind:'gear_work',label:'place',goal:'fish later',here:true,targetId:fish.id,targetType:'source',data:{op:'place',toolId:t.id},maxTicks:400}));
 for(let n=0;n<500&&p.activity;n++){w.tick++;stepActivity(w,p);}
 const b=w.piles.find(b=>b.gear)!;w.tick=b.gear!.readyAt;gearTick(w);learn(w,p,b);
 return {w,p,b};
}
function checks(w:ReturnType<typeof caught>['w'],ticks:number){
 let n=0;w.hooks={onActivityStart(_q,a){if(a.kind==='gear_work'&&a.data.op==='check')n++;}};
 for(let i=0;i<ticks;i++)stepWorld(w);delete w.hooks;return n;
}

it('blocks collecting a remembered catch without pack room, and stays a pure read',()=>{
 const {w,p,b}=caught(153);p.inv.stone=30;snapshotInitial(w);b.gear!.checked=true;learn(w,p,b);
 const before=serializeWorld(w),ctx=generateOptions(w,p,true,true);
 expect(ctx.options.some(o=>o.key===`gear:check:${b.id}`)).toBe(false);
 expect(ctx.blocked.find(o=>o.targetId===b.id)?.blocked).toBe('no room in my pack for the catch');
 expect(serializeWorld(w)).toBe(before);
 delete p.inv.stone;expect(generateOptions(w,p,true,true).options.some(o=>o.key===`gear:check:${b.id}`)).toBe(true);
});

it('a check that moves no fish fails, so the same trip is not repeated at once',()=>{
 const {w,p,b}=caught(153);p.inv.stone=30;snapshotInitial(w);
 expect(checks(w,800)).toBeLessThanOrEqual(1);
 expect(b.items.fish??0).toBeGreaterThan(0);expect(p.inv.fish??0).toBe(0);expect(conservationReport(w).ok).toBe(true);
 // Removing the staged ballast makes room; the stone itself is a fixture prop outside the account checked below.
 delete p.inv.stone;learn(w,p,b);
 const take=generateOptions(w,p,true,true).options.find(o=>o.key===`gear:check:${b.id}`);
 expect(take).toBeDefined();startActivity(w,p,take!.make!()!);for(let n=0;n<500&&p.activity;n++){w.tick++;stepActivity(w,p);}
 expect(p.inv.fish??0).toBeGreaterThan(0);expect(conservationReport(w).diffs.filter(d=>d.item!=='stone')).toEqual([]);
});

it('keeps rules 152 behaviour and continues exactly after saving',()=>{
 const old=caught(152);old.p.inv.stone=30;snapshotInitial(old.w);expect(checks(old.w,400)).toBeGreaterThan(3);
 const f=caught(153);f.p.inv.stone=30;snapshotInitial(f.w);const copy=deserializeWorld(serializeWorld(f.w));
 for(let i=0;i<400;i++){stepWorld(f.w);stepWorld(copy);}expect(serializeWorld(f.w)).toBe(serializeWorld(copy));
});
