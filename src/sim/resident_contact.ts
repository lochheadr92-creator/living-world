// Personally observed room contact and the physical entrance boundary for resident care.
// Kept separate from option generation so the activity engine does not import social handlers.
import {enterHome} from './habitation';
import {runsRulesVersion} from './rulesversion';
import type {Activity,Person,SeenEntity,World} from './types';

export const RESIDENT_CARE_FROM_VERSION=66;
export const ROOM_CONTACT_MEMORY=700;
let enabled=true;
export const residentCareOn=():boolean=>enabled;
export function setResidentCare(on:boolean):void{enabled=on;}
export const hasResidentCare=(w:World):boolean=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,RESIDENT_CARE_FROM_VERSION);

/** Real same-room perception, using the observable signs already reported by sight. */
export function rememberRoomContact(w:World,p:Person,seen:SeenEntity,household:boolean,name:string):void{
 if(!hasResidentCare(w)||!p.indoors)return;
 p.whereabouts[seen.id]={x:seen.x,y:seen.y,tick:w.tick,room:{homeId:p.indoors,name,hungry:seen.hungry,thirsty:seen.thirsty,needsCare:seen.child||seen.hurt,household}};
}

/** Physical checks remain for already-started work even if the lab disables new offers. */
export const isResidentCare=(w:World,a:Activity):boolean=>runsRulesVersion(w,RESIDENT_CARE_FROM_VERSION)&&a.kind==='give'&&a.data.residentCare===true;
export const isResidentCareJourney=(w:World,a:Activity):boolean=>isResidentCare(w,a)&&Number.isSafeInteger(a.data.careHome)&&a.data.careHome>0;

export function arriveForResidentCare(w:World,p:Person,a:Activity):string|null{
 if(!isResidentCareJourney(w,a))return null;
 const b=w.byId.get(a.data.careHome);
 if(!b||b.ent!=='building')return 'the remembered home is no longer there';
 const refused=enterHome(w,p,b);if(refused)return refused;
 const q=w.byId.get(a.targetId);
 if(!q||q.ent!=='person'||!q.alive||q.indoors!==b.id){delete p.whereabouts[a.targetId];return 'they are not in the room I remembered';}
 return null;
}
