import type { EventKind, LogEntry, Person, Speech, World } from './types';

const MAX_EVENTS = 500;
const MAX_FX = 400;
const MAX_LOG = 60;

/** the most the chronicle keeps (rich only) */
export const CHRONICLE_MAX = 400;

/** What the settlement's record keeps after the feed has forgotten it: lives, the land, what was built, what was held, what was fought over. */
export function chronicleWorthy(kind: EventKind, text: string): boolean {
  switch (kind) {
    case 'life':
    case 'nature':
    case 'conflict':
      return true;
    case 'build':
      return text.includes(' finished ') || text.includes(' lit a ');
    case 'social':
      return text.includes(' is over: ') || text.includes(' is called at ');
    case 'work':
      return text.includes('brought down a deer') || text.includes('apprentice') || text.includes("'s trade") || text.includes('own right');
    case 'danger':
      return text.includes('fatally') || text.includes(' got a ');
    case 'trade':
      return text.includes('at the market');
    default:
      return false;
  }
}

/** Meaningful happenings for the feed. */
export function addEvent(world: World, kind: EventKind, text: string, ids: number[] = [], x = 0, y = 0): void {
  const ev = { id: world.nextId++, tick: world.tick, kind, text, ids, x, y };
  world.events.push(ev);
  if (world.events.length > MAX_EVENTS) world.events.splice(0, world.events.length - MAX_EVENTS);
  // the chronicle (rich only) keeps what is worth remembering after the feed has rolled on
  if (world.settings.dynamics === 'rich' && chronicleWorthy(kind, text)) {
    const c = (world.chronicle ??= []);
    c.push(ev);
    if (c.length > CHRONICLE_MAX) c.splice(0, c.length - CHRONICLE_MAX);
  }
}

/** A person's own memory of what happened to them. */
export function addLog(world: World, p: Person, kind: LogEntry['kind'], text: string): void {
  p.log.push({ tick: world.tick, text, kind });
  if (p.log.length > MAX_LOG) p.log.splice(0, p.log.length - MAX_LOG);
}

/** Cosmetic effects queue read by the renderer (never read by the simulation). */
export function addFx(world: World, type: string, x: number, y: number, a = 0): void {
  world.fx.push({ tick: world.tick, type, x, y, a });
  if (world.fx.length > MAX_FX) world.fx.splice(0, world.fx.length - MAX_FX);
}

export function say(world: World, p: Person, text: string, kind: Speech['kind'] = 'say', ticks = 48): void {
  p.speech = { text, until: world.tick + ticks, kind };
}

export function setResult(world: World, p: Person, label: string, outcome: 'success' | 'failed' | 'interrupted' | 'partial', detail: string): void {
  p.lastResult = { tick: world.tick, label, outcome, detail };
}
