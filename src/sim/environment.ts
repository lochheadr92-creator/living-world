import { DAY, SUNRISE, SUNSET, START_FRAC, TWILIGHT } from './constants';
import { coldSnap } from './hardship';
import { smoothstep, clamp } from './util';
import type { WeatherKind, World } from './types';
import { addEvent } from './events';

/** fraction of the current day, 0 = midnight, 0.5 = noon */
export function dayFraction(tick: number): number {
  return (tick / DAY + START_FRAC) % 1;
}

export function dayNumber(tick: number): number {
  return Math.floor(tick / DAY + START_FRAC) + 1;
}

export function lightAt(frac: number): number {
  const up = smoothstep(SUNRISE - TWILIGHT, SUNRISE + TWILIGHT, frac);
  const down = 1 - smoothstep(SUNSET - TWILIGHT, SUNSET + TWILIGHT, frac);
  return clamp(up * down, 0, 1);
}

export function clockText(tick: number): string {
  const f = dayFraction(tick);
  const mins = Math.floor(f * 24 * 60);
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function phaseName(frac: number): string {
  if (frac < SUNRISE - 0.03) return 'night';
  if (frac < SUNRISE + 0.08) return 'dawn';
  if (frac < 0.5) return 'morning';
  if (frac < 0.64) return 'afternoon';
  if (frac < SUNSET - 0.03) return 'evening';
  if (frac < SUNSET + 0.07) return 'dusk';
  return 'night';
}

export function isDark(world: World): boolean {
  return world.light < 0.35;
}

const TRANSITIONS: Record<WeatherKind, [WeatherKind, number][]> = {
  clear: [['clear', 0.52], ['cloudy', 0.38], ['rain', 0.1]],
  cloudy: [['clear', 0.36], ['cloudy', 0.2], ['rain', 0.34], ['storm', 0.1]],
  rain: [['cloudy', 0.46], ['rain', 0.22], ['clear', 0.1], ['storm', 0.22]],
  storm: [['rain', 0.6], ['cloudy', 0.4]],
};

const TARGET: Record<WeatherKind, { rain: number; cloud: number; storm: number; wind: number }> = {
  clear: { rain: 0, cloud: 0.08, storm: 0, wind: 0.22 },
  cloudy: { rain: 0, cloud: 0.55, storm: 0, wind: 0.4 },
  rain: { rain: 0.7, cloud: 0.8, storm: 0, wind: 0.6 },
  storm: { rain: 1, cloud: 1, storm: 1, wind: 1 },
};

function approach(v: number, target: number, rate: number): number {
  return v < target ? Math.min(target, v + rate) : Math.max(target, v - rate);
}

/** Per-tick environmental update: light, weather chain, ambient temperature. */
export function updateEnvironment(world: World): void {
  const w = world.weather;
  world.light = lightAt(dayFraction(world.tick));

  if (world.tick >= w.nextChange) {
    const harsh = world.settings.harsh;
    const table = TRANSITIONS[w.kind].map(([k, p]) => {
      let q = p;
      if (harsh && (k === 'rain' || k === 'storm')) q *= 1.6;
      if (harsh && k === 'clear') q *= 0.7;
      return [k, q] as [WeatherKind, number];
    });
    const total = table.reduce((s, [, p]) => s + p, 0);
    let r = world.rng.next() * total;
    let next: WeatherKind = table[0][0];
    for (const [k, p] of table) {
      if (r < p) {
        next = k;
        break;
      }
      r -= p;
    }
    if (next !== w.kind) {
      const text: Record<WeatherKind, string> = { clear: 'The sky clears.', cloudy: 'Clouds gather overhead.', rain: 'Rain begins to fall.', storm: 'A storm rolls in.' };
      addEvent(world, 'nature', text[next], [], world.camp.x, world.camp.y);
    }
    w.kind = next;
    const len = next === 'storm' ? world.rng.range(500, 1100) : world.rng.range(800, 2300);
    w.nextChange = world.tick + Math.round(len);
  }
  const tg = TARGET[w.kind];
  w.rain = approach(w.rain, tg.rain, 0.004);
  w.cloud = approach(w.cloud, tg.cloud, 0.003);
  w.storm = approach(w.storm, tg.storm, 0.005);
  w.wind = approach(w.wind, tg.wind, 0.004);

  const f = dayFraction(world.tick);
  const base = 12 + 7 * Math.cos(Math.PI * 2 * (f - 0.58));
  w.temp = base - w.cloud * 1.5 - w.rain * 4 - w.storm * 3 - (world.settings.harsh ? 4 : 0) - coldSnap(world);
}

export function weatherLabel(w: World['weather']): string {
  if (w.storm > 0.5) return 'Storm';
  if (w.rain > 0.35) return 'Rain';
  if (w.cloud > 0.35) return 'Cloudy';
  return 'Clear';
}
