// LW-01, the cancellation discard (review 2, social.ts cancel_request; code-read only in the review, reproduced here at rules 115):
// a helper whose repair was paused for the conversation hears the requester cancel, and the paused repair was dropped with no
// ending. At rules 116 it ends 'interrupted' through the common path while the helper's conversation carries on untouched.
// Rules 115 keeps the silent drop. Staged real acceptance, inspection, rendezvous and conversation (tests/helpers/request_cancellation.ts).
import { afterEach, expect, it } from 'vitest';
import { cancellationContactScene } from './helpers/request_cancellation';
import { handlerOf, startActivity } from '../src/sim/activities';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { setExternalController } from '../src/sim/external';
import { stepWorld } from '../src/sim/world';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { conservationReport } from '../src/sim/economy';
import { setSuspendedEndings } from '../src/sim/suspended_endings';

afterEach(() => setSuspendedEndings(true));

function run(version: number) {
  const f = cancellationContactScene(version);
  const helper = f.helper, parent = f.parent;
  helper.cooldowns.pause = 0;
  const repair = generateOptions(f.w, helper, true, true).options.find((o) => o.kind === 'repair' && o.targetId === f.hut.id)!;
  expect(repair).toBeDefined();
  const work = repair.make!()!;
  startActivity(f.w, helper, work);
  helper.decisions = [{ tick: f.w.tick, trigger: 'staged', key: 'repair', chosen: work.label, kind: work.kind, targetId: work.targetId, forPlan: 0, activityId: work.id, passedOver: [], setAside: [] }];
  helper.decisionsDropped = 0;
  parent.cooldowns.pause = 0;
  const cancel = rankOptions(generateOptions(f.w, parent, true, true)).find((o) => o.tag === 'cancel')!;
  startActivity(f.w, parent, cancel.make!()!);
  const endings: string[] = [];
  let onEnds = 0, talkAtEnding: number | null = null;
  const h = handlerOf('repair')!, orig = h.onEnd;
  h.onEnd = (...args) => { if (args[2].id === work.id) onEnds++; orig?.(...args); };
  f.w.hooks = { onActivityEnd: (_p, a, o, d) => { if (a.id === work.id) endings.push(`${o}:${d}`); } };
  let paused = false, talkBefore: number | null = null;
  const restore = setExternalController({ controls: (_w, p) => [parent.id, helper.id].includes(p.id), choose: () => ({ kind: 'defer' }) });
  try {
    for (let n = 0; n < 400 && !helper.socialMemory?.some((m) => m.cancellation); n++) {
      if (helper.suspended?.id === work.id) { paused = true; talkBefore = helper.activity?.id ?? null; }
      stepWorld(f.w);
      if (endings.length && talkAtEnding === null) talkAtEnding = helper.activity?.id ?? -1;
    }
  } finally { restore(); h.onEnd = orig; }
  const c = helper.commitments.find((x) => x.id === work.data.commitmentId) ?? helper.commitments.find((x) => x.destId === f.hut.id);
  return { f, helper, work, endings, onEnds, paused, talkBefore, talkAtEnding, c };
}

it('a heard cancellation ends the paused repair through the common path and leaves the conversation running (rules 116)', () => {
  const r = run(116);
  expect(r.paused).toBe(true);
  expect(r.c?.status).toBe('cancelled');
  expect(r.helper.suspended).toBeNull();
  expect(r.endings).toHaveLength(1);
  expect(r.endings[0]).toMatch(/^interrupted:.+ cancelled the request it was for$/);
  expect(r.onEnds).toBe(1);
  expect(r.work.claims.filter((id) => r.f.w.reservations.has(id))).toEqual([]);
  expect(r.helper.lastResult?.outcome).toBe('interrupted');
  expect(r.helper.decisions?.find((d) => d.activityId === r.work.id)?.outcome).toBe('interrupted');
  // a cancelled promise records no failed attempt: the obligation ended by agreement, not by failing
  expect(r.c?.attempt).toBeUndefined();
  // the conversation the helper was in is the same activity after the paused work ended
  expect(r.talkAtEnding).toBe(r.talkBefore);
  expect(r.helper.log.some((l) => l.text === 'Stopped the suspended work after hearing its cancellation.')).toBe(true);
  const copy = deserializeWorld(serializeWorld(r.f.w));
  for (let n = 0; n < 200; n++) { stepWorld(r.f.w); stepWorld(copy); }
  expect(serializeWorld(copy)).toBe(serializeWorld(r.f.w));
  expect(r.endings).toHaveLength(1);
  expect(conservationReport(r.f.w).ok).toBe(true);
});

it('rules 115 keeps the historical silent drop on a heard cancellation', () => {
  const r = run(115);
  expect(r.paused).toBe(true);
  expect(r.c?.status).toBe('cancelled');
  expect(r.helper.suspended).toBeNull();
  expect(r.endings).toEqual([]);
  expect(r.onEnds).toBe(0);
  expect(r.helper.lastResult ?? null).toBeNull();
});
