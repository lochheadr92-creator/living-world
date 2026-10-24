import { deceasedById } from './historical_index';
import { supperHistory } from './household_practices';
import { factionHistory } from './political_alignment';
import { exchangeHistory, exchangeTownHistory } from './exchange_journeys';
import { economicHistory } from './settlement_economy';
import { mandate } from './civic_decision';
// Derived observer links only. No RNG, cached state, invented causes, or simulation mutations.
import type { World, Person, Items } from './types';
import type { CivicProject } from './townships';
import { townshipOf } from './townships';
const name = (w: World, id: number) => w.persons.find(p => p.id === id)?.name ?? deceasedById(w,id)?.name ?? `person #${id}`;
const items = (i: Items) => Object.entries(i).map(([k,n]) => `${n} ${k}`).join(', ') || 'no materials';
export function projectHistory(w: World, q: CivicProject): string[] {
 const site = w.byId.get(q.siteId);
 const missing = site?.ent === 'site' ? Object.entries(site.required).map(([k,n]) => [k, Math.max(0, (n ?? 0) - ((site.delivered as Record<string,number>)[k] ?? 0) - ((site.used as Record<string,number>)[k] ?? 0))] as const).filter(([,n]) => n > 0).map(([k,n]) => `${n} ${k}`).join(', ') : '';
 const organiser = w.byId.get(q.organiserId);
 const coordinator=q.status==='active'?mandate(w,q):q.council?.coordinatorId;
 const supported = q.participants.filter(m => m.personId !== q.organiserId && m.status === 'supporting').length;
 return [
  `Shared storehouse #${q.siteId}: ${q.status}. ${q.council?'Proposed by':'Organiser'}: ${name(w, q.organiserId)}${!organiser || organiser.ent !== 'person' || !organiser.alive ? ' (no longer present; supporters may continue)' : ''}.`,
  `Proposed: ${q.reason}. Voluntary support: ${supported}.`,
  ...(q.council ? [`Coordinator: ${coordinator?name(w,coordinator):'none; insufficient or tied support'}. Construction requires two people and a clear lead in support.`,...q.council.candidates.map(c=>`${name(w,c.personId)} proposes to coordinate: ${c.reason}; ${q.participants.filter(m=>m.status==='supporting'&&m.supports===c.personId).length} supporting.`),...q.participants.flatMap(m=>(m.decisions??[]).map(d=>`${name(w,m.personId)} ${d.accepted?'supported':'refused'} ${name(w,d.candidateId)}: ${d.reason}.`))] : []),
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
  ...(t.origin?[`Founded by household #${t.origin.householdId} through relocation #${t.origin.relocationId}, from township #${t.origin.fromTownship}, after shelter #${t.origin.shelterId} was completed.`]:[]),
  ...economicHistory(w,t.id),
  ...exchangeHistory(w,p),
  ...exchangeTownHistory(w,t.id),
  ...factionHistory(w,t.id),
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
  ...supperHistory(w,p),
  home?.ent === 'building' ? `Home #${home.id}: ${home.type}; recorded builders: ${(home.builtBy ?? []).map(id => name(w,id)).join(', ') || 'unknown'}.` : 'No current home.',
  ...(h.relocations??[]).slice(-3).flatMap(r=>[
   `Relocation #${r.id}: ${r.phase}. Organiser: ${name(w,r.organiserId)}. Destination: ${r.destination.x.toFixed(0)}, ${r.destination.y.toFixed(0)}.`,
   `Reason: ${r.reason}. ${r.outcome||'Membership remains with the original township until shelter is finished and the household arrives together.'}`,
   `Currently carried by household: ${h.members.reduce((n,id)=>{const q=w.byId.get(id);return n+(q?.ent==='person'?['berries','fruit','fish','grain'].reduce((n,k)=>n+((q.inv as Record<string,number>)[k]??0),0):0)},0)} food; ${h.members.reduce((n,id)=>{const q=w.byId.get(id);return n+(q?.ent==='person'?q.inv.water??0:0)},0)} water. Departure ${r.phase==='settled'||r.phase==='failed'?'required':'requires'} ${r.members.length*2} of each.`,
   ...r.members.map(m=>`${name(w,m.id)}: ${m.response} — ${m.reason}.`),
  ]),
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
  if(r.deathKnown) rows.push(`Death learned at tick ${r.deathKnown.learned}: ${r.deathKnown.source}${r.deathKnown.via ? ` from ${name(w,r.deathKnown.via)}` : ''}.`);
  if(r.grievance) rows.push(`Open grievance: ${r.grievance.detail} (since tick ${r.grievance.since}).`);
  const receipts=(p.socialMemory??[]).filter(m=>m.otherId===other).slice(-3);
  for(const m of receipts)rows.push(`Request #${m.requestId}, ${m.role}, tick ${m.tick}: ${m.outcome} — ${m.reason}${m.siteId ? `; site #${m.siteId}` : ''}.`);
  for(const note of r.history.slice(-2))rows.push(`Remembered at tick ${note.tick}: ${note.text}. Event link not recorded.`);
  if(!receipts.length&&!r.history.length)rows.push('Earlier cause not recorded.');
 }
 return rows.length?rows:['No recorded relationships.'];
}
