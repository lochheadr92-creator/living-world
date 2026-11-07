// The animation loop, guarded. Before this, one exception thrown by the world's clock or the renderer ended requestAnimationFrame
// for good: the picture froze, the interface stopped and nothing said why. Now each stage of a frame is caught on its own, the
// world is paused at the fault (Game.reportFault keeps it for the interface to show), and the next frame is always scheduled.
// DOM-free apart from the scheduler it is handed, so it is unit-testable; it never touches the world itself.
import { MAX_FRAME_DT, type Game } from './game';

/** which part of a frame failed: the world's clock (the simulation), the picture (the renderer) or the interface */
export type FrameStage = 'world' | 'picture' | 'interface';

export interface FrameFault {
  stage: FrameStage;
  message: string;
  /** the world's tick when it happened */
  tick: number;
}

export interface FrameStages {
  frame(dt: number): void;
  update(dt: number): void;
}

/** One frame: the clock is told how long the frame really was; animation and the interface never take a leap longer than MAX_FRAME_DT. */
export function runFrame(game: Game, stages: FrameStages, raw: number): void {
  guard(game, 'world', () => game.advance(raw));
  const dt = Math.min(MAX_FRAME_DT, Math.max(0, raw));
  guard(game, 'picture', () => stages.frame(dt));
  guard(game, 'interface', () => stages.update(dt));
}

function guard(game: Game, stage: FrameStage, run: () => void): void {
  try {
    run();
  } catch (err) {
    try {
      game.reportFault(stage, err);
    } catch {
      // reporting must never be what stops the loop
    }
  }
}

export type Scheduler = (cb: (now: number) => void) => unknown;

/** Start the loop. `each` runs after every frame (the autosave); whatever any of it throws, the next frame is scheduled. */
export function startFrameLoop(game: Game, stages: FrameStages, schedule: Scheduler, start: number, each?: (dt: number) => void): void {
  let last = start;
  const loop = (now: number): void => {
    try {
      const raw = (now - last) / 1000;
      last = now;
      runFrame(game, stages, raw);
      each?.(Math.min(MAX_FRAME_DT, Math.max(0, raw)));
    } catch (err) {
      try {
        game.reportFault('interface', err);
      } catch {
        // as above
      }
    } finally {
      schedule(loop);
    }
  };
  schedule(loop);
}
