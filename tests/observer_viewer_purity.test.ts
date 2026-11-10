// OBSERVER PURITY for the card, the viewer and the knowledge lens: selecting, following, centring, switching overlays, asking
// for every view (opportunities included) and drawing the lens must leave a seeded world exactly as an unwatched twin, tick for
// tick. The twin is a second Game on the same settings that nobody looks at; the fingerprint and the full serialized state are
// compared at checkpoints along the way, not only at the end.
import { expect, it } from 'vitest';
import { Game } from '../src/app/game';
import { serializeWorld } from '../src/app/save';
import { Renderer } from '../src/render/renderer';
import { project } from '../src/render/iso';
import { describePerson } from '../src/sim/inspect';
import { currentWorldSettings } from '../src/sim/profiles';
import { hashWorld } from '../src/sim/world';
import { fakeCanvas, installFakeDom } from './helpers/fakeDom';

it('card, viewer and lens observation leaves a seeded run identical to an unwatched twin at every checkpoint', () => {
  installFakeDom();
  const settings = currentWorldSettings('normal', 'river', { immigration: true });
  const watched = new Game(settings);
  const twin = new Game(settings);
  const renderer = new Renderer(fakeCanvas(1440, 900), watched);
  const checkpoints = new Set([300, 900, 1500, 2400, 3000]);
  let looks = 0;
  let drawn = 0;
  for (let t = 1; t <= 3000; t++) {
    watched.advanceTicks(1);
    twin.advanceTicks(1);
    if (t % 25 === 0) {
      // the observer's actions: pick someone, follow them, centre the map, flip the lens and the other overlays, read every view
      const alive = watched.world.persons.filter((p) => p.alive);
      const p = alive[(t / 25) % alive.length];
      watched.select(p.id);
      watched.setFollow(t % 50 === 0);
      if (t % 75 === 0) watched.flyTo(p.x, p.y, 1.4);
      watched.setOverlay('knowledge', t % 50 === 0);
      watched.setOverlay('perception', t % 100 === 0);
      watched.setOverlay('paths', t % 150 === 0);
      watched.setOverlay('intentions', true);
      const q = project(p.x, p.y);
      watched.camera = { x: q.sx, y: q.sy, zoom: 0.8 + (t % 200) / 100 };
      const v = describePerson(watched.world, p.id, { opportunities: true });
      expect(v).not.toBeNull();
      // every derived view is read, as the open sections would read it
      void v!.status; void v!.intent; void v!.provenance; void v!.relevantItems; void v!.suspended; void v!.knowledgeItems; void v!.whereabouts; void v!.timeline;
      looks++;
      renderer.frame(1 / 60);
      drawn++;
    }
    if (t % 300 === 0) for (const p of watched.world.persons) if (p.alive) { describePerson(watched.world, p.id, { opportunities: true }); looks++; }
    if (checkpoints.has(t)) {
      expect(hashWorld(watched.world), `fingerprint at tick ${t}`).toBe(hashWorld(twin.world));
      expect(serializeWorld(watched.world), `serialized state at tick ${t}`).toBe(serializeWorld(twin.world));
    }
  }
  expect(looks).toBeGreaterThan(100);
  expect(drawn).toBeGreaterThan(100);
  renderer.destroy();
});
