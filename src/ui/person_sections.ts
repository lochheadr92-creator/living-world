// The collapsible sections under the "What are they up to?" card in the person view: the social contract (conversation, shared
// meal, promises, quarrels, worries: person_social.ts), opportunities, relationships, requests, recent experiences, what they
// know, family, traits and skills, and (debug only) the last decision. A section's body is only filled in while it is open, so a closed section costs nothing.
import type { OpportunityView, PersonView, RelationView, RequestView } from '../sim/inspect';
import { cap, h, KeyedList, setBool, setHidden, setState, setText, setVar, setWidth, signed, toggle } from './dom';
import { icon, setIcon } from './icons';
import { makeBar, makeSection, type BarHandle, type SectionHandle } from './widgets';
import { createPersonSocial } from './person_social';
import type { UICtx } from './context';

export interface SectionHooks {
  /** a section was opened or closed (the shell refreshes immediately so it fills in) */
  onSectionToggle(): void;
  /** the user followed a link inside the panel to another person (the shell keeps a way back) */
  onNavigate(id: number): void;
}

export interface PersonSections {
  el: HTMLElement;
  update(v: PersonView): void;
  /** the opportunities audit is the costly part of describePerson, so it is only requested while that section is open */
  wantsOpportunities(): boolean;
  /** forget what the debug block last showed (a different person was selected) */
  reset(): void;
}

const SECTION_DEFAULT: Record<string, boolean> = { talk: true, meal: true, commit: true, sore: true, worry: false, opp: true, rel: true, req: false, mem: false, know: false, fam: false, traits: false, debug: true };

const OPP_BADGE: Record<OpportunityView['status'], [tone: string, label: string]> = {
  chosen: ['good', 'Chosen'],
  unaware: ['info', 'Unaware'],
  'passed over': ['accent', 'Passed over'],
  blocked: ['warn', 'Blocked'],
  'failed before': ['danger', 'Failed before'],
  'not needed': ['muted', 'Not needed'],
};

const REQ_TONE: Record<string, string> = {
  pending: 'info',
  promised: 'accent',
  fulfilled: 'good',
  declined: 'warn',
  expired: 'muted',
  failed: 'danger',
  broken: 'danger',
};

const MEMORY_COLOR: Record<string, string> = {
  work: '#7fb069',
  social: '#e07bb0',
  need: '#e9a23b',
  danger: '#e5645c',
  life: '#8ec5ff',
  info: '#8fa8b8',
};

const TRAIT_LABEL: Record<string, [name: string, low: string, high: string]> = {
  generosity: ['Generosity', 'frugal', 'generous'],
  sociability: ['Sociability', 'reserved', 'sociable'],
  caution: ['Caution', 'bold', 'cautious'],
  diligence: ['Diligence', 'easygoing', 'diligent'],
  curiosity: ['Curiosity', 'homebody', 'curious'],
};

const SKILL_LABEL: Record<string, string> = {
  forage: 'Foraging',
  fish: 'Fishing',
  wood: 'Woodcutting',
  stone: 'Stonework',
  build: 'Building',
  farm: 'Farming',
  craft: 'Crafting',
  carpentry: 'Carpentry',
  kiln: 'Kiln work',
  smith: 'Smithing',
  bake: 'Baking',
};

const emptyNote = (text: string) => h('p', { class: 'empty' }, text);

// ───────────────────────── row components ─────────────────────────
interface OppRow {
  el: HTMLButtonElement;
  badge: HTMLElement;
  what: HTMLElement;
  dist: HTMLElement;
  detail: HTMLElement;
  item: OpportunityView | null;
}

interface RelRow {
  el: HTMLElement;
  name: HTMLButtonElement;
  label: HTMLElement;
  avoid: HTMLElement;
  trust: HTMLElement;
  neg: HTMLElement;
  pos: HTMLElement;
  aff: HTMLElement;
  recent: HTMLElement;
  item: RelationView | null;
}

interface ReqRow {
  el: HTMLElement;
  dir: HTMLElement;
  text: HTMLElement;
  badge: HTMLElement;
  note: HTMLElement;
}

