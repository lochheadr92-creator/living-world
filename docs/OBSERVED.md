# Five causal chains, watched in the page

Each of these happened **by itself** in the ordinary default world (seed `meadow`, nothing staged) and was watched in the real
interface: the real renderer and animation loop (a headless Chrome page whose `visibilityState` is `visible`, so
`requestAnimationFrame` runs normally, driven over the DevTools protocol — see `scripts/browser/`), the real inspector cards and
the real feed. The moments were found first by running the
same seed headlessly; the page was then fast-forwarded (`__game.advanceTicks`, the same deterministic simulation) to shortly
before each one and played in real time at 4×, held (paused) at the instants listed so the picture and cards could be read.

The page and a headless run agree exactly on the world at a given tick (`stateHash` at ticks 3000 and 16000, and at the end of
two soak runs of 120 s and 100 s of random clicking, following, overlay toggling, pausing, stepping and speed changes), so the tick
numbers below are valid for this version of the code. **Any change to the simulation moves them.** (The additions listed in
[`BASELINE.md`](BASELINE.md) under "Runs after this record" have done so: the state of `meadow` at day 30 was `1418981b` when this was
written and is `40bc0215` now, so these moments no longer fall at these ticks.)

To watch one yourself, open the page, open the browser console, and for example:

```js
__game.restart({}); __game.advanceTicks(7650); __game.setSpeed(4); __game.setPlaying(true)   // then click Pia
```

## 1. Extraction → processing → use: the Moss household's hut becomes a house (ticks 19140–37164, days 9–16)

Yara marked out the rebuilding at t19140 (a hut upgraded in place; it needs 6 wood, 8 planks, 6 bricks). Over the next week
a dozen people did a little each: wood cut and brought; logs hewn into planks at the timber yard (a batch "ordered by Yara,
for my household's house", three wood inside it); clay fired into bricks at the kiln (two bricks "set aside for Sofia, for the
house I promised to help with"); planks and bricks withdrawn from the shelves and carried to the site; Yara and Quinn building as
they arrived. Watched from t36300:

* **Processing** — the timber yard card: *Hewing planks · 1% · at work Yara · ordered by Yara · for "to keep my promise to bring it" ·
  inside the batch: 3 wood*; the kiln card with its stock and its earmarks.
* **Carrying** — Quinn's card: promises *done* — "Haul 2 wood to the house site, as promised to Yara — 2 of 2 delivered", "Help Yara
  build — 100% of a fair share of work done".
* **Use** — the site card at t36650: *House (under construction) 84% · planks 7/8 · bricks 6/6 · wood 6/6 · working now Quinn, Yara ·
  who has put something in: Moss household 81%, Brook household 16%, Fern household 2%*; at t37111: *work has paused for lack of 1
  plank*; at t37168 the feed says "Yara finished rebuilding the Moss household's hut as a house" and the building's card reads
  *House · owner Moss household · household Yara, Quinn, Wes, Talia*.

## 2. A cooperative commitment (ticks 7742–8502, day 4)

Isla asked Pia for stone for her hut and Pia promised it (the conversation card: *talking now · Isla · came over with a request ·
outcome: Promised*). Pia's promises section: *ACTIVE, due in 4 min — Haul 3 stone to the hut site, as promised to Isla — 0 of 3
delivered*; later *2 of 3 delivered · held up: no stone to be had from anywhere they know of* (she broke stone, picked berries and ate in
between); at t8506 *DONE — 3 of 3 delivered*, the feed says "Pia kept a promise to Isla", and Isla's site card lists who put
something in (Sedge household 56%, Sorrel household 29%, Heron 11%, Juniper 4%).

## 3. A shared meal (ticks 31876–32384, day 14)

Zeke, with food to spare, invited Edda, Bea and Alma to eat at the communal hall ("Eat with us at the hall tonight, Edda?"). His card:
*Shared meal · INVITING · starts in 49 s · at the communal hall · guests: Edda — coming*. At t32354 "Come and eat — the table is ready":
*EATING · guests: Edda — there*; at t32386 *LAST MEAL · DONE · Edda — ate · Bea — declined: preferred to stay on with their own plans*,
and the feed: "Zeke hosted a shared meal at the communal hall: 2 sat down together."

## 4. Looking after someone (ticks 4800–5096, day 3)

Zeke had seen Jax looking hungry (his *Worries* section: "Jax looked hungry — seen 10 s ago · saw it themself") and Jax had since
walked off towards the lake. At t4964 Zeke's card reads *Taking berries to Jax — walking to Jax (13 tiles to go). Weighed up: Jax looked hungry +32 ·
walking −9. To bring berries to Jax.* At t5095 the feed says "Zeke looked in on Jax, who had looked hungry, and brought 2
berries." (Jax had been given a berry a little earlier by Orla; the card shows that too.)

## 5. A disagreement that resolves and does not repeat (ticks 63207–64293, days 27–28)

Talia and Sofia reached the last berries together. At t63210 Sofia's card: *"I was here first!" · talking now · Talia · an argument ·
having it out* and *Quarrels: Talia — COMPETITION — started just now — "We argued over the last berries" — sore 52 — apologies 0 of
3*. At t63804 Talia's card shows the soreness down to 31 with no apology yet; at t64298 *"I was wrong to shout. Sorry."* — *talking now ·
Sofia · making peace*, the feed says "Talia and Sofia made peace", and the *Quarrels* section has gone. Played on to t67298: no
second quarrel; the only feed lines about the pair in the whole window are the argument and the peace. (A separate headless check of
30 days in three worlds found no pair quarrelling twice and none within 0.6 day of making up.)

## What was not natural

Nothing above. The staged scenes (`TEST SCENE` banner) were watched separately: the workshop scene (planks sawn, a house finished), the
shared meal at the hall, the handcart haul (the cart goes out empty to a store 25 tiles away, is loaded there, comes back, and is
unloaded — "Pulling the handcart out to the storehouse", "Hauling 8 planks and 6 bricks to the house site", *weighed up: it would take 3
trips on foot +40 · a cart can move all of it in one go +34 · walking −29*) and the frail neighbour fed in his lean-to. Carts and
iron do not appear in the ordinary meadow run watched here (`docs/ECONOMY.md`, "Limits worth knowing").
