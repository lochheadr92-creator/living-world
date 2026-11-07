// When to keep an autosave of the running world: after every few minutes of real time spent playing, never for a staged scene,
// never for a world whose clock has thrown (its state may be part-way through a tick), and never while the last copy is still
// being written. Where the copy goes is src/app/save.ts autosaveGame; this only decides when.
import type { Game } from './game';

/** real seconds of play between autosaves */
export const AUTOSAVE_EVERY = 180;

export class Autosaver {
  private played = 0;
  private busy = false;
  private lastTick = -1;

  constructor(
    private readonly game: Game,
    private readonly write: (game: Game) => Promise<boolean>,
  ) {}

  /** called once a frame with the frame's real seconds */
  frame(dt: number): void {
    const g = this.game;
    if (!g.playing || g.worldFaulted || g.settings.scene !== 'natural' || this.busy) return;
    this.played += Math.max(0, dt);
    if (this.played < AUTOSAVE_EVERY || g.world.tick === this.lastTick) return;
    this.played = 0;
    this.lastTick = g.world.tick;
    this.busy = true;
    this.write(g)
      .catch(() => false)
      .finally(() => {
        this.busy = false;
      });
  }
}
