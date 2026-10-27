// The observation's shape is pinned in the transcript header (observationVersion): a replay builds that shape, whatever the build's
// current one, so recorded runs keep replaying when the observation changes under a new version.
import { describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { OBSERVATION_VERSION } from '../src/agent/observe';
import { PROTOCOL_V11, PROTOCOL_V12, observationVersionFor } from '../src/agent/protocol';
import { runLive, runReplay } from '../src/agent/run';
import { pickerModel } from '../src/agent/stubs';
import { ReplayDiverged } from '../src/agent/transcript';
import type { Transcript } from '../src/agent/transcript';
import { hashWorld } from '../src/sim/world';
import { adult, remoteBushWorld } from './helpers/inhabit';

async function recorded(memory: boolean) {
  const { w } = remoteBushWorld(memory ? 'versions-memory' : 'versions-plain');
  const p = adult(w);
  const start = serializeWorld(w);
  const r = await runLive(w, p.id, pickerModel('first'), { until: w.tick + 300, memory });
  return { start, t: r.transcript, hash: hashWorld(r.world) };
}

const clone = (t: Transcript): Transcript => JSON.parse(JSON.stringify(t)) as Transcript;

describe('the observation version in the header', () => {
  it('a run records the version its protocol implies, and a replay reads it', async () => {
    const plain = await recorded(false);
    const noted = await recorded(true);
    expect(plain.t.header.protocol).toBe(PROTOCOL_V11);
    expect(plain.t.header.observationVersion).toBe(observationVersionFor(PROTOCOL_V11));
    expect(noted.t.header.protocol).toBe(PROTOCOL_V12);
    expect(noted.t.header.observationVersion).toBe(observationVersionFor(PROTOCOL_V12));
    expect(noted.t.header.observationVersion).toBe(OBSERVATION_VERSION);
    expect(hashWorld(runReplay(deserializeWorld(plain.start), plain.t).world)).toBe(plain.hash);
    expect(hashWorld(runReplay(deserializeWorld(noted.start), noted.t).world)).toBe(noted.hash);
  });

  it('a transcript recorded before the field replays by its protocol; one from a newer build is refused', async () => {
    const plain = await recorded(false);
    const old = clone(plain.t);
    delete old.header.observationVersion;
    expect(hashWorld(runReplay(deserializeWorld(plain.start), old).world)).toBe(plain.hash);
    const newer = clone(plain.t);
    newer.header.observationVersion = OBSERVATION_VERSION + 1;
    expect(() => runReplay(deserializeWorld(plain.start), newer)).toThrow(ReplayDiverged);
    expect(() => runReplay(deserializeWorld(plain.start), newer)).toThrow(/version/);
  });

  it('the header governs the shape: a current recording claimed as observation version 2 no longer matches', async () => {
    const plain = await recorded(false);
    expect(plain.t.asks.length).toBeGreaterThan(0);
    const wrong = clone(plain.t);
    wrong.header.observationVersion = 2;
    expect(() => runReplay(deserializeWorld(plain.start), wrong)).toThrow(/observes something different/);
  });
});
