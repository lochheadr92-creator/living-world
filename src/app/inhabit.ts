// The AI inhabitant in the app (docs/INHABITANT.md): the same LiveSession the headless runner uses, driven by the Game's clock.
//
// Started from the page's query string, e.g.  ?inhabit=Pavel&api=openai&model=gpt-5&memory=1&seed=meadow&harsh=1&from=1&days=5
// The world is made from those settings, fast-forwarded to the start day, the person selected and followed, and the clock given two
// hooks: before a tick (a snapshot when the person is about to be free) and after it (an open ask pauses the clock; when the model has
// answered, the tick is rewound and run again with the answer, and the clock resumes). The model is reached through the dev server
// (scripts/inhabit/devserver.ts), so no key ever enters the browser. The transcript can be saved at any moment and replays headlessly.
import { DAY } from '../sim/constants';
import { settingsForProfile } from '../sim/profiles';
import type { ProfileName } from '../sim/profiles';
import type { InhabitantNotes, Settings, World } from '../sim/types';
import { LiveSession, livingPerson } from '../agent/run';
import type { ModelClient } from '../agent/model';
import type { Ask, Call, Transcript } from '../agent/transcript';
import type { Game } from './game';
import type { Prefs } from './prefs';

export interface InhabitConfig {
  /** the person's name, or '' for the first adult */
  person: string;
  api: 'openai' | 'anthropic';
  model: string;
  effort: string;
  memory: boolean;
  showScores: boolean;
  /** the day to fast-forward to before the model takes over */
  fromDay: number;
  /** stop after this many days (null: until stopped) */
  days: number | null;
  seed: string;
  harsh: boolean;
  rich: boolean;
  size: ProfileName;
  arrivals: boolean;
}

/** the page's query string, or null when it does not ask for an inhabitant */
export function inhabitConfigFromUrl(search: string, prefs: Pick<Prefs, 'seed'>): InhabitConfig | null {
  const q = new URLSearchParams(search);
  if (!q.has('inhabit')) return null;
  const on = (k: string): boolean => ['1', 'true', 'yes', 'on'].includes((q.get(k) ?? '').toLowerCase());
  const api = q.get('api') === 'anthropic' ? 'anthropic' : 'openai';
  const size = q.get('size');
  return {
    person: q.get('inhabit') ?? '',
    api,
    model: q.get('model') ?? (api === 'anthropic' ? 'claude-opus-5-5' : 'gpt-5'),
    effort: q.get('effort') ?? '',
    memory: on('memory'),
    showScores: on('scores'),
    fromDay: Math.max(0, Number(q.get('from') ?? '1') || 0),
    days: q.has('days') ? Math.max(0, Number(q.get('days')) || 0) : null,
    seed: q.get('seed') ?? prefs.seed,
    harsh: on('harsh'),
    rich: on('rich'),
    size: size === 'large' || size === 'huge' ? size : 'normal',
    arrivals: !on('noarrivals'),
  };
}

export function settingsFromConfig(cfg: InhabitConfig): Settings {
  return settingsForProfile(cfg.size, cfg.seed, { harsh: cfg.harsh, immigration: cfg.arrivals, dynamics: cfg.rich ? 'rich' : 'authored' });
}

/** the model as the browser reaches it: through the dev server, which holds the key and the SDKs */
export function httpModel(cfg: Pick<InhabitConfig, 'api' | 'model' | 'effort'>, url = '/__inhabit/model'): ModelClient {
  return {
    id: cfg.model,
    kind: 'api',
    config: { api: cfg.api, ...(cfg.effort ? { effort: cfg.effort } : {}), via: 'dev-server' },
    async complete(req, signal) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ api: cfg.api, model: cfg.model, effort: cfg.effort || undefined, system: req.system, user: req.user, maxOutputTokens: req.maxOutputTokens }),
        signal,
      });
      const body = (await res.json().catch(() => ({ error: `the dev server answered ${res.status} with no JSON` }))) as { text?: string; usage?: { input: number; output: number }; stop?: string; error?: string };
      if (!res.ok || typeof body.text !== 'string') throw new Error(body.error ?? `the dev server answered ${res.status}`);
      return { text: body.text, usage: body.usage, stop: body.stop };
    },
  };
}

export type InhabitStatus = 'preparing' | 'running' | 'thinking' | 'finished' | 'dead' | 'failed';

/** Drives one LiveSession from the Game's clock. */
export class InhabitDriver {
  status: InhabitStatus = 'preparing';
  /** a line for the panel: what is going on right now */
  detail = '';
  personId = 0;
  personName = '';
  session: LiveSession | null = null;
  untilTick: number | null = null;
  private appliedBefore = -1;
  private pending: Promise<void> | null = null;
  private listeners = new Set<() => void>();
  private resumeSpeed = 1;

  constructor(
    readonly game: Game,
    readonly cfg: InhabitConfig,
    private readonly model: ModelClient = httpModel(cfg),
  ) {}

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private set(status: InhabitStatus, detail = ''): void {
    this.status = status;
    this.detail = detail;
    for (const l of this.listeners) l();
  }

