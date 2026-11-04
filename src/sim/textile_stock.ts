import {runsRulesVersion} from './rulesversion';
import type {Belief,ItemKind,Person,World} from './types';

export const TEXTILE_GOODS=['fibre','garment','blanket','bedding'] as const;
const WOOL_GOODS=[...TEXTILE_GOODS,'wool'] as const;
export const textileGoods=(w:World):readonly ItemKind[]=>w.settings.dynamics==='rich'&&runsRulesVersion(w,129)?WOOL_GOODS:TEXTILE_GOODS;
/** Personal access observed at the same date as the stock, not current remote
 * earmarks. Hearing another person's availability does not grant it to us. */
export function knownTextileStock(w:World,p:Person,b:Belief|undefined,item:ItemKind):number{
 if(!b)return 0;
 if(w.settings.dynamics==='rich'&&runsRulesVersion(w,124)&&b.kind==='building'&&textileGoods(w).includes(item))
  return b.textileStock?.observer===p.id?b.textileStock.items[item]??0:0;
 return b.items?.[item]??0;
}
