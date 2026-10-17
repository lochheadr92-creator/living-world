// The AI inhabitant in the app (docs/INHABITANT.md): the same LiveSession the headless runner uses, driven by the Game's clock.
//
// Started from the page's query string, e.g.  ?inhabit=Pavel&api=openai&model=gpt-5&memory=1&seed=meadow&from=1&days=5
// The world is made from those settings, fast-forwarded to the start day, the person selected and followed, and the clock given two
// hooks: before a tick (a snapshot when the person is about to be free) and after it (an open ask pauses the clock; when the model has
// answered, the tick is rewound and run again with the answer, and the clock resumes). The model is reached through the dev server
// (scripts/inhabit/devserver.ts), so no key ever enters the browser. The transcript can be saved at any moment and replays headlessly.
import { DAY } from '../sim/constants';
import { settingsForProfile } from '../sim/profiles';
import type { ProfileName } from '../sim/profiles';
import type { InhabitantNotes, Settings, World } from '../sim/types';
import { LiveSession, livingPerson } from '../agent/run';
import { DEFAULT_BUDGET, RetryableModelError } from '../agent/model';
import type { ModelClient, ModelRequest } from '../agent/model';
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
  /** a person answered by hand (or by a chat, through the panel): no key, no model call, no network */
  manual: boolean;
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
    // Explicit rich=0 remains a diagnostic/reproduction option; ordinary links use the current simulation.
    rich: !q.has('rich') || on('rich'),
    size: size === 'large' || size === 'huge' || size === 'town' ? size : 'normal',
    arrivals: !on('noarrivals'),
    manual: on('manual'),
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
      const body = (await res.json().catch(() => ({ error: `the dev server answered ${res.status} with no JSON` }))) as { text?: string; usage?: { input: number; output: number }; stop?: string; error?: string; retryable?: boolean; retryAfterMs?: number };
      if (!res.ok || typeof body.text !== 'string') {
        const msg = body.error ?? `the dev server answered ${res.status}`;
        // a rate limit or an outage reported by the dev server is the provider's, not the model's: the gate waits it out
        throw body.retryable ? new RetryableModelError(msg, body.retryAfterMs) : new Error(msg);
      }
      return { text: body.text, usage: body.usage, stop: body.stop };
    },
  };
}

/**
 * A person answered by hand. The same ModelClient seam the API models use, but `complete` hands the prompt to the panel and waits:
 * the clock is already stopped while a decision is pending (the driver stops it before awaiting), so thinking time never moves the
 * world. One decision is pending at a time; an answer to a decision that is no longer pending is refused, so a stale or repeated
 * submission cannot be applied to the wrong tick. No key, no network, no model call.
 */
export interface ManualModel extends ModelClient {
  /** the prompt now waiting for an answer, or null when nothing is waiting */
  waiting(): { system: string; user: string; id: number } | null;
  /** answer the waiting prompt with the raw JSON a controller would send. False: nothing is waiting, or `id` is stale */
  submit(text: string, id?: number): boolean;
  /** decline this decision: the engine chooses, and the transcript says why */
  decline(reason: string, id?: number): boolean;
  /** give up on whatever is waiting (control is going back to the engine): nothing is chosen and nothing stays pending */
  abandon(reason: string): boolean;
  onChange(fn: () => void): () => void;
}

