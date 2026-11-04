// STAGED contracts for rules 161: a gatherer who turns away because the place now looks empty says so.
// Ordinary origin: hungry gatherers walking into sight of picked-over patches ended "something better came up"
// (review_evidence/interrupted-work-20261105).
import {afterEach,expect,it} from 'vitest';
import {stage,addPerson,done,learn} from './helpers/kit';
import {makeSource} from '../src/sim/sources';
import {newActivity,startActivity} from '../src/sim/activities';
import {generateOptions,reviewActivity} from '../src/sim/decision';
import {noteFailure} from '../src/sim/knowledge';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
import {parseIntervention} from '../scripts/lab/lab';
import {FOUND_EMPTY_REASON,foundEmpty,setFoundEmpty} from '../src/sim/found_empty';
afterEach(()=>setFoundEmpty(true));

/** Basil walks to a berry bush; a second bush is known; what Basil now believes of the first is set by `belief`. */
function scene(rules:number,belief:'empty'|'one left'|'plenty'){
 const s=stage('found-empty');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:rules};
 const p=addPerson(s,'Basil',40.5,40.5,{hunger:40,thirst:90,energy:90});
 const first=makeSource(s.w,'berry_bush',52,40,6),second=makeSource(s.w,'berry_bush',45,43,6);done(s);learn(s.w,p,first);learn(s.w,p,second);
 const act=newActivity(s.w,p,{kind:'gather',label:'Picking berries',goal:'to ease hunger',need:'hunger',targetId:first.id,targetType:'source',tx:first.x,ty:first.y,spotX:first.x-0.5,spotY:first.y+0.5,item:'berries',amount:3,maxTicks:1100});
 act.data.optKey=`gather:${first.id}`;startActivity(s.w,p,act);
 // the person has walked into sight of the first bush and now believes what `belief` says; the commitment window has passed
 p.beliefs[first.id]={...p.beliefs[first.id],amount:belief==='empty'?0:belief==='one left'?1:6,seen:s.w.tick};
 act.minCommit=0;
 return {w:s.w,p,act,first,second};
}

it('names a gather left for an empty place, and takes up the other bush',()=>{
 const f=scene(161,'empty');
 expect(foundEmpty(f.w,f.act,generateOptions(f.w,f.p,false,true))).toBe(true);
 reviewActivity(f.w,f.p);
 expect(f.p.lastResult?.detail).toBe(FOUND_EMPTY_REASON);
 expect(f.p.lastResult?.outcome).toBe('interrupted');
 expect(f.p.activity?.targetId).toBe(f.second.id);
 expect(conservationReport(f.w).ok).toBe(true);
});

it('keeps "something better came up" where the place is not believed empty',()=>{
 const plenty=scene(161,'plenty');plenty.p.beliefs[plenty.first.id].amount=6;
 expect(foundEmpty(plenty.w,plenty.act,generateOptions(plenty.w,plenty.p,false,true))).toBe(false);
 // one left, but a recent failure there removes it from the options: not "empty"
 const failed=scene(161,'one left');noteFailure(failed.w,failed.p,failed.first.id,'a wolf came too close');
 const ctx=generateOptions(failed.w,failed.p,false,true);
 expect(ctx.options.some(o=>o.key===`gather:${failed.first.id}`)).toBe(false);
 expect(foundEmpty(failed.w,failed.act,ctx)).toBe(false);
 reviewActivity(failed.w,failed.p);
 expect(failed.p.lastResult?.detail).not.toBe(FOUND_EMPTY_REASON);
});

it('leaves rules 160 and the lab removal naming it as before',()=>{
 const old=scene(160,'empty');reviewActivity(old.w,old.p);
 expect(old.p.lastResult?.detail).toBe('something better came up');
 const restore=parseIntervention('rich-no-found-empty').install!();
 try{const off=scene(161,'empty');reviewActivity(off.w,off.p);expect(off.p.lastResult?.detail).toBe('something better came up');}finally{restore();}
});

it('changes nothing but the words: the same activity follows with and without the rule',()=>{
 const on=scene(161,'empty'),old=scene(160,'empty');
 reviewActivity(on.w,on.p);reviewActivity(old.w,old.p);
 expect(on.p.activity?.targetId).toBe(old.p.activity?.targetId);
 expect(Object.keys(on.p.failures)).toEqual(Object.keys(old.p.failures));
 expect(on.p.cooldowns).toEqual(old.p.cooldowns);
});

it('is pure to ask and continues exactly after saving',()=>{
 const f=scene(161,'empty'),raw=serializeWorld(f.w);
 foundEmpty(f.w,f.act,generateOptions(f.w,f.p,false,true));expect(serializeWorld(f.w)).toBe(raw);
 const copy=deserializeWorld(raw);
 for(let i=0;i<600;i++){stepWorld(f.w);stepWorld(copy);}
 expect(serializeWorld(f.w)).toBe(serializeWorld(copy));expect(conservationReport(f.w).ok).toBe(true);
});
