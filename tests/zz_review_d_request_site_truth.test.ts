// REVIEW D (knowledge boundaries): social.ts evaluateRequest measures a material ask against the SITE'S TRUE LEDGER
// (required - delivered - used), not against what either party believes the site still needs.
// STAGED: Ada asks Ben, beside her, for one stone for her hut site 20 tiles away. Only the site's delivered stone is declared.
import {expect,it} from 'vitest';
import {stage,addPerson,site,done,pin,learn} from './helpers/kit';
import {createRequest,evaluateRequest} from '../src/sim/social';
import {BUILD_DEF} from '../src/sim/constants';

it('social.ts evaluateRequest - "enough" is decided from stone delivered to a site that neither asker nor helper has seen',()=>{
 const s=stage('review-d-request'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=115;
 const ada=addPerson(s,'Ada',40,40,{age:35,hunger:95,thirst:95,energy:95});
 const ben=addPerson(s,'Ben',41.5,40,{age:30,inv:{stone:3},hunger:95,thirst:95,energy:95,traits:{generosity:0.9}});
 const st=site(s,'hut',60,40,ada.hhId,ada.id);
 done(s);for(const p of [ada,ben]){pin(p);p.needs.warmth=100;p.needs.safety=100;}
 learn(w,ada,st); // she laid it out and saw it wanting its full cost
 const cost=BUILD_DEF.hut.cost.stone??0;expect(cost).toBeGreaterThan(1);
 expect(ada.beliefs[st.id]?.need?.stone).toBe(cost);
 expect(ben.beliefs[st.id]).toBeUndefined(); // Ben has never seen the site
 const req=createRequest(w,ada,ben,{kind:'stone',item:'stone',amount:1,siteId:st.id,destKind:'site',destId:st.id});
 const before=evaluateRequest(w,ben,ada,req);
 expect(before.kind==='decline'?before.reason:'').not.toBe('enough');
 // stone reaches the site from somebody neither of them has seen (declared); Ada's belief is unchanged
 st.delivered.stone=cost;
 expect(ada.beliefs[st.id]?.need?.stone).toBe(cost);
 // LEAK: Ben declines because the site is complete, which nobody in the conversation can know
 expect(evaluateRequest(w,ben,ada,req)).toEqual({kind:'decline',reason:'enough'});
});