export function manualModel(): ManualModel {
  let pending: { req: ModelRequest; id: number; resolve: (r: { text: string }) => void; reject: (e: Error) => void } | null = null;
  let nextId = 1;
  const listeners = new Set<() => void>();
  const changed = (): void => {
    for (const l of listeners) l();
  };
  return {
    id: 'manual',
    kind: 'manual',
    config: { by: 'hand' },
    complete(req, signal) {
      // A second ask while one is open means the earlier moment has been overtaken (the tick it belonged to was replayed).
      // Supersede it rather than failing the call: a refusal here counts against the breaker and would end the session.
      if (pending) {
        const stale = pending;
        pending = null;
        stale.reject(new Error('that moment was overtaken before it was answered'));
      }
      return new Promise<{ text: string }>((resolve, reject) => {
        const id = nextId++;
        pending = { req, id, resolve, reject };
        const onAbort = (): void => {
          if (pending && pending.id === id) {
            pending = null;
            changed();
          }
          reject(new Error('the decision was abandoned'));
        };
        if (signal.aborted) onAbort();
        else signal.addEventListener('abort', onAbort, { once: true });
        changed();
      });
    },
    waiting() {
      return pending ? { system: pending.req.system, user: pending.req.user, id: pending.id } : null;
    },
    submit(text, id) {
      if (!pending || (id !== undefined && id !== pending.id)) return false;
      const p = pending;
      pending = null;
      p.resolve({ text });
      changed();
      return true;
    },
    decline(reason, id) {
      if (!pending || (id !== undefined && id !== pending.id)) return false;
      const p = pending;
      pending = null;
      // an answer with no usable choice: the gate records it and the engine chooses, exactly as a refusing model would
      p.resolve({ text: JSON.stringify({ choose: '', why: reason }) });
      changed();
      return true;
    },
    abandon(reason) {
      if (!pending) return false;
      const p = pending;
      pending = null;
      p.reject(new Error(reason));
      changed();
      return true;
    },
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
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
  /** the session is over. An answer still in flight resolves normally (the gate turns a refusal into a recorded failure, not a
   *  rejection), so without this a late completion would set the driver running again after Stop. */
  private over = false;
  private listeners = new Set<() => void>();
  private resumeSpeed = 1;

  constructor(
    readonly game: Game,
    readonly cfg: InhabitConfig,
    private readonly model: ModelClient = cfg.manual ? manualModel() : httpModel(cfg),
  ) {}

  /** the hand-control handle, when this person is answered by hand */
  manual(): ManualModel | null {
    return this.model.kind === 'manual' ? (this.model as ManualModel) : null;
  }

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
      // Answering by hand takes as long as it takes: the clock is stopped meanwhile, so no wall-clock cap belongs on it.
      // 2**31-1 ms (about 24 days) is the largest a timer takes: anything above it silently becomes 1 ms and would abort at once.
      const budget = this.model.kind === 'manual' ? { ...DEFAULT_BUDGET, timeoutMs: 2 ** 31 - 1, maxCallsPerDay: 2 ** 20 } : undefined;
      this.session = new LiveSession(w, person.id, this.model, { memory: this.cfg.memory, observe: { showScores: this.cfg.showScores }, ...(budget ? { budget } : {}) });
    } catch (e) {
      this.set('failed', e instanceof Error ? e.message : String(e));
      return;
    }
    this.untilTick = this.cfg.days !== null ? w.tick + Math.round(this.cfg.days * DAY) : null;
    game.focusEntity(person.id);
    game.setFollow(true);
    game.tickHooks = { beforeTick: () => this.onBeforeTick(), afterTick: () => this.onAfterTick() };
    this.set('running', `${person.name} is ${this.model.kind === 'manual' ? 'answered by hand' : `driven by ${this.model.id}`}${this.cfg.memory ? ', keeping notes' : ''}`);
    game.setPlaying(true);
  }

  private onBeforeTick(): boolean {
    const s = this.session;
    if (!s) return true;
    // An answer is outstanding: the world holds still. Without this the clock could be restarted under a waiting decision, run a
    // tick, and make the session ask a second time for a moment that was already open - which the model then had to refuse.
    if (this.pending) {
      this.game.setPlaying(false);
      return false;
    }
    this.appliedBefore = s.lastApplied();
    if (!s.beforeTick(this.game.world)) {
      this.end('dead', `${this.personName} died`);
      return false;
    }
    return true;
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
        if (!this.session || this.over) return;
        game.world = s.rewind(ask);
        this.set('running', ask.proposal ? `chose ${ask.proposal.choose}` : `the engine chooses (${ask.problem ?? 'no answer'})`);
        game.setSpeed(this.resumeSpeed);
        game.setPlaying(true);
      })
      .catch((e: unknown) => {
        if (!this.over) this.end('failed', e instanceof Error ? e.message : String(e));
      })
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
    this.over = true;
    const s = this.session;
    // a decision may be waiting for an answer by hand at this very moment: let it go, or it would sit there for ever and the
    // panel would go on offering a moment that no longer exists
    this.manual()?.abandon('control was handed back to the engine');
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
