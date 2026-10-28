// The AI inhabitant panel (left column, above the feed): who is driven, what the model is doing, its last decision and reason, its
// notes, and a button to save the transcript. Everything here is read from the driver and the world; nothing is written to either.
import type { InhabitDriver } from '../app/inhabit';
import { clockText, dayNumber } from '../sim/environment';
import { observationFromPrompt } from '../agent/protocol';
import { h, setHidden, setText } from './dom';
import type { Part, UICtx } from './context';
import type { Slots } from './layout';
import { lastInhabitantSummary, planPackSummary } from './inhabit_summary';

function downloadJson(name: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Hand control: a small panel for a person answered by hand (or by a chat). The game already shows who this person is, what they are
 * up to and what is stopping them, so this adds only the choice itself: a line of plain context and the actions on offer. The raw
 * observation and the decision-JSON box are a chat's business, so they stay folded away until asked for.
 * It writes nothing into the world: every answer goes through the same ModelClient seam an API model uses, and the engine validates it.
 */
function manualBlock(ctx: UICtx, driver: InhabitDriver): { el: HTMLElement; render: () => void } {
  const when = h('span', { class: 'inhabit-turn-when' });
  const head = h('div', { class: 'inhabit-turn-h' }, h('b', null, 'Your turn'), when);
  const line = h('div', { class: 'inhabit-turn-line' });
  const opts = h('div', { class: 'inhabit-opts' });
  const blocked = h('div', { class: 'inhabit-blocked' });
  const timeBasis = h('div', { class: 'inhabit-time-basis' });
  const engine = h(
    'button',
    {
      type: 'button',
      class: 'btn inhabit-engine',
      'data-tip': 'Let the engine decide this one',
      onClick: () => {
        const m = driver.manual();
        const w = m ? m.waiting() : null;
        if (m && w) m.decline('handed to the engine by the operator', w.id);
      },
    },
    'Let the engine choose',
  );
  const obsBox = h('textarea', { class: 'inhabit-obs', rows: '4', readonly: 'readonly', spellcheck: 'false', 'aria-label': 'everything this person can see, as a controller receives it' }) as HTMLTextAreaElement;
  const answer = h('textarea', { class: 'inhabit-answer', rows: '2', placeholder: 'a decision as JSON', spellcheck: 'false', 'aria-label': 'a decision as JSON' }) as HTMLTextAreaElement;
  const note = h('div', { class: 'inhabit-why' });
  const copy = h(
    'button',
    {
      type: 'button',
      class: 'btn',
      onClick: () => {
        obsBox.select();
        const done = (): void => ctx.toast('Observation copied', 'good');
        if (navigator.clipboard && navigator.clipboard.writeText) void navigator.clipboard.writeText(obsBox.value).then(done, () => ctx.toast('Select the box and copy', 'warn'));
        else done();
      },
    },
    'Copy',
  );
  const send = h(
    'button',
    {
      type: 'button',
      class: 'btn',
      onClick: () => {
        const m = driver.manual();
        const w = m ? m.waiting() : null;
        if (!m || !w) {
          setText(note, 'nothing is waiting just now');
          return;
        }
        if (!m.submit(answer.value, w.id)) setText(note, 'that moment has passed');
        else answer.value = '';
      },
    },
    'Submit',
  );
  const chat = h(
    'details',
    { class: 'inhabit-chat' },
    h('summary', null, 'Answer from a chat'),
    h('div', { class: 'inhabit-chat-body' }, obsBox, h('div', { class: 'inhabit-actions' }, copy, send), answer, note),
  );
  const plans = h('div', { class: 'inhabit-plans' });
  const el = h('div', { class: 'inhabit-manual' }, head, line, plans, blocked, timeBasis, opts, engine, chat);

  const WORDS: Record<string, string> = { hunger: 'hungry', thirst: 'thirsty', energy: 'tired', warmth: 'cold', safety: 'uneasy', social: 'lonely' };
  /** how this person is, in their own plain terms: only what is actually pressing */
  const pressing = (needs: Record<string, { value: number; state: string }>): string => {
    const bad = Object.keys(needs).filter((k) => needs[k].state !== 'ok');
    if (!bad.length) return 'in no particular need';
    return bad.map((k) => (needs[k].state === 'critical' ? 'very ' + (WORDS[k] ?? k) : WORDS[k] ?? k)).join(', ');
  };

  let shownId = -1;
  const render = (): void => {
    const m = driver.manual();
    const waiting = m ? m.waiting() : null;
    setHidden(el, !m);
    if (!m) return;
    setHidden(opts, !waiting);
    setHidden(blocked, !waiting);
    setHidden(plans, !waiting);
    setHidden(timeBasis, !waiting);
    setHidden(engine, !waiting);
    setHidden(chat, !waiting);
    if (!waiting) {
      setText(when, '');
      setText(line, 'Nothing to decide just now.');
      opts.replaceChildren();
      shownId = -1;
      return;
    }
    if (waiting.id === shownId) return; // the same moment: leave whatever is being typed alone
    shownId = waiting.id;
    const obs = observationFromPrompt(waiting.user);
    obsBox.value = waiting.user;
    setText(note, '');
    if (!obs) {
      setText(when, '');
      setText(line, 'A decision is waiting.');
      return;
    }
    setText(when, obs.time.clock);
    setText(timeBasis, obs.version >= 6 ? 'Action estimates and memory ages use the world clock.' : 'Action estimates use seconds at 1× playback.');
    blocked.replaceChildren(...obs.setAside.filter(o => o.label.startsWith('Make ') && o.reason.startsWith('Needs to '))
      .map(o => h('div', null, `${o.label}: ${o.reason}`)));
    const last = lastInhabitantSummary(obs.doing);
    setText(line, obs.self.name + ' is ' + pressing(obs.self.needs as never) + '.' + (last ? ' Last: ' + last + '.' : ''));
    const planText = planPackSummary(obs);
    setText(plans, planText);
    setHidden(plans, !planText);
    opts.replaceChildren(
      ...obs.options.map((o) => {
        // only a whole-number limit gets a box here; an action's other ranges are in the observation, for a chat to use
        const count = (o.limits ?? []).find((b) => b.kind === 'count');
        const box = count
          ? (h('input', {
              type: 'number',
              class: 'inhabit-n',
              min: String(count.min),
              max: String(count.max),
              step: '1',
              placeholder: String(count.max),
              title: count.note + ' (' + count.min + '-' + count.max + ')',
              'aria-label': 'how many: ' + count.min + ' to ' + count.max,
            }) as HTMLInputElement)
          : null;
        const take = h(
          'button',
          {
            type: 'button',
            class: 'btn inhabit-take' + (obs.version >= 6 || o.key.includes('#choice:') ? ' inhabit-distinct' : ''),
            title: o.label + (o.target ? ' — ' + o.target : '') + ' · about ' + o.eta,
            onClick: () => {
              const mm = driver.manual();
              const now = mm ? mm.waiting() : null;
              if (!mm || !now) {
                setText(note, 'nothing is waiting just now');
                return;
              }
              const v = box && box.value.trim() !== '' ? Number(box.value) : null;
              const body = { choose: o.key, why: 'chosen by hand', ...(v !== null && count ? { limit: { [count.field]: v } } : {}) };
              if (!mm.submit(JSON.stringify(body), now.id)) setText(note, 'that moment has passed');
            },
          },
          h('span', { class: 'inhabit-take-l' }, o.label),
          ...(o.key.includes('#choice:') ? [h('span', { class: 'inhabit-take-t' }, o.goal)] : []),
          h('span', { class: 'inhabit-take-t' }, o.target ?? ''),
          ...(obs.version >= 6 ? [h('span', { class: 'inhabit-take-t' }, `About ${o.eta}`)] : []),
        );
        return h('div', { class: 'inhabit-opt' }, take, ...(box ? [box] : []));
      }),
    );
  };
  return { el, render };
}

export function createInhabitPanel(ctx: UICtx, slots: Slots, driver: InhabitDriver): Part {
  const { game } = ctx;
  const status = h('span', { class: 'inhabit-status' });
  const who = h('span', { class: 'inhabit-who' });
  const detail = h('div', { class: 'inhabit-detail' });
  const decision = h('div', { class: 'inhabit-decision' });
  const notes = h('div', { class: 'inhabit-notes' });
  const counters = h('div', { class: 'inhabit-counters' });
  const save = h(
    'button',
    {
      type: 'button',
      class: 'btn',
      'data-tip': 'Save the transcript: it replays without the model (scripts/inhabit.ts --mode replay)',
      onClick: () => {
        const t = driver.transcriptNow();
        if (!t) return;
        downloadJson(`transcript-${t.header.seed}-${t.header.personName}-${t.end?.tick ?? game.world.tick}.json`, t);
        ctx.toast('Transcript saved', 'good');
      },
    },
    'Save transcript',
  );
  const stop = h('button', { type: 'button', class: 'btn', 'data-tip': 'Hand the person back to the engine', onClick: () => driver.stop() }, 'Stop');
  const manual = manualBlock(ctx, driver);
  const body = h('div', { class: 'inhabit-body' }, detail, decision, manual.el, notes, counters, h('div', { class: 'inhabit-actions' }, save, stop));
  const head = h('div', { class: 'inhabit-head' }, h('b', null, 'AI inhabitant'), who, status);
  const panel = h('section', { class: 'inhabit glass', 'aria-label': 'AI inhabitant' }, head, body);
  slots.left.prepend(panel);

  let lastKey = '';
  const render = (): void => {
    const w = game.world;
    const s = driver.status;
    status.dataset.state = s;
    setText(status, s === 'thinking' ? 'thinking…' : s);
    setText(who, driver.personName ? `${driver.personName} · ${driver.cfg.manual ? 'by hand' : driver.cfg.model}${driver.cfg.memory ? ' · notes' : ''}` : '');
    const askingByHand = driver.cfg.manual && driver.status === 'thinking';
    setText(detail, askingByHand ? `day ${dayNumber(w.tick)} ${clockText(w.tick)}` : `${driver.detail}${driver.personName ? ` · day ${dayNumber(w.tick)} ${clockText(w.tick)}` : ''}`);
    const d = driver.lastDecision();
    if (d) {
      const label = d.call.choice.kind === 'pick' ? (d.ask.observation.options.find((o) => o.key === (d.call.choice as { key: string }).key)?.label ?? d.call.choice.key) : `engine (${d.call.choice.kind === 'fallback' ? d.call.choice.reason : ''})`;
      const res = d.call.result ? (d.call.result.status === 'applied' ? 'applied' : d.call.result.status === 'rejected' ? `refused: ${d.call.result.reason}` : `engine chose ${d.call.result.label ?? ''}`) : '';
      // what the choice came to is a separate thing from whether it was accepted: an accepted haul is not a delivered one
      const done = d.call.result?.activityId !== undefined ? driver.session?.transcript.outcomes.find((o) => o.activityId === d.call.result!.activityId) : undefined;
      const came = done ? `${done.outcome}${done.detail ? `: ${done.detail}` : ''}` : res === 'applied' ? 'still under way' : '';
      decision.replaceChildren(
        h('div', { class: 'inhabit-chosen' }, `${clockText(d.call.tick)} · ${label} → ${res}`),
        ...(came ? [h('div', { class: 'inhabit-came' }, came)] : []),
        h('div', { class: 'inhabit-why' }, d.ask.proposal?.why ?? d.ask.problem ?? ''),
      );
    } else decision.replaceChildren();
    const tally: string[] = [];
    const n = driver.notes();
    if (n) {
      const list = (title: string, items: string[]): HTMLElement[] => (items.length ? [h('div', { class: 'inhabit-list' }, h('div', { class: 'inhabit-list-h' }, title), ...items.map((t) => h('div', { class: 'inhabit-item' }, t)))] : []);
      notes.replaceChildren(
        ...list('Goals', n.goals.map((g) => g.text)),
        ...list('Intentions', n.intentions.map((g) => g.text)),
        ...list('Inferences', n.inferences.map((i) => `${i.text} (${i.confidence})`)),
        ...list('Uncertain', n.uncertainties.map((g) => g.text)),
        ...list('Journal', n.journal.slice(-3).map((j) => `${clockText(j.tick)} ${j.text}`)),
      );
      const m = w.inhabitants?.[driver.personId]?.memory;
      if (m) tally.push(`inferences: ${m.new} new, ${m.kept} kept, ${m.strengthened} up, ${m.weakened} down, ${m.revised} revised, ${m.abandoned} dropped`);
      setHidden(notes, false);
    } else setHidden(notes, true);
    const t = driver.session?.transcript;
    if (t) tally.push(`decisions ${t.calls.filter((c) => c.result?.status === 'applied').length}, engine ${t.calls.filter((c) => c.result?.status === 'fallback').length}, refused ${t.calls.filter((c) => c.result?.status === 'rejected').length}`);
    // built fresh every time: reading the line back and appending to it grew it without end in a run that keeps no notes
    setText(counters, tally.join(' · '));
    setHidden(stop, s === 'finished' || s === 'dead' || s === 'failed');
    manual.render();
  };
  const unsubscribe = driver.subscribe(render);
  // a hand-answered decision arrives between ticks, so the panel follows the manual model as well as the driver
  const unwatch = driver.manual()?.onChange(render);
  let acc = 0;
  render();
  return {
    update(dt: number): void {
      acc += dt;
      if (acc < 0.25) return;
      acc = 0;
      const key = `${driver.status}|${game.world.tick >> 4}|${driver.session?.transcript.calls.length ?? 0}`;
      if (key === lastKey) return;
      lastKey = key;
      render();
    },
    dispose(): void {
      unsubscribe();
      unwatch?.();
      panel.remove();
    },
  };
}
