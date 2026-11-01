import {runsRulesVersion} from './rulesversion';
import type {World} from './types';
let enabled=true;
export const childhoodOn=()=>enabled;
export function setChildhood(on:boolean):void{enabled=on;}
export const hasChildhood=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,120);
