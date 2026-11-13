// Rules 241 (the owner's direction, 13 November 2026): a wolf's skin is hung where everybody gathers.
//
// From rules 239 a wolf killed with a spear leaves a body with a hide in it, and the hide was a hide like a deer's.
// From 241, in rich worlds:
//   keep   the hide cut from a wolf's body is kept whole as a wolf skin: it is not a hide in the pack (the hide is
//          entered as used, "kept whole as a wolf skin") but a skin the person holds (`person.wolfSkins`). And whoever
//          killed a wolf within the last two days values the hide on a body of their own household at SKIN_WORTH, garment
//          or no garment, so the skin is cut before the body rots. The killer also knows the wolf is dead, and does not
//          run from where it was.
//   hang   somebody holding a wolf skin takes it to a building everybody shares, the hall if they know one and the camp
//          fire if not, and hangs it there (HANG_WORK ticks). A building shows at most SKIN_CAP skins
//          (`building.wolfSkins`); a place found full is remembered for four days and another is tried.
//   heart  once a day, somebody within SKIN_SIGHT tiles of a building with a skin on it takes heart from it: a thought
//          worth 2, and 1 more for each further skin, and a little of their feeling of safety back. The one who hangs a
//          skin is proud of it for two days. It is not a ward: a wolf is not kept off by it.
//
// What a person may use to decide: their own skin, and their own remembered buildings (beliefs), never the world's truth.
// Saved: `person.wolfSkins` and `building.wolfSkins`, each present only once there is one. Both enter the state hash.
// Three switched parts. Rich worlds at rules 241 and later only.
import { faceToward, newActivity, registerHandler } from './activities';
import type { WorkResult } from './activities';
import { DAY } from './constants';
import { ledgerConsume } from './economy';
import { addEvent, addFx, addLog } from './events';
import { observe } from './knowledge';
import { think } from './mood';
import { Scorer, addOption, beliefsByKind, pen, spotNear } from './optutil';
import type { Ctx } from './optutil';
import { runsRulesVersion } from './rulesversion';
import type { Building, BuildingType, Person, World } from './types';

export const WOLF_SKIN_PARTS = ['keep', 'hang', 'heart'] as const;
export type WolfSkinPart = (typeof WOLF_SKIN_PARTS)[number];
const on: Record<WolfSkinPart, boolean> = { keep: true, hang: true, heart: true };
/** Lab switch (never saved or hashed): all parts, or one. */
export function setWolfSkin(enabled: boolean, part?: WolfSkinPart): void {
  if (part) on[part] = enabled;
  else for (const k of WOLF_SKIN_PARTS) on[k] = enabled;
}
export const wolfSkinPartOn = (part: WolfSkinPart): boolean => on[part];
export const hasWolfSkin = (world: World): boolean => world.settings.dynamics === 'rich' && runsRulesVersion(world, 241);

/**
 * What the hide on a wolf's body is worth to whoever killed it, in place of 24 without a garment and 5 with one. Set from a
 * measurement: at a first setting of 22 the hide was cut in one of five kills in six worlds over four years; traced in fern and
 * birch, the offer stood third to sixteenth among the killer's options (ordinary work scores 25 to 55) for the two days the
 * body lasts, and the body rotted with the hide on it.
 */
export const SKIN_WORTH = 46;
/**
 * What hanging a held skin scores before the walk. Set from a measurement: at 16 aspen's skin was held a day and a half; at
 * 30, of five skins cut in six worlds over four years, birch's waited four and a half days and river's was still held after
 * six and a half (traced: the offer stood at 19 to 32, first to tenth among her options, and once begun was dropped for
 * something better). At 48 it stands with the cutting, and once she has set out she keeps to it (HANG_COMMIT).
 */
export const HANG_WORTH = 48;
/** ticks for which somebody who has set out to hang a skin is not drawn off by ordinary work */
export const HANG_COMMIT = 240;
/** how many skins one building shows */
export const SKIN_CAP = 3;
/** the work of hanging one */
export const HANG_WORK = 60;
/** within this many tiles of the building a person sees the skins */
export const SKIN_SIGHT = 5;
/** what seeing them gives back of the feeling of safety (0 to 100) */
export const SKIN_SAFETY = 6;
/** the buildings a skin may be hung at, the first kind known being preferred */
export const SKIN_PLACES: BuildingType[] = ['hall', 'fire'];
const placeNoun = (t: BuildingType): string => (t === 'fire' ? 'camp fire' : t);

