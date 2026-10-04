import type { EventKind, LogEntry, Person, Speech, World } from './types';

const MAX_EVENTS = 500;
const MAX_FX = 400;
const MAX_LOG = 60;

/** Meaningful happenings for the feed. */
export function addEvent(world: World, kind: EventKind, text: string, ids: number[] = [], x = 0, y = 0): void {
  world.events.push({ id: world.nextId++, tick: world.tick, kind, text, ids, x, y });
  if (world.events.length > MAX_EVENTS) world.events.splice(0, world.events.length - MAX_EVENTS);
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
