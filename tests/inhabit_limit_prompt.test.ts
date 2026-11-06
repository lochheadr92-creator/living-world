// Protocols 35/36 tell the model how to set an option's limits: the answer's "limit" key. Before, the observation advertised "limits" on an
// option and the parser accepted "limit", but no prompt named the key, and a differently spelled key was ignored without a word (the
// Milo life, review_evidence/lives-20261106). The line is said only under 35/36 and only when an option on offer lists limits, so every
// older prompt stays as it was recorded.
import { describe, expect, it } from 'vitest';
import { observationFromPrompt, buildPrompt, parseProposal, PROTOCOL_V33, PROTOCOL_V34, PROTOCOL_V35, PROTOCOL_V36, protocolFor, protocolHasMemory, observationVersionFor } from '../src/agent/protocol';
import { runLive } from '../src/agent/run';
import type { ModelClient } from '../src/agent/model';
import { adult } from './helpers/inhabit';
import { natural, run } from './helpers/util';

const SAYS_LIMIT = 'add a "limit" object to your answer';

describe('the "limit" key in the prompt', () => {
  it('is said under protocols 35 and 36, when an option lists limits, and never before', async () => {
    const w = natural('meadow');
    run(w, 300);
    const p = adult(w);
    const sent: { user: string; limits: boolean }[] = [];
    const model: ModelClient = {
      id: 'capture', kind: 'stub', config: {},
      async complete(req) {
        const o = observationFromPrompt(req.user)!;
        sent.push({ user: req.user, limits: o.options.some((x) => x.limits && x.limits.length > 0) });
        return { text: JSON.stringify({ choose: (o.options.find((x) => x.limits && x.limits.length) ?? o.options[0]).key, why: 'prefers an option that lists limits' }) };
      },
    };
    const r = await runLive(w, p.id, model, { until: w.tick + 1500, memory: false });
    expect(r.transcript.header.protocol).toBe(PROTOCOL_V35);
    expect(sent.length).toBeGreaterThan(2);
    // every prompt the live run sent says it exactly when an option lists limits
    expect(sent.some((s) => s.limits)).toBe(true);
    for (const s of sent) expect(s.user.includes(SAYS_LIMIT)).toBe(s.limits);
    // and a recorded ask rebuilt under the older protocols or with no protocol is as it was
    const withLimits = r.transcript.asks.find((a) => a.observation.options.some((x) => x.limits && x.limits.length > 0))!;
    const without = r.transcript.asks.find((a) => !a.observation.options.some((x) => x.limits && x.limits.length > 0));
    for (const protocol of [undefined, PROTOCOL_V33, PROTOCOL_V34]) {
      expect(buildPrompt({ observation: withLimits.observation, protocol }).user).not.toContain(SAYS_LIMIT);
    }
    for (const protocol of [PROTOCOL_V35, PROTOCOL_V36]) {
      const user = buildPrompt({ observation: withLimits.observation, protocol, memory: protocol === PROTOCOL_V36 }).user;
      expect(user).toContain(SAYS_LIMIT);
      expect(user).toContain('"limit": {"<field>": <number>}');
    }
    if (without) expect(buildPrompt({ observation: without.observation, protocol: PROTOCOL_V35 }).user).not.toContain(SAYS_LIMIT);
  }, 300_000);

  it('names the key the parser takes, and the new pair keeps observation 18 and the memory split', () => {
    const named = parseProposal(JSON.stringify({ choose: 'eat:0', limit: { portions: 2 }, why: 'x' }));
    expect(named.proposal?.limit).toEqual({ portions: 2 });
    // the spelling the prompt warns about is still ignored, not guessed at
    const misspelt = parseProposal(JSON.stringify({ choose: 'eat:0', limits: { portions: 2 }, why: 'x' }));
    expect(misspelt.proposal?.limit).toBeUndefined();
    expect(protocolFor(false)).toBe(PROTOCOL_V35);
    expect(protocolFor(true)).toBe(PROTOCOL_V36);
    expect(protocolHasMemory(PROTOCOL_V35)).toBe(false);
    expect(protocolHasMemory(PROTOCOL_V36)).toBe(true);
    expect(observationVersionFor(PROTOCOL_V35)).toBe(18);
    expect(observationVersionFor(PROTOCOL_V36)).toBe(18);
  });
});
