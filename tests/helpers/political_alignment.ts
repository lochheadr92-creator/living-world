// Labelled three-project history. Prior proposals and support use real civic conversations;
// cancellation between projects is a staged input, not spontaneous settlement history.
import {contestFixture,stop,civicTalk} from './contest';
import {createSite} from '../../src/sim/buildings';
import {proposeProject,finishProject} from '../../src/sim/townships';
import {initialiseCouncil,releaseOldSupport} from '../../src/sim/civic_decision';
import {observe} from '../../src/sim/knowledge';
import {relOf} from '../../src/sim/relations';
export function alignmentFixture(){
 const f=contestFixture(),{w,a,b,c}=f;w.settings.rulesVersion=23;w.sceneLabel='STAGED: repeated support changes a later coordinator choice';
 initialiseCouncil(w,f.q);let site=f.site,q=f.q;
 for(let i=0;i<2;i++){
  civicTalk(w,a,b,site.id);stop(w,a,b,c);
  if(q.participants.find(m=>m.personId===b.id)?.supports!==a.id)throw new Error('Prior support was not accepted');
  finishProject(w,site,null,'staged prior project cancellation');releaseOldSupport(w,b,site.id,'staged prior project cancellation');
  site=createSite(w,'storehouse',43,47+i*4,a.hhId,a.id);proposeProject(w,a,site,'staged next communal store proposal');observe(w,a,site);observe(w,c,site);q=w.civicProjects!.at(-1)!;
 }
 civicTalk(w,a,b,site.id);stop(w,a,b,c);civicTalk(w,a,c,site.id);stop(w,a,b,c);
 relOf(b,a.id).affinity=25;relOf(b,a.id).trust=10;relOf(b,c.id).affinity=28;relOf(b,c.id).trust=10;
 return {...f,site,q};
}
