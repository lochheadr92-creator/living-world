// Derived observer links only. No RNG, cached state, invented causes, or simulation mutations.
import type { World, Person, Items } from './types';
import type { CivicProject } from './townships';
import { townshipOf } from './townships';
const name = (w: World, id: number) => w.persons.find(p => p.id === id)?.name ?? w.deceased.find(p => p.id === id)?.name ?? `person #${id}`;
const items = (i: Items) => Object.entries(i).map(([k,n]) => `${n} ${k}`).join(', ') || 'no materials';
export function projectHistory(w: World, q: CivicProject): string[] {
 const site = w.byId.get(q.siteId);
 const missing = site?.ent === 'site' ? Object.entries(site.required).map(([k,n]) => [k, Math.max(0, (n ?? 0) - ((site.delivered as Record<string,number>)[k] ?? 0) - ((site.used as Record<string,number>)[k] ?? 0))] as const).filter(([,n]) => n > 0).map(([k,n]) => `${n} ${k}`).join(', ') : '';
 const organiser = w.byId.get(q.organiserId);
 const supported = q.participants.filter(m => m.personId !== q.organiserId && m.status === 'supporting').length;
 return [
  `Shared storehouse #${q.siteId}: ${q.status}. Organiser: ${name(w, q.organiserId)}${!organiser || organiser.ent !== 'person' || !organiser.alive ? ' (no longer present; supporters may continue)' : ''}.`,
  `Proposed: ${q.reason}. Voluntary support: ${supported}.`,
  q.status === 'active' ? `Still needed: ${missing || 'materials supplied'}${site?.ent === 'site' ? `; ${Math.ceil(site.workTotal - site.work)} work` : '; site unavailable'}.` : `Outcome: ${q.outcome}.`,
  ...q.participants.map(m => `${name(w,m.personId)}: ${m.status} — ${m.reason}; supplied ${items(m.materials)}; ${Math.floor(m.work)} work.`),
 ];
}
export function civicHistory(w: World, p: Person): { township: string; lines: string[] } {
 const t = townshipOf(w,p);
 if (!t) return { township: '', lines: [] };
 const households = w.households.filter(h => h.townshipId === t.id);
 const projects = (w.civicProjects ?? []).filter(q => q.townshipId === t.id);
 return { township: t.name, lines: [
  `${t.name}: ${households.length} households. Membership belongs to the household and does not change with walking.`,
  ...projects.slice(-2).flatMap(q => projectHistory(w,q)),
  ...(p.civicOutcomes ?? []).slice(-3).map(m => `Personally witnessed ${name(w,m.organiserId)}'s project #${m.projectId} ${m.success ? 'complete' : 'fail'} at tick ${m.tick}; this informs willingness to support them again.`),
  ...(projects.length ? [] : ['No shared project proposed yet.']),
 ] };
}
export function householdHistory(w: World, p: Person): string[] {
 const h = w.households.find(h => h.id === p.hhId);
 if (!h) return ['No current household record. Earlier cause unknown.'];
 const home = w.byId.get(h.homeId);
 return [ `${h.name} household formed at tick ${h.formed}; formation cause is not recorded.`,
  `Members: ${h.members.map(id => name(w,id)).join(', ')}.`,
  home?.ent === 'building' ? `Home #${home.id}: ${home.type}; recorded builders: ${(home.builtBy ?? []).map(id => name(w,id)).join(', ') || 'unknown'}.` : 'No current home.',
  ...w.sites.filter(s => s.hhId === h.id).map(s => `Site #${s.id} (${s.type}), proposed by ${name(w,s.creatorId)}; ${s.status}.`),
  ...w.requests.filter(r => h.members.includes(r.from) || h.members.includes(r.to)).slice(-6).map(r => `Request #${r.id}: ${name(w,r.from)} asked ${name(w,r.to)}; ${r.status}: ${r.note || 'reason unknown'}${r.commitmentId ? `; promise #${r.commitmentId}` : ''}${r.siteId ? `; site #${r.siteId}` : ''}.`),
 ];
}

export function relationshipHistory(w: World, p: Person): string[] {
 const rows: string[] = [];
 const entries = Object.entries(p.relations).sort(([,a],[,b]) => b.lastMet-a.lastMet).slice(0,12);
 for(const [id,r] of entries){
  const other=Number(id);
  rows.push(`${name(w,other)}: trust ${Math.round(r.trust)}, affinity ${Math.round(r.affinity)}${r.kin ? `; ${r.kin}` : ''}.`);
  if(r.grievance) rows.push(`Open grievance: ${r.grievance.detail} (since tick ${r.grievance.since}).`);
  const receipts=(p.socialMemory??[]).filter(m=>m.otherId===other).slice(-3);
  for(const m of receipts)rows.push(`Request #${m.requestId}, ${m.role}, tick ${m.tick}: ${m.outcome} — ${m.reason}${m.siteId ? `; site #${m.siteId}` : ''}.`);
  for(const note of r.history.slice(-2))rows.push(`Remembered at tick ${note.tick}: ${note.text}. Event link not recorded.`);
  if(!receipts.length&&!r.history.length)rows.push('Earlier cause not recorded.');
 }
 return rows.length?rows:['No recorded relationships.'];
}
