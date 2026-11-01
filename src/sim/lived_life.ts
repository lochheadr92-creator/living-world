// Rules 119 (Pavel; numbered 117 before integration after Stage 3): bounded reconsideration and truthful, continuing personal experience.
import {runsRulesVersion} from './rulesversion';
import type {World} from './types';
let enabled=true;
export const livedLifeOn=()=>enabled;
export function setLivedLife(on:boolean):void{enabled=on;}
export const hasLivedLife=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,119);