  /** fast-forward to the start day in small chunks (the page stays responsive), then hand the person to the model */
  async start(): Promise<void> {
    const game = this.game;
    game.setPlaying(false);
    const target = Math.round(this.cfg.fromDay * DAY);
    while (game.world.tick < target) {
      game.advanceTicks(Math.min(120, target - game.world.tick));
      this.set('preparing', `fast-forwarding to day ${this.cfg.fromDay} (${Math.round((100 * game.world.tick) / Math.max(1, target))}%)`);
      await new Promise<void>((r) => setTimeout(r, 0));
    }
    this.begin();
  }

  private begin(): void {
    const game = this.game;
    const w = game.world;
    const person = this.cfg.person ? w.persons.find((q) => q.alive && q.name === this.cfg.person) : w.persons.find((q) => q.alive && (w.tick - q.birthTick) / DAY / 12 >= 20);
    if (!person) {
      this.set('failed', this.cfg.person ? `nobody alive is called ${this.cfg.person}; try one of ${w.persons.filter((q) => q.alive).map((q) => q.name).join(', ')}` : 'no adult to inhabit');
      return;
    }
    this.personId = person.id;
    this.personName = person.name;
    try {
      this.session = new LiveSession(w, person.id, this.model, { memory: this.cfg.memory, observe: { showScores: this.cfg.showScores } });
    } catch (e) {
      this.set('failed', e instanceof Error ? e.message : String(e));
      return;
    }
    this.untilTick = this.cfg.days !== null ? w.tick + Math.round(this.cfg.days * DAY) : null;
    game.focusEntity(person.id);
    game.setFollow(true);
    game.tickHooks = { beforeTick: () => this.onBeforeTick(), afterTick: () => this.onAfterTick() };
    this.set('running', `${person.name} is driven by ${this.model.id}${this.cfg.memory ? ', keeping notes' : ''}`);
    game.setPlaying(true);
  }

  private onBeforeTick(): void {
    const s = this.session;
    if (!s) return;
    this.appliedBefore = s.lastApplied();
    if (!s.beforeTick(this.game.world)) this.end('dead', `${this.personName} died`);
  }

  private onAfterTick(): boolean {
    const s = this.session;
    const game = this.game;
    if (!s) return true;
    const ask = s.afterTick(game.world);
    if (!ask) {
      s.settle(game.world, this.appliedBefore);
      if (this.untilTick !== null && game.world.tick >= this.untilTick) {
        this.end('finished', `the ${this.cfg.days}-day window is over; save the transcript to keep it`);
        return false;
      }
      return true;
    }
    // the model must be consulted: the clock stops, the answer is awaited, the tick rewound and run again with it
    this.resumeSpeed = game.speed;
    game.setPlaying(false);
    this.set('thinking', `${this.personName} is deciding (${ask.observation.options.length} options, ask ${ask.seq + 1})…`);
    this.pending = s
      .answer(ask)
      .then(() => {
        if (!this.session) return;
        game.world = s.rewind(ask);
        this.set('running', ask.proposal ? `chose ${ask.proposal.choose}` : `the engine chooses (${ask.problem ?? 'no answer'})`);
        game.setSpeed(this.resumeSpeed);
        game.setPlaying(true);
      })
      .catch((e: unknown) => this.end('failed', e instanceof Error ? e.message : String(e)))
      .finally(() => {
        this.pending = null;
      });
    return false;
  }

  /** resolves once a pending answer has been applied (tests and tools) */
  idle(): Promise<void> {
    return this.pending ?? Promise.resolve();
  }

  private end(status: InhabitStatus, detail: string): void {
    const s = this.session;
    this.game.tickHooks = null;
    this.game.setPlaying(false);
    if (s) s.finish(this.game.world);
    this.set(status, detail);
  }

  /** stop driving the person (the world goes on by itself) */
  stop(): void {
    if (this.session) this.end('finished', 'stopped; save the transcript to keep it');
  }

  lastDecision(): { ask: Ask; call: Call } | null {
    const t = this.session?.transcript;
    if (!t) return null;
    for (let i = t.calls.length - 1; i >= 0; i--) {
      const c = t.calls[i];
      if (c.choice.kind !== 'defer' && c.result) return { ask: t.asks[c.ask], call: c };
    }
    return null;
  }

  notes(): InhabitantNotes | undefined {
    return this.game.world.inhabitants?.[this.personId]?.notes;
  }

  /** the transcript as it stands (with an end record for now); replayable by scripts/inhabit.ts --mode replay */
  transcriptNow(): Transcript | null {
    const s = this.session;
    if (!s) return null;
    return s.transcript.end ? s.transcript : s.snapshotTranscript(this.game.world);
  }

  /** the world the driver is looking at (after a rewind the game holds a new object) */
  world(): World {
    return this.game.world;
  }

  alive(): boolean {
    return livingPerson(this.game.world, this.personId) !== null;
  }
}
