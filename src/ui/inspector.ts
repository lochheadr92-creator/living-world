// The inspector panel (right side). A thin shell that decides what to show for the current selection,
// slides in when something is selected, remembers when it was hidden, and refreshes the content at ~4 Hz (every frame at 4×
// and faster, so the card keeps up with the picture).
// Content comes only from the read-only view-models in sim/inspect.ts.
import { describeEntity, describeEntityName, describePerson } from '../sim/inspect';
import { Every, h, setAttr, setBool, setHidden, setText } from './dom';
import { icon } from './icons';
import { createEntityPanel } from './entity';
import { createPersonPanel } from './person';
import type { Part, UICtx } from './context';
import type { Slots } from './layout';

type Mode = 'empty' | 'person' | 'entity';

export function createInspector(ctx: UICtx, slots: Slots): Part {
  const { game } = ctx;

  let open = ctx.prefs.inspectorOpen;
  let mode: Mode = 'empty';
  let shownId = 0;
  let lastTick = -1;
  let force = true;
  /** who was selected before the selection cleared, so a death can be mentioned gently */
  let prev: { id: number; person: boolean; name: string } | null = null;
  let memorial = '';
  /** things looked at just before the current one, so a trail of clicks through relationships can be walked back */
  const trail: number[] = [];
  let lastId = 0;
  let goingBack = false;
  let viaPanel = false;

  // ───────── panels ─────────
  const person = createPersonPanel(ctx, {
    onClose: () => game.select(0),
    onSectionToggle: () => {
      force = true;
      refresh();
    },
    onNavigate: (id) => {
      viaPanel = true;
      game.focusEntity(id);
      viaPanel = false;
    },
  });
  const entity = createEntityPanel(ctx, {
    onClose: () => game.select(0),
    onNavigate: (id) => {
      viaPanel = true;
      game.focusEntity(id);
      viaPanel = false;
    },
  });

  const memorialEl = h('p', { class: 'empty-memorial', hidden: true });
  const empty = h(
    'div',
    { class: 'insp-empty' },
    h('span', { class: 'empty-ico' }, icon('eye', 22)),
    h('h2', { class: 'empty-h' }, 'Look inside the world'),
    h('p', { class: 'empty-p' }, 'Click a person, a building, a field or a resource to look inside.'),
    memorialEl,
    h('p', { class: 'empty-tip' }, 'Press ', h('kbd', null, '?'), ' for the controls.'),
  );

  const crumbName = h('span', { class: 'crumb-name' });
  const crumb = h(
    'button',
    {
      type: 'button',
      class: 'crumb',
      hidden: true,
      'data-tip': 'Go back to what you were looking at',
      onClick: () => {
        while (trail.length) {
          const id = trail.pop() as number;
          if (!game.world.byId.has(id)) continue;
          goingBack = true;
          game.focusEntity(id);
          goingBack = false;
          return;
        }
        syncCrumb();
      },
    },
    icon('chevron', 12, 'crumb-ico'),
    h('span', null, 'Back to '),
    crumbName,
  );
  const aside = h('aside', { class: 'insp glass', 'aria-label': 'Inspector' }, crumb, empty, person.el, entity.el);
  const handleDot = h('i', { class: 'insp-dot' });
  const handle = h(
    'button',
    {
      type: 'button',
      class: 'insp-handle glass',
      'aria-expanded': 'true',
      'aria-label': 'Hide the inspector',
      'data-tip': 'Hide the inspector',
      onClick: () => {
        open = !open;
        ctx.prefs.inspectorOpen = open;
        ctx.savePrefs();
        applyOpen();
        force = true;
        if (open) refresh();
      },
    },
    icon('chevron', 14, 'insp-chev'),
    handleDot,
  );
  const wrap = h('div', { class: 'insp-wrap', 'data-open': 'true', 'data-mode': 'empty' }, handle, aside);
  slots.right.appendChild(wrap);

  function applyOpen(): void {
    wrap.dataset.open = String(open);
    aside.inert = !open;
    setBool(handle, 'aria-expanded', open);
    setAttr(handle, 'aria-label', open ? 'Hide the inspector' : 'Show the inspector');
    setAttr(handle, 'data-tip', open ? 'Hide the inspector' : game.selectedId ? 'Show the inspector' : 'Show the inspector (click something to look inside)');
    setHidden(handleDot, open || !game.selectedId);
  }

  function setMode(next: Mode): void {
    mode = next;
    wrap.dataset.mode = next;
    setHidden(empty, next !== 'empty');
    setHidden(person.el, next !== 'person');
    setHidden(entity.el, next !== 'entity');
  }

  function syncCrumb(): void {
    while (trail.length && !game.world.byId.has(trail[trail.length - 1])) trail.pop();
    const top = trail.length ? game.world.byId.get(trail[trail.length - 1]) : undefined;
    setHidden(crumb, !top);
    if (top) setText(crumbName, describeEntityName(game.world, top));
  }

  function showEmpty(): void {
    if (memorial) {
      setText(memorialEl, memorial);
      setHidden(memorialEl, false);
    } else setHidden(memorialEl, true);
  }

  /** Rebuild what is shown. Cheap when nothing changed; describePerson only runs for the one selected person. */
  function refresh(): void {
    const world = game.world;
    const id = game.selectedId;
    const e = id ? world.byId.get(id) : undefined;
    const next: Mode = !e ? 'empty' : e.ent === 'person' ? 'person' : 'entity';

    if (next !== mode || id !== shownId) {
      shownId = id;
      setMode(next);
      person.reset();
      entity.reset();
      force = true;
    }
    if (!force && world.tick === lastTick) return; // paused and nothing changed
    force = false;
    lastTick = world.tick;
    wrap.dataset.tick = String(lastTick); // which moment the panel shows (read by the automated browser check)

    if (mode === 'person') {
      const v = describePerson(world, id, { opportunities: person.wantsOpportunities() });
      if (v) person.update(v);
    } else if (mode === 'entity') {
      const v = describeEntity(world, id);
      if (v) entity.update(v, world);
    } else showEmpty();
    setHidden(handleDot, open || !game.selectedId);
  }

  function onSelect(): void {
    const id = game.selectedId;
    const world = game.world;
    if (!id) trail.length = 0;
    else if (goingBack) {
      /* walking the trail backwards keeps it */
    } else if (viaPanel && lastId && lastId !== id && world.byId.has(lastId)) {
      trail.push(lastId);
      if (trail.length > 12) trail.shift();
    } else trail.length = 0; // chosen on the map or from the feed: a fresh start
    lastId = id;
    if (id) {
      memorial = '';
      open = true; // clicking something is a request to look inside it
      const e = world.byId.get(id);
      prev = e && e.ent === 'person' ? { id, person: true, name: e.name } : { id, person: false, name: '' };
    } else {
      open = ctx.prefs.inspectorOpen;
      if (prev && prev.person) {
        const d = world.deceased.find((x) => x.id === prev!.id);
        if (d) memorial = `${d.name} has died${d.cause ? ` (${d.cause})` : ''}, aged ${d.age}.`;
      }
      prev = null;
    }
    applyOpen();
    force = true;
    refresh();
    syncCrumb();
  }

  setMode('empty');
  applyOpen();
  refresh();
  const slow = new Every(0.25);

  return {
    update(dt) {
      // nothing to keep fresh while the panel is tucked away. At 4× and faster a quarter-second timer leaves the card many
      // ticks behind the picture, so then it is refreshed every frame (refresh returns at once unless the world has moved on)
      const due = slow.step(dt);
      if (open && (due || (game.playing && game.speed >= 4))) refresh();
    },
    onGame(e) {
      switch (e) {
        case 'select':
          onSelect();
          break;
        case 'restart':
          memorial = '';
          prev = null;
          trail.length = 0;
          lastId = 0;
          lastTick = -1;
          force = true;
          break;
        case 'follow':
          person.syncFollow();
          break;
        case 'debug':
        case 'step':
        case 'overlay':
          force = true;
          refresh();
          break;
      }
    },
    dispose() {
      wrap.remove();
    },
  };
}

