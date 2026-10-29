import type { WorldEvent } from '../sim/types';
export interface FeedRow { ev: WorldEvent; count: number; key: string; members: WorldEvent[] }

/** Group only routine workshop completions, keeping every represented event available for expansion. */
export function feedRows(events: readonly WorldEvent[], filter: string, matches: (ev: WorldEvent) => boolean, limit = 30): FeedRow[] {
  const rows: FeedRow[] = [];
  const work = new Map<string, FeedRow>();
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    if (!matches(ev)) continue;
    if (ev.kind === 'work' && filter === 'all') {
      const match = /^.*? finished (.+)$/.exec(ev.text);
      const key = match ? `fin:${match[1]}` : ev.text;
      const prior = work.get(key);
      if (prior) { prior.members.push(ev); prior.count++; continue; }
      if (work.size >= 3 || rows.length >= limit) continue;
      const row = {ev,count:1,key:`w:${key}`,members:[ev]};
      work.set(key,row); rows.push(row);
    } else if (rows.length < limit) rows.push({ev,count:1,key:String(ev.id),members:[ev]});
  }
  return rows;
}
