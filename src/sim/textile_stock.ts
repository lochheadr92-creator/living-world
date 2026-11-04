import {runsRulesVersion} from './rulesversion';
import type {Belief,ItemKind,Person,World} from './types';

export const TEXTILE_GOODS=['fibre','garment','blanket','bedding'] as const;
/** Personal access observed at the same date as the stock, not current remote
 * earmarks. Hearing another person's availability does not grant it to us. */
export function knownTextileStock(w:World,p:Person,b:Belief|undefined,item:ItemKind):number{
 if(!b)return 0;
 if(w.settings.dynamics==='rich'&&runsRulesVersion(w,124)&&b.kind==='building'&&(TEXTILE_GOODS as readonly string[]).includes(item))
  return b.textileStock?.observer===p.id?b.textileStock.items[item]??0:0;
 return b.items?.[item]??0;
}
