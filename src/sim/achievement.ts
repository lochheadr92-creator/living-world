// Personal aftermath of completed construction. The building owns completion; this
// module only records a bounded response for contributors who witness it.
import { BUILD_DEF, DAY, isSolidHome } from './constants';
import { addLog } from './events';
import { isRich, think } from './mood';
import { runsRulesVersion } from './rulesversion';
import { hyp } from './util';
import type { Building, World } from './types';
let enabled = true;
export const achievementAftermathOn = (): boolean => enabled;
export function setAchievementAftermath(on: boolean): void { enabled = on; }
export const hasAchievementAftermath = (w: World): boolean => enabled && isRich(w) && runsRulesVersion(w, 38);
export function constructionAftermath(w: World, b: Building): void {
  if (!hasAchievementAftermath(w) || b.built !== w.tick || (!isSolidHome(b.type) && b.type !== 'storehouse')) return;
  const ids = new Set(b.builtBy ?? []);
  const project = w.civicProjects?.find(q => q.buildingId === b.id && q.status === 'completed');
  for (const m of project?.participants ?? []) if (m.work > 0 || Object.values(m.materials).some(n => n && n > 0)) ids.add(m.personId);
  for (const id of ids) {
    const p = w.byId.get(id);
    if (!p || p.ent !== 'person' || !p.alive || p.indoors || p.pose === 'sleep' || hyp(p.x - (b.x+b.w/2), p.y - (b.y+b.h/2)) > 8) continue;
    // The existing home-goal reward covers this same achievement, at its next life check.
    if (b.hhId === p.hhId && p.goal?.kind === 'home' && (!p.goal.done || w.tick-p.goal.done < 3*DAY)) continue;
    if (p.mood?.thoughts.some(t => t.kind === 'achievement' && t.since === w.tick)) continue;
    const why = `helped finish ${b.type === 'storehouse' ? 'a shared storehouse' : 'a '+BUILD_DEF[b.type].label}`;
    think(w, p, 'achievement', 6, 2*DAY, why);
    addLog(w, p, 'work', `Satisfied: ${why}.`);
  }
}