interface MemRow {
  el: HTMLElement;
  dot: HTMLElement;
  text: HTMLElement;
  when: HTMLElement;
}

interface Simple {
  el: HTMLElement;
}

export function createPersonSections(ctx: UICtx, hooks: SectionHooks): PersonSections {
  const { game } = ctx;

  const mk = (id: string, title: string, hint?: string): SectionHandle =>
    makeSection({
      id,
      title,
      hint,
      open: ctx.state.sections[id] ?? SECTION_DEFAULT[id] ?? false,
      onToggle: (open) => {
        ctx.state.sections[id] = open;
        ctx.saveState();
        hooks.onSectionToggle();
      },
    });

  // ───────── opportunities ─────────
  const oppSec = mk('opp', 'Opportunities they could have used', 'Things nearby that could have helped, and why they did or did not take them. Click one to see where it is.');
  const oppBox = h('div', { class: 'list' });
  const oppEmpty = emptyNote('Nothing nearby that they could use right now.');
  oppSec.body.append(oppBox, oppEmpty);
  const oppList = new KeyedList<OpportunityView, OppRow>(
    oppBox,
    () => {
      const badge = h('span', { class: 'badge' });
      const what = h('span', { class: 'opp-what' });
      const dist = h('span', { class: 'opp-dist num' });
      const detail = h('div', { class: 'opp-detail' });
      const row: OppRow = {
        el: h('button', { type: 'button', class: 'row opp', 'data-tip': 'Show it on the map' }, h('div', { class: 'row-top' }, badge, what, dist), detail),
        badge,
        what,
        dist,
        detail,
        item: null,
      };
      row.el.addEventListener('click', () => {
        if (row.item) game.flyTo(row.item.x, row.item.y);
      });
      return row;
    },
    (r, o) => {
      r.item = o;
      const [tone, label] = OPP_BADGE[o.status];
      setText(r.badge, label);
      setState(r.badge, 't-', tone);
      setText(r.what, cap(o.what));
      setText(r.dist, `${Math.round(o.distance)} tiles`);
      setText(r.detail, o.detail);
      r.el.setAttribute('aria-label', `${label}: ${o.what}. ${o.detail} Show on the map.`);
    },
  );

  // ───────── relationships ─────────
  const relSec = mk('rel', 'Relationships', 'How they feel about people they know. The bar runs from dislike (left) to affection (right).');
  const relBox = h('div', { class: 'list' });
  const relEmpty = emptyNote('They have not got to know anyone yet.');
  relSec.body.append(relBox, relEmpty);
  const relList = new KeyedList<RelationView, RelRow>(
    relBox,
    () => {
      const name = h('button', { type: 'button', class: 'rel-name', 'data-tip': 'Look at this person' });
      const label = h('span', { class: 'chip rel-label' });
      const avoid = h('span', { class: 'badge t-warn', 'data-tip': 'They had a falling out and are keeping their distance for now.', hidden: true }, 'avoiding');
      const trust = h('span', { class: 'rel-trust num' });
      const neg = h('i', { class: 'neg' });
      const pos = h('i', { class: 'pos' });
      const aff = h('span', { class: 'aff-val num' });
      const recent = h('div', { class: 'rel-recent' });
      const row: RelRow = {
        el: h(
          'div',
          { class: 'row rel' },
          h('div', { class: 'row-top' }, name, label, avoid, trust),
          h('div', { class: 'aff' }, h('span', { class: 'aff-track', role: 'presentation' }, neg, pos, h('b', { class: 'mid' })), aff),
          recent,
        ),
        name,
        label,
        avoid,
        trust,
        neg,
        pos,
        aff,
        recent,
        item: null,
      };
      name.addEventListener('click', () => {
        if (row.item) hooks.onNavigate(row.item.id);
      });
      return row;
    },
    (r, v) => {
      r.item = v;
      setText(r.name, v.name);
      r.name.setAttribute('aria-label', `Look at ${v.name}`);
      setText(r.label, v.label);
      setHidden(r.avoid, !v.avoiding);
      setText(r.trust, `trust ${Math.round(v.trust)}`);
      const a = Math.max(-100, Math.min(100, v.affinity));
      setWidth(r.neg, a < 0 ? (-a / 100) * 50 : 0);
      setWidth(r.pos, a > 0 ? (a / 100) * 50 : 0);
      setText(r.aff, signed(a));
      toggle(r.aff, 'neg', a < -0.5);
      toggle(r.aff, 'pos', a > 0.5);
      setText(r.recent, v.recent ? cap(v.recent) : '');
      setHidden(r.recent, !v.recent);
    },
  );

  // ───────── requests ─────────
  const reqSec = mk('req', 'Requests', 'Favours asked for or promised lately. What they have promised themselves is under Promises.');
  const reqBox = h('div', { class: 'list' });
  const reqEmpty = emptyNote('No requests lately.');
  reqSec.body.append(reqBox, reqEmpty);
  const reqList = new KeyedList<RequestView, ReqRow>(
    reqBox,
    () => {
      const dir = h('span', { class: 'req-dir ico' });
      const text = h('span', { class: 'req-text' });
      const badge = h('span', { class: 'badge' });
      const note = h('div', { class: 'req-note' });
      return { el: h('div', { class: 'row req' }, h('div', { class: 'row-top' }, dir, text, badge), note), dir, text, badge, note };
    },
    (r, q) => {
      const asked = q.direction === 'asked';
      setIcon(r.dir, asked ? 'arrowUpRight' : 'arrowDownLeft', 13);
      setText(r.text, asked ? `Asked ${q.other} for ${q.text}` : `${q.other} asked them for ${q.text}`);
      setText(r.badge, q.status);
      setState(r.badge, 't-', REQ_TONE[q.status] ?? 'muted');
      setText(r.note, q.note ? `${cap(q.note)} · ${q.age}` : q.age);
    },
  );

  // ───────── recent experiences ─────────
  const memSec = mk('mem', 'Recent experiences', 'What has happened to them lately, newest first.');
  const memBox = h('div', { class: 'list mem-list' });
  const memEmpty = emptyNote('Nothing much has happened yet.');
  memSec.body.append(memBox, memEmpty);
  const memList = new KeyedList<PersonView['memories'][number], MemRow>(
    memBox,
    () => {
      const dot = h('i', { class: 'dot' });
      const text = h('span', { class: 'mem-t' });
      const when = h('span', { class: 'mem-when num' });
      return { el: h('div', { class: 'mem' }, dot, text, when), dot, text, when };
    },
    (r, m) => {
      setVar(r.dot, '--dot', MEMORY_COLOR[m.kind] ?? MEMORY_COLOR.info);
      setText(r.text, m.text);
      setText(r.when, m.when);
    },
  );

  // ───────── what they know ─────────
  const knowSec = mk('know', 'What they know', 'Only what they have seen first-hand or been told. It can be out of date, and it is not the same as what really exists.');
  const knowSum = h('p', { class: 'know-sum' });
  const knowSeen = h('i', { class: 'seen' });
  const knowTold = h('i', { class: 'told' });
  const knowSplit = h('div', { class: 'split', role: 'presentation' }, knowSeen, knowTold);
  const knowLegend = h('div', { class: 'know-legend' });
  const knowKinds = h('div', { class: 'chips' });
  const knowBtn = h(
    'button',
    {
      type: 'button',
      class: 'btn sm',
      'aria-pressed': 'false',
      onClick: () => game.setOverlay('knowledge', !game.overlays.knowledge),
    },
    icon('pin', 14),
    h('span', null, 'Show remembered places on the map'),
  );
  knowSec.body.append(knowSum, knowSplit, knowLegend, knowKinds, knowBtn);
  const kindList = new KeyedList<{ kind: string; n: number }, Simple>(
    knowKinds,
    () => ({ el: h('span', { class: 'chip' }, h('span', { class: 'k-n num' }), h('span', { class: 'k-l' })) }),
    (c, k) => {
      setText(c.el.firstElementChild as HTMLElement, String(k.n));
      setText(c.el.lastElementChild as HTMLElement, k.kind);
    },
  );

  // ───────── family ─────────
  const famSec = mk('fam', 'Family');
  const famBox = h('dl', { class: 'fam' });
  const famEmpty = emptyNote('No family nearby that they know of.');
  famSec.body.append(famBox, famEmpty);
  const famList = new KeyedList<{ label: string; names: string[] }, Simple>(
    famBox,
    () => ({ el: h('div', { class: 'fam-row' }, h('dt', { class: 'cap' }), h('dd')) }),
    (c, f) => {
      setText(c.el.firstElementChild as HTMLElement, f.label);
      setText(c.el.lastElementChild as HTMLElement, f.names.join(', '));
    },
  );

  // ───────── traits and skills ─────────
  const traitSec = mk('traits', 'Traits & skills', 'Who they are, and what they are good at. Skills grow with practice.');
  const traitSummary = h('p', { class: 'trait-sum' });
  const traitBox = h('div', { class: 'traits' });
  const skillBox = h('div', { class: 'skills' });
  traitSec.body.append(traitSummary, traitBox, h('div', { class: 'sub-h cap' }, 'Skills'), skillBox);
  const traitList = new KeyedList<{ key: string; value: number }, { el: HTMLElement; dot: HTMLElement }>(
    traitBox,
    (t) => {
      const [name, low, high] = TRAIT_LABEL[t.key] ?? [cap(t.key), 'low', 'high'];
      const dot = h('i', { class: 'trait-dot' });
      return {
        el: h(
          'div',
          { class: 'trait', 'aria-label': name },
          h('span', { class: 'trait-l' }, low),
          h('span', { class: 'trait-track', role: 'presentation' }, dot),
          h('span', { class: 'trait-h' }, high),
        ),
        dot,
      };
    },
    (c, t) => {
      c.dot.style.left = `${Math.max(0, Math.min(1, t.value)) * 100}%`;
      c.el.setAttribute('aria-label', `${(TRAIT_LABEL[t.key] ?? [t.key])[0]}: ${Math.round(t.value * 100)} out of 100`);
    },
  );
  const skillList = new KeyedList<{ key: string; value: number }, { el: HTMLElement; bar: BarHandle; v: HTMLElement }>(
    skillBox,
    (s) => {
      const bar = makeBar('thin');
      const v = h('span', { class: 'skill-v num' });
      return { el: h('div', { class: 'skill' }, h('span', { class: 'skill-l' }, SKILL_LABEL[s.key] ?? cap(s.key)), bar.el, v), bar, v };
    },
    (c, s) => {
      c.bar.set((s.value - 0.4) / 1.4, 'var(--info)');
      setText(c.v, `×${s.value.toFixed(2)}`);
    },
  );

  // ───────── debug extras (only while the debug panel is switched on) ─────────
  const dbgSec = mk('debug', 'Debug · last decision');
  const dbgBody = h('div', { class: 'dbg' });
  dbgSec.body.appendChild(dbgBody);
  let dbgSig = '';

  function renderDebug(v: PersonView): void {
    const d = v.decision;
    const raw = `#${v.id} @ ${v.position.x.toFixed(1)}, ${v.position.y.toFixed(1)} · health ${v.health.toFixed(1)} · mood ${v.mood.toFixed(1)} · ` + v.needs.map((n) => `${n.key} ${n.value.toFixed(1)}`).join(' · ');
    const sig = JSON.stringify([d, raw]);
    if (sig === dbgSig) return;
    dbgSig = sig;
    const kids: (Node | string)[] = [];
    if (d) {
      kids.push(
        h('div', { class: 'dbg-kv' }, h('span', null, 'decided'), h('b', null, d.when)),
        h('div', { class: 'dbg-kv' }, h('span', null, 'trigger'), h('b', null, d.trigger)),
        h('div', { class: 'dbg-kv' }, h('span', null, 'chosen'), h('b', null, d.chosen)),
        h('div', { class: 'dbg-kv' }, h('span', null, 'because'), h('b', null, d.because || '—')),
        h('div', { class: 'dbg-kv' }, h('span', null, 'considered'), h('b', null, `${d.considered} options · ${d.knownPlaces} known places · ${d.seenNow} in view`)),
      );
      if (d.alternatives.length) {
        kids.push(h('div', { class: 'sub-h cap' }, 'Top alternatives (score, then what made it up)'));
        for (const a of d.alternatives) {
          kids.push(
            h(
              'div',
              { class: 'dbg-alt' },
              h('div', { class: 'dbg-alt-top' }, h('span', null, a.label), h('b', { class: 'num' }, a.utility.toFixed(1))),
              h('div', { class: 'dbg-parts' }, a.parts.map(([k, val]) => h('span', { class: `part ${val < 0 ? 'neg' : 'pos'}` }, `${k} ${val >= 0 ? '+' : ''}${val.toFixed(1)}`))),
            ),
          );
        }
      }
      if (d.blocked.length) {
        kids.push(h('div', { class: 'sub-h cap' }, 'Blocked options'));
        for (const b of d.blocked) kids.push(h('div', { class: 'dbg-blocked' }, h('span', null, b.label), h('span', { class: 'muted' }, b.reason || 'blocked')));
      }
    } else kids.push(emptyNote('No decision recorded yet.'));
    kids.push(h('div', { class: 'sub-h cap' }, 'Raw numbers'), h('div', { class: 'dbg-raw mono' }, raw));
    dbgBody.replaceChildren(...kids);
  }

  // the social contract (what is being said, eaten, promised, fought over) comes first: it is live, and each part hides when empty
  const social = createPersonSocial({ game, section: (id, title, hint) => mk(id, title, hint), onNavigate: hooks.onNavigate });

  const el = h('div', { class: 'secs' }, ...social.els, oppSec.el, relSec.el, reqSec.el, memSec.el, knowSec.el, famSec.el, traitSec.el, dbgSec.el);

  return {
    el,
    wantsOpportunities: () => oppSec.isOpen(),
    reset() {
      dbgSig = '';
    },
    update(v) {
      social.update(v);

      if (oppSec.isOpen()) {
        oppList.sync(v.opportunities, (o) => String(o.id));
        setHidden(oppEmpty, v.opportunities.length > 0);
        oppSec.setCount(v.opportunities.length ? String(v.opportunities.length) : '');
      } else oppSec.setCount('');

      relSec.setCount(v.relationships.length ? String(v.relationships.length) : '');
      if (relSec.isOpen()) {
        relList.sync(v.relationships, (r) => String(r.id));
        setHidden(relEmpty, v.relationships.length > 0);
      }

      const nReq = v.requests.length;
      reqSec.setCount(nReq ? String(nReq) : '');
      if (reqSec.isOpen()) {
        reqList.sync(v.requests, (r) => String(r.id));
        setHidden(reqEmpty, nReq > 0);
      }

      memSec.setCount(v.memories.length ? String(v.memories.length) : '');
      if (memSec.isOpen()) {
        memList.sync(v.memories, (m) => `${m.kind}|${m.text}`);
        setHidden(memEmpty, v.memories.length > 0);
      }

      const k = v.knowledge;
      knowSec.setCount(k.places ? String(k.places) : '');
      if (knowSec.isOpen()) {
        setText(knowSum, k.places ? `${k.places} places and things remembered.` : 'They do not remember any places yet.');
        const total = Math.max(1, k.seen + k.hearsay);
        setWidth(knowSeen, (k.seen / total) * 100);
        setWidth(knowTold, (k.hearsay / total) * 100);
        setHidden(knowSplit, k.places === 0);
        setText(knowLegend, k.places ? `${k.seen} seen first-hand · ${k.hearsay} heard from others · ${k.stale} possibly out of date` : '');
        kindList.sync(k.byKind, (x) => x.kind);
        setBool(knowBtn, 'aria-pressed', game.overlays.knowledge);
      }

      famSec.setCount(v.family.length ? String(v.family.reduce((n, f) => n + f.names.length, 0)) : '');
      if (famSec.isOpen()) {
        famList.sync(v.family, (f) => f.label);
        setHidden(famEmpty, v.family.length > 0);
      }

      if (traitSec.isOpen()) {
        setText(traitSummary, v.traitSummary ? cap(v.traitSummary) + '.' : '');
        traitList.sync(v.traits, (t) => t.key);
        skillList.sync(v.skills, (s) => s.key);
      }

      dbgSec.setVisible(game.debug);
      if (game.debug && dbgSec.isOpen()) renderDebug(v);
    },
  };
}
