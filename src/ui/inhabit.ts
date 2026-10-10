// The AI inhabitant panel (left column, above the feed): who is driven, what the model is doing, its last decision and reason, its
// notes, and a button to save the transcript. Everything here is read from the driver and the world; nothing is written to either.
import type { InhabitDriver } from '../app/inhabit';
import { clockText, dayNumber } from '../sim/environment';
import { h, setHidden, setText } from './dom';
import type { Part, UICtx } from './context';
import type { Slots } from './layout';

function downloadJson(name: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
  const body = h('div', { class: 'inhabit-body' }, detail, decision, notes, counters, h('div', { class: 'inhabit-actions' }, save, stop));
  const head = h('div', { class: 'inhabit-head' }, h('b', null, 'AI inhabitant'), who, status);
  const panel = h('section', { class: 'inhabit glass', 'aria-label': 'AI inhabitant' }, head, body);
  slots.left.prepend(panel);

  let lastKey = '';
  const render = (): void => {
    const w = game.world;
    const s = driver.status;
    status.dataset.state = s;
    setText(status, s === 'thinking' ? 'thinking…' : s);
    setText(who, driver.personName ? `${driver.personName} · ${driver.cfg.model}${driver.cfg.memory ? ' · notes' : ''}` : '');
    setText(detail, `${driver.detail}${driver.personName ? ` · day ${dayNumber(w.tick)} ${clockText(w.tick)}` : ''}`);
    const d = driver.lastDecision();
    if (d) {
      const label = d.call.choice.kind === 'pick' ? (d.ask.observation.options.find((o) => o.key === (d.call.choice as { key: string }).key)?.label ?? d.call.choice.key) : `engine (${d.call.choice.kind === 'fallback' ? d.call.choice.reason : ''})`;
      const res = d.call.result ? (d.call.result.status === 'applied' ? 'applied' : d.call.result.status === 'rejected' ? `refused: ${d.call.result.reason}` : `engine chose ${d.call.result.label ?? ''}`) : '';
      decision.replaceChildren(h('div', { class: 'inhabit-chosen' }, `${clockText(d.call.tick)} · ${label} → ${res}`), h('div', { class: 'inhabit-why' }, d.ask.proposal?.why ?? d.ask.problem ?? ''));
    } else decision.replaceChildren(h('div', { class: 'inhabit-why' }, 'No decision yet.'));
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
      setText(counters, m ? `inferences: ${m.new} new, ${m.kept} kept, ${m.strengthened} up, ${m.weakened} down, ${m.revised} revised, ${m.abandoned} dropped` : '');
      setHidden(notes, false);
    } else setHidden(notes, true);
    const t = driver.session?.transcript;
    if (t) setText(counters, `${counters.textContent ? counters.textContent + ' · ' : ''}decisions ${t.calls.filter((c) => c.result?.status === 'applied').length}, engine ${t.calls.filter((c) => c.result?.status === 'fallback').length}, refused ${t.calls.filter((c) => c.result?.status === 'rejected').length}`);
    setHidden(stop, s === 'finished' || s === 'dead' || s === 'failed');
  };
  const unsubscribe = driver.subscribe(render);
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
      panel.remove();
    },
  };
}
