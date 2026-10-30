// Lab-only trace: same-state old/new tool facts are sampled, never enacted as decisions.
import {generateOptions,rankOptions} from '../../src/sim/decision';
import {hasToolPrecedence,setToolPrecedence,toolPrecedenceOn} from '../../src/sim/production';
import type {World} from '../../src/sim/types';
export class ToolDemandTrace {
  readonly counts={livingPersonSamples:0,wanted:0,required:0,displaced:0,craftOffered:0,craftEligible:0,craftRankedFirst:0,omittedSamples:0,omittedEvents:0};
  readonly samples:unknown[]=[];
  readonly events:unknown[]=[];
  readonly starts:Record<string,number>={};
  readonly endings:Record<string,number>={};
  attach(w:World):()=>void {
    const prior=w.hooks;
    const retain=(e:unknown)=>{if(this.events.length<2000)this.events.push(e);else this.counts.omittedEvents++;};
    w.hooks={...prior,
      onActivityStart:(p,a)=>{prior?.onActivityStart?.(p,a);if(a.kind!=='craft')return;
        const k=String(a.data.tool);this.starts[k]=(this.starts[k]??0)+1;
        retain({tick:w.tick,person:p.id,name:p.name,hh:p.hhId,event:'start',tool:k,goal:a.goal,inventory:{...p.inv}});},
      onActivityEnd:(p,a,outcome,detail)=>{prior?.onActivityEnd?.(p,a,outcome,detail);if(a.kind!=='craft')return;
        const k=`${a.data.tool}|${outcome}|${detail}`;this.endings[k]=(this.endings[k]??0)+1;
        retain({tick:w.tick,person:p.id,name:p.name,hh:p.hhId,event:'end',tool:a.data.tool,outcome,detail,inventory:{...p.inv}});},
    };
    return()=>{w.hooks=prior;};
  }
  sample(w:World):void {
    for(const p of w.persons){
      if(!p.alive)continue;this.counts.livingPersonSamples++;
      const ctx=generateOptions(w,p,true,true),wanted=ctx.toolWanted;if(!wanted)continue;
      this.counts.wanted++;if(wanted.required)this.counts.required++;
      let earlier= wanted;
      if(hasToolPrecedence(w)){
        const was=toolPrecedenceOn();setToolPrecedence(false);
        try{earlier=generateOptions(w,p,true,true).toolWanted??wanted;}finally{setToolPrecedence(was);}
      }
      if(earlier.kind===wanted.kind)continue;this.counts.displaced++;
      const key=`craft:${wanted.kind}`,offered=ctx.options.some(o=>o.key===key),ranked=rankOptions(ctx),eligible=ranked.some(o=>o.key===key);
      if(offered)this.counts.craftOffered++;if(eligible)this.counts.craftEligible++;if(ranked[0]?.key===key)this.counts.craftRankedFirst++;
      if(this.samples.length>=2000){this.counts.omittedSamples++;continue;}
      this.samples.push({tick:w.tick,person:p.id,name:p.name,hh:p.hhId,wanted:{...wanted},earlier:{...earlier},offered,eligible,first:ranked[0]?{key:ranked[0].key,utility:ranked[0].util}:null,
        inventory:{...p.inv},needs:{...p.needs},activity:p.activity?{kind:p.activity.kind,phase:p.activity.phase,goal:p.activity.goal}:null,
        plans:p.intentions.filter(i=>i.status==='active').map(i=>({id:i.id,kind:i.kind,makes:i.makes,step:i.step})),
        blockers:ctx.blocked.map(o=>({label:o.label,reason:o.blocked})),options:ranked.slice(0,8).map(o=>({key:o.key,utility:o.util}))});
    }
  }
  report(){return {method:'Repeated living-person samples. Displaced means the first missing tool in the same state with precedence disabled differs. Craft opportunity counts apply only to displaced samples; they are not actual decisions. Craft starts/endings are actual hooks. No counterfactual trajectory or benefit is inferred.',counts:this.counts,starts:this.starts,endings:this.endings};}
}
