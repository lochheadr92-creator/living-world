// Civic identity and collective work. This module owns saved civic records, not inventories,
// navigation or construction. Those remain with their existing physical action handlers.
import type { World, Household, Person, Site, Request, Items, ItemKind, Building } from './types';
import { runsRulesVersion } from './rulesversion';
import { nearestHub } from './settlements';
import { addEvent } from './events';
import { stageOf } from './people';
import { hyp } from './util';

export interface Township { id: number; name: string; x: number; y: number; founded: number }
export interface Participation {
 personId: number; requestId: number; since: number;
 status: 'supporting' | 'refused' | 'withdrawn'; reason: string;
 materials: Items; work: number;
}
export interface CivicProject {
 id: number; townshipId: number; siteId: number; organiserId: number;
 proposed: number; reason: string; status: 'active' | 'completed' | 'failed';
 outcome: string; ended?: number; buildingId?: number; participants: Participation[];
}
let enabled = true;
export const townshipsOn = () => enabled;
export function setTownships(on: boolean): void { enabled = on; }
export const hasTownships = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 12);

/** Called once at household formation. Movement cannot change membership. */
export function foundMembership(w: World, hh: Household, x: number, y: number): void {
 if (!hasTownships(w) || hh.townshipId !== undefined) return;
 const hub = nearestHub(w, x, y);
 const towns = w.townships ??= [];
 let town = towns.find(t => t.x === hub.x && t.y === hub.y);
 if (!town) {
  town = { id: w.nextId++, name: ['Willowbank', 'Stoneford', 'Alderfield', 'Reedwater', 'Highwood', 'Brookside'][towns.length] ?? `Township ${towns.length + 1}`, x: hub.x, y: hub.y, founded: w.tick };
  towns.push(town);
 }
 hh.townshipId = town.id;
}
export function townshipOf(w: World, p: Person): Township | undefined {
 const id = w.households.find(h => h.id === p.hhId)?.townshipId;
 return w.townships?.find(t => t.id === id);
}
export function projectAt(w: World, siteId: number): CivicProject | undefined {
 return hasTownships(w) ? w.civicProjects?.find(p => p.siteId === siteId) : undefined;
}
export function participation(w: World, p: Person, siteId: number): Participation | undefined {
 return projectAt(w, siteId)?.participants.find(m => m.personId === p.id);
}
export function mayWorkProject(w: World, p: Person, siteId: number): boolean {
 const project = projectAt(w, siteId);
 return !project || participation(w, p, siteId)?.status === 'supporting';
}
/** Existing plan_site has been chosen and physically marked out. No materials are created. */
export function proposeProject(w: World, p: Person, site: Site, reason: string): void {
 if (!hasTownships(w) || site.type !== 'storehouse') return;
 const town = townshipOf(w, p);
 if (!town) return;
 site.hhId = 0; // public store; grants no access to any private store or pack
 const projects = w.civicProjects ??= [];
 projects.push({ id: w.nextId++, townshipId: town.id, siteId: site.id, organiserId: p.id,
  proposed: w.tick, reason, status: 'active', outcome: '', participants: [
   { personId: p.id, requestId: 0, since: w.tick, status: 'supporting', reason: 'proposed this shared storehouse', materials: {}, work: 0 },
  ] });
 // Bounded recent project detail. Completed buildings and household ownership are never removed.
 const ended = projects.filter(q => q.status !== 'active');
 for (const old of ended.slice(0, Math.max(0, ended.length - 24))) projects.splice(projects.indexOf(old), 1);
 addEvent(w, 'social', `${p.name} proposed a shared storehouse for ${town.name}: ${reason}.`, [p.id, site.id], p.x, p.y);
}
/** A real, co-present conversation has reached its response phase. One answer per resident. */
export function recordProjectResponse(w: World, asker: Person, responder: Person, req: Request | undefined): void {
 if (!req || req.kind !== 'help_build') return;
 const project = projectAt(w, req.siteId);
 if (!project || project.organiserId !== asker.id || project.participants.some(m => m.personId === responder.id)) return;
 if (hyp(asker.x - responder.x, asker.y - responder.y) > 3 || asker.indoors !== responder.indoors) return;
 if (req.status !== 'promised' && req.status !== 'declined') return;
 project.participants.push({ personId: responder.id, requestId: req.id, since: w.tick,
  status: req.status === 'promised' ? 'supporting' : 'refused', reason: req.note || req.status, materials: {}, work: 0 });
}
export function creditProject(w: World, p: Person, siteId: number, item: ItemKind | null, amount: number): void {
 const m = participation(w, p, siteId);
 if (!m || amount <= 0) return;
 if (item) m.materials[item] = (m.materials[item] ?? 0) + amount;
 else m.work += amount;
}
/** Construction lifecycle owns the outcome. Only participants physically witnessing it learn it. */
export function finishProject(w: World, site: Site, building: Building | null, why: string): void {
 const project = projectAt(w, site.id);
 if (!project || project.status !== 'active') return;
 project.status = building ? 'completed' : 'failed';
 project.outcome = why; project.ended = w.tick;
 if (building) project.buildingId = building.id;
 for (const m of project.participants) {
  const p = w.byId.get(m.personId);
  if (!p || p.ent !== 'person' || !p.alive || p.indoors || hyp(p.x - site.x, p.y - site.y) > 8) continue;
  const memories = p.civicOutcomes ??= [];
  memories.push({ projectId: project.id, organiserId: project.organiserId, success: !!building, tick: w.tick });
  if (memories.length > 24) memories.shift();
 }
}
/** Trust in organising comes only from the respondent's own witnessed outcomes, once per project. */
export function organiserExperience(p: Person, organiserId: number): number {
 return Math.max(-0.12, Math.min(0.12, (p.civicOutcomes ?? []).filter(m => m.organiserId === organiserId).reduce((n, m) => n + (m.success ? 0.04 : -0.04), 0)));
}
/** Participation is revocable. Needs interrupt ordinary work already; sustained emergency withdraws support. */
export function reviewParticipation(w: World, p: Person): void {
 if (!hasTownships(w)) return;
 for (const project of w.civicProjects ?? []) {
  if (project.status !== 'active') continue;
  const m = project.participants.find(q => q.personId === p.id && q.status === 'supporting');
  if (!m) continue;
  const left = townshipOf(w, p)?.id !== project.townshipId;
  const urgent = p.needs.hunger < 12 || p.needs.thirst < 12 || p.health < 20;
  if (!left && !urgent) continue;
  m.status = 'withdrawn'; m.reason = left ? 'left the township' : 'urgent personal survival needs';
  // Release the promise without attributing a new moral failure; recorded request and contribution remain.
  for (const c of p.commitments) if (c.siteId === project.siteId && c.status === 'active') {
   c.status = 'interrupted'; c.reason = m.reason;
   const req = w.requests.find(r => r.id === c.requestId);
   if (req) { req.status = 'interrupted'; req.note = m.reason; req.resolved = w.tick; req.outcome = 'interrupted'; }
  }
  addEvent(w, 'social', `${p.name} withdrew from the shared storehouse: ${m.reason}.`, [p.id, project.siteId], p.x, p.y);
 }
}
export function canInvite(w: World, organiser: Person, q: Person, siteId: number): boolean {
 const project = projectAt(w, siteId);
 return !!project && project.status === 'active' && project.organiserId === organiser.id &&
  participation(w, organiser, siteId)?.status === 'supporting' && project.participants.length < 12 &&
  townshipOf(w, q)?.id === project.townshipId && stageOf(w, q) !== 'child' &&
  !project.participants.some(m => m.personId === q.id);
}

/** Load boundary: reject inconsistent civic references rather than inventing membership. */
export function validateTownships(w: World): void {
 if (!w.townships && !w.civicProjects && !w.households.some(h => h.townshipId !== undefined)) return;
 if (!runsRulesVersion(w, 12)) throw new Error('Civic records require township rules');
 const towns = w.townships ?? [];
 if (new Set(towns.map(t => t.id)).size !== towns.length) throw new Error('Duplicate township identity');
 for (const h of w.households) if (!towns.some(t => t.id === h.townshipId)) throw new Error('Unknown household township');
 for (const q of w.civicProjects ?? []) {
  if (!towns.some(t => t.id === q.townshipId)) throw new Error('Unknown project township');
  if (new Set(q.participants.map(m => m.personId)).size !== q.participants.length || q.participants.length > 12) throw new Error('Invalid project participants');
  if (q.status === 'active' && !w.sites.some(s => s.id === q.siteId)) throw new Error('Active project missing its physical site');
 }
}