/** Is the hide now being cut from this body kept whole as a wolf skin? carcass.ts asks before putting a hide in the pack. */
export function keepsWolfSkin(world: World, species: string, part: string): boolean {
  return on.keep && hasWolfSkin(world) && species === 'wolf' && part === 'hide';
}
/** The hide has been cut from a wolf's body: it is the person's wolf skin, and the hide is entered as used. */
export function takeWolfSkin(world: World, p: Person): void {
  ledgerConsume(world, 'hide', 1, 'kept whole as a wolf skin');
  p.wolfSkins = (p.wolfSkins ?? 0) + 1;
  addLog(world, p, 'work', 'Cut the skin from the wolf whole. It should hang where everybody can see it.');
}
/** What the hide on a body of their own household is worth to somebody who killed a wolf lately; 0 if it does not apply. */
export function wolfSkinWorth(world: World, p: Person, bodyHh: number): number {
  if (!on.keep || !hasWolfSkin(world) || bodyHh !== p.hhId) return 0;
  return p.mood?.thoughts.some((t) => t.kind === 'killed_wolf' && t.until > world.tick) ? SKIN_WORTH : 0;
}

/**
 * Whoever killed the wolf saw it die: their memory of where that wolf was is no longer a danger to run from. Before rules 241
 * the killer went on fearing the place until they next looked about them, and for those ticks would not go near the body.
 */
export function sawItDie(world: World, p: Person, wolfId: number): void {
  if (!on.keep || !hasWolfSkin(world)) return;
  const b = p.beliefs[wolfId];
  if (b && b.kind === 'danger') b.amount = 0;
}

const fullKey = (id: number): string => 'skinFull' + id;

/** Somebody holding a wolf skin may take it to a shared building they remember and hang it there. */
export function wolfSkinOptions(ctx: Ctx): void {
  const { world, p } = ctx;
  if (!on.hang || !hasWolfSkin(world) || !(p.wolfSkins && p.wolfSkins > 0) || ctx.stage === 'child' || ctx.dangers.length) return;
  if (ctx.drives.hunger > 40 || ctx.drives.thirst > 40 || ctx.drives.energy > 50) return;
  let best: { b: ReturnType<typeof beliefsByKind>[number]; rank: number; d: number } | null = null;
  for (const b of beliefsByKind(p, ['building'])) {
    const rank = SKIN_PLACES.indexOf(b.btype as BuildingType);
    if (rank < 0 || b.hh !== 0 || (p.cooldowns[fullKey(b.id)] ?? 0) > world.tick) continue;
    const d = Math.hypot(b.x - p.x, b.y - p.y);
    if (!best || rank < best.rank || (rank === best.rank && d < best.d)) best = { b, rank, d };
  }
  if (!best) return;
  const place = best.b, noun = placeNoun(place.btype as BuildingType);
  const travel = best.d / Math.max(0.03, ctx.speed);
  const sc = new Scorer().add('a wolf skin to hang where everybody gathers', HANG_WORTH + 6 * p.traits.sociability).add('walking', -pen(travel) * 0.5);
  if (sc.total <= 0) return;
  addOption(ctx, {
    kind: 'hang_skin',
    label: `Hang the wolf skin at the ${noun}`,
    goal: 'so that everybody sees a wolf can be killed',
    need: null,
    util: sc.total,
    parts: sc.parts,
    eta: travel + HANG_WORK,
    key: `hang_skin:${place.id}`,
    targetId: place.id,
    tag: 'social',
    make: () => {
      const spot = spotNear(world, p, place);
      if (!spot) return null;
      return newActivity(world, p, { kind: 'hang_skin', label: `Hanging a wolf skin at the ${noun}`, goal: 'so that everybody sees a wolf can be killed', targetId: place.id, targetType: 'building', tx: place.x, ty: place.y, spotX: spot.x, spotY: spot.y, utility: sc.total, minCommit: HANG_COMMIT, maxTicks: 700, data: {} });
    },
  });
}

const placeOf = (world: World, id: number): Building | null => {
  const b = world.byId.get(id);
  return b && b.ent === 'building' && b.hhId === 0 && SKIN_PLACES.includes(b.type) ? b : null;
};

registerHandler('hang_skin', {
  availability: 0.4,
  pose: () => 'craft',
  begin(world, p, a) {
    if (!on.hang || !hasWolfSkin(world)) return 'this world has no such thing';
    if (!(p.wolfSkins && p.wolfSkins > 0)) return 'no wolf skin to hang';
    const b = placeOf(world, a.targetId);
    if (!b) return 'the place is gone';
    observe(world, p, b);
    if ((b.wolfSkins ?? 0) >= SKIN_CAP) {
      p.cooldowns[fullKey(b.id)] = world.tick + 4 * DAY;
      return 'there is no room for another skin there';
    }
    a.duration = HANG_WORK;
  },
  work(world, p, a): WorkResult {
    const b = placeOf(world, a.targetId);
    if (!b) return 'fail:the place is gone';
    faceToward(p, b.x + b.w / 2, b.y + b.h / 2);
    a.progress++;
    if (a.progress < a.duration) return 'continue';
    if (!(p.wolfSkins && p.wolfSkins > 0)) return 'fail:no wolf skin to hang';
    if ((b.wolfSkins ?? 0) >= SKIN_CAP) {
      p.cooldowns[fullKey(b.id)] = world.tick + 4 * DAY;
      return 'fail:there is no room for another skin there';
    }
    p.wolfSkins--;
    if (p.wolfSkins === 0) delete p.wolfSkins;
    b.wolfSkins = (b.wolfSkins ?? 0) + 1;
    const noun = placeNoun(b.type);
    addFx(world, 'sparkle', b.x + b.w / 2, b.y + b.h / 2, 0);
    addEvent(world, 'build', `${p.name} hung a wolf's skin at the ${noun}${b.wolfSkins > 1 ? `; ${b.wolfSkins} hang there now` : ''}.`, [p.id], b.x, b.y);
    addLog(world, p, 'work', `Hung the wolf's skin at the ${noun} for everybody to see.`);
    think(world, p, 'hung_skin', 6, 2 * DAY, `hung a wolf's skin at the ${noun}`);
    return 'done';
  },
});

/** Once every 200 ticks: people near a building with a wolf skin on it take heart from it, once a day each. */
export function updateWolfSkin(world: World): void {
  if (!on.heart || !hasWolfSkin(world) || world.tick % 200 !== 0) return;
  for (const b of world.buildings) {
    const n = b.wolfSkins ?? 0;
    if (n <= 0) continue;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, noun = placeNoun(b.type);
    for (const p of world.persons) {
      if (!p.alive || p.pose === 'sleep' || Math.hypot(p.x - cx, p.y - cy) > SKIN_SIGHT) continue;
      if ((p.cooldowns.wolfSkinSeen ?? 0) > world.tick) continue;
      p.cooldowns.wolfSkinSeen = world.tick + DAY;
      think(world, p, 'wolf_skin', 2 + Math.min(SKIN_CAP - 1, n - 1), DAY, n > 1 ? `the wolf skins hung at the ${noun}` : `the wolf skin hung at the ${noun}`);
      p.needs.safety = Math.min(100, p.needs.safety + SKIN_SAFETY);
    }
  }
}

/** how many wolf skins hang in the world (a lab measure and the probe's) */
export const skinsHung = (world: World): number => world.buildings.reduce((n, b) => n + (b.wolfSkins ?? 0), 0);

/** A saved world's wolf skins are whole numbers, on people and on shared buildings, and only where the rule runs. */
export function validateWolfSkin(world: World): void {
  const whole = (n: unknown): boolean => Number.isSafeInteger(n) && Number(n) > 0;
  for (const p of world.persons) if (p.wolfSkins !== undefined && (!hasWolfSkin(world) || !whole(p.wolfSkins))) throw new Error('invalid save: wolf skin held');
  for (const b of world.buildings) if (b.wolfSkins !== undefined && (!hasWolfSkin(world) || !whole(b.wolfSkins) || b.wolfSkins > SKIN_CAP || b.hhId !== 0 || !SKIN_PLACES.includes(b.type))) throw new Error('invalid save: wolf skin hung');
}
