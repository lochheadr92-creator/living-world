# Generated tables

Written by `npx vite-node scripts/docs.ts` from `src/sim/constants.ts` and `src/sim/recipes.ts`. Durations are simulation seconds at 1× (10 ticks); a day is 240 s.

## Buildings

| Building | Footprint | Materials | Construction work | Storage (weight) | Max builders | Decay per day | Role |
|---|---|---|---|---|---|---|---|
| lean-to | 1×1 | 4 wood | 20 s | 12 | 2 | 7.4% | A rough shelter of branches. |
| hut | 2×2 | 8 wood, 4 stone | 52 s | 40 | 3 | 4.1% | A proper home with a small store. |
| house | 2×2 | 6 wood, 8 planks, 6 bricks | 76 s | 70 | 3 | 2.4% | A hut rebuilt in place with planked walls and a brick hearth: warmer, roomier, slower to decay. |
| storehouse | 2×2 | 10 wood, 4 stone | 64 s | 160 | 3 | 3.8% | A shared store for the settlement. |
| campfire | 1×1 | 2 wood, 3 stone | 9 s | — | 2 | — | A fire to warm and gather round. |
| timber yard | 3×2 | 10 wood, 4 stone | 56 s | 70 | 3 | 3.1% | A sawing and carpentry yard: logs become planks and handles, and carts are built here. |
| quarry | 2×2 | 6 wood, 2 stone | 36 s | 60 | 3 | 2.6% | A cutting face beside a stone outcrop; cut stone is stacked at the yard. |
| kiln | 2×2 | 4 wood, 12 stone | 52 s | 50 | 2 | 2.9% | A stone-lined kiln: fires bricks and water jars from clay, and burns wood to charcoal. |
| smithy | 2×2 | 6 wood, 8 stone, 4 bricks | 60 s | 40 | 2 | 2.9% | A forge and anvil: ore and charcoal become iron, and iron becomes better tools. |
| granary | 2×2 | 6 wood, 8 planks, 4 stone | 56 s | 120 | 2 | 2.9% | Raised, ventilated bins for grain, flour and bread. Each household keeps its own share; grain keeps far longer here when the bins are tended. |
| bakery | 2×2 | 4 wood, 6 stone, 6 bricks | 60 s | 40 | 2 | 3.4% | A quern and a brick oven: grain is milled to flour and baked into bread. |
| communal hall | 3×3 | 10 wood, 10 planks, 8 stone | 90 s | 60 | 4 | 2.9% | A long roofed hall with a hearth and trestles: shared meals, company out of the weather, and news carried by whoever sits there. |
| smokehouse | 2×2 | 10 wood, 4 stone | 48 s | 40 | 2 | 3.1% | A low timber shed over a smouldering fire: fish are smoked here until they keep for weeks instead of going off in a day or two. |
| well | 1×1 | 4 wood, 8 stone | 38 s | — | 2 | 1.2% | A stone-lined shaft with a windlass and a bucket: water in the middle of the settlement, so a drink does not mean a long walk to the lake, or past whatever is lurking there. |

## Recipes (what a workplace makes)

| Workplace | Batch | Inputs | Fuel | Work | Burn | Products | Waste (recorded) | Tool | Skill | Workers | Why anyone makes it |
|---|---|---|---|---|---|---|---|---|---|---|---|
| timber yard | hewn planks | 3 wood | — | 9 s | — | 1 planks | 2 wood (chips and bark hewn away) | axe (×0.62 time) | carpentry | 2 | Planks without a saw: slow and wasteful (3 wood for 1 plank), but possible with wedges and an axe — or, more slowly still, stones. |
| timber yard | sawn planks | 3 wood | — | 6 s | — | 2 planks | 1 wood (sawdust and offcuts) | saw (required) | carpentry | 2 | Two planks from three wood in two thirds of the time: twice the yield of hewing. |
| timber yard | tool handles | 1 wood | — | 4 s | — | 2 handles | — | axe (×0.75 time) | carpentry | 1 | Straight, seasoned handles for carts and iron tools; also the better way to mend a worn tool. |
| timber yard | a handcart | 4 planks, 2 handles, 2 wood | — | 19 s | — | a handcart | — | hammer (required) | carpentry | 2 | A cart carries three or four times what a person can, over open ground. |
| quarry | cut stone | — | — | 10 s | — | 3 stone cut from the outcrop | — | pick (×0.55 time) | stone | 3 | Stone from a big outcrop, three at a time, stacked at the yard — nobody has to walk between small rocks. |
| kiln | fired bricks | 4 clay | 2 wood | 5 s | 42 s | 3 bricks | 1 clay (clay that cracked and shrank in the fire) | — | kiln | 2 | Bricks for hearths, ovens and proper walls. |
| kiln | a water jar | 3 clay | 1 wood | 7 s | 30 s | an water jar | — | — | kiln | 1 | A jar lets its owner carry far more water per trip. |
| kiln | charcoal | 6 wood | — | 4 s | 70 s | 3 charcoal | 3 wood (smoke and ash) | — | kiln | 1 | A hotter, lighter fuel than wood: what smelting and forging need. |
| smithy | smelted iron | 3 ore | 2 charcoal | 7 s | 36 s | 1 iron | 2 ore (slag) | — | smith | 2 | Iron to forge tools that cut faster and last twice as long. |
| smithy | an iron axe | 1 iron, 1 handles | 1 charcoal | 8 s | — | an iron axe | — | hammer (required) | smith | 1 | An iron tool works about a quarter faster than a wooden-and-stone one and wears half as quickly. |
| smithy | an iron pickaxe | 1 iron, 1 handles | 1 charcoal | 8 s | — | an iron pickaxe | — | hammer (required) | smith | 1 | An iron tool works about a quarter faster than a wooden-and-stone one and wears half as quickly. |
| smithy | an iron hoe | 1 iron, 1 handles | 1 charcoal | 8 s | — | an iron hoe | — | hammer (required) | smith | 1 | An iron tool works about a quarter faster than a wooden-and-stone one and wears half as quickly. |
| smithy | an iron saw | 1 iron, 1 handles | 1 charcoal | 8 s | — | an iron saw | — | hammer (required) | smith | 1 | An iron tool works about a quarter faster than a wooden-and-stone one and wears half as quickly. |
| smithy | an iron hammer | 1 iron, 1 handles | 1 charcoal | 8 s | — | an iron hammer | — | hammer (required) | smith | 1 | An iron tool works about a quarter faster than a wooden-and-stone one and wears half as quickly. |
| bakery | milled flour | 4 grain | — | 7 s | — | 3 flour | 1 grain (husks and chaff) | — | bake | 2 | Flour keeps better than loose grain and is what bread is made of. |
| bakery | baked bread | 3 flour, 2 water | 1 wood | 5 s | 18 s | 4 bread | — | — | bake | 2 | Four loaves (30 hunger each) from what raw grain gives 3 (22 each): the dough takes up water. Bread keeps well and is what is served at shared meals. |
| smokehouse | smoked fish | 4 fish | 1 wood | 6 s | 24 s | 3 smoked fish | 1 fish (water driven off by the smoke, and bones) | — | fish | 2 | Three smoked fish (30 hunger each, a third lighter to carry) from four fresh ones, which would go off in a day or two: smoked fish keeps for weeks. Whoever fishes well smokes best. |
| granary | tended bins | — | — | 6 s | — | — | — | — | — | 2 | Turning and airing the bins and clearing out vermin keeps the grain from going off. |

## Items

| Item | Weight | Hunger restored | Spoils (relative rate) | Used to mend |
|---|---|---|---|---|
| berries | 1 | 12 | 1 | — |
| fruit | 1 | 16 | 0.8 | — |
| fish | 1.5 | 28 | 1.6 | — |
| smoked fish | 1 | 30 | 0.2 | — |
| grain | 1 | 22 | 0.22 | — |
| bread | 1 | 30 | 0.5 | — |
| seeds | 0.25 | — | — | — |
| water | 1.5 | — | — | — |
| wood | 2 | — | — | everything else |
| stone | 3 | — | — | well |
| clay | 3 | — | — | — |
| ore | 3 | — | — | — |
| planks | 2 | — | — | house, granary, communal hall |
| handles | 0.5 | — | — | — |
| bricks | 3 | — | — | kiln, smithy, bakery |
| charcoal | 0.5 | — | — | — |
| iron | 2 | — | — | — |
| flour | 1 | — | 0.28 | — |
| axe | 1 | — | — | — |
| pickaxe | 1 | — | — | — |
| hoe | 1 | — | — | — |
| basket | 1 | — | — | — |
| hammer | 1 | — | — | — |
| saw | 1 | — | — | — |
| water jar | 1.5 | — | — | — |
| fishing rod | 1 | — | — | — |

## Tools

| Tool | Made by hand from | Hand-making work | Wear per tick of use | What it is for |
|---|---|---|---|---|
| axe | 2 wood, 1 stone | 9 s | 0.036 (iron: 0.018) | felling trees (and hewing planks the hard way) |
| pickaxe | 2 wood, 2 stone | 10 s | 0.044 (iron: 0.022) | breaking rock and digging clay and ore |
| hoe | 2 wood, 1 stone | 8 s | 0.028 (iron: 0.014) | breaking ground and tending crops |
| basket | 3 wood | 7 s | 0.012 (iron: 0.006) | carrying more and picking quicker |
| hammer | 1 wood, 2 stone | 8 s | 0.032 (iron: 0.016) | building and repair work, and every kind of smithing |
| saw | 2 wood, 2 stone | 11 s | 0.044 (iron: 0.022) | cutting planks with little waste |
| water jar | cannot be made by hand (kiln) | — | 0.02 (iron: 0.01) | carrying more water (it wears a little with each trip to the water) |
| fishing rod | 3 wood | 8 s | 0.014 (iron: 0.007) | catching fish faster: a pole, a plaited line and a bone hook |

Duration multipliers while using the right tool (lower is faster): axe 0.55, pick 0.55, hoe 0.5, hoeTend 0.7, basket 0.85, rod 0.6, hammer 0.8, saw 0.55, ironAxe 0.42, ironPick 0.42, ironHoe 0.4, ironHoeTend 0.6, ironHammer 0.65, ironSaw 0.42, ironBasket 0.85. Past 70 wear the benefit fades linearly to nothing at 100, where the tool breaks.

## Deposits and carrying

- Clay pit: 48 clay · ore vein: 30 ore · stone outcrop: 72 stone (all finite, none regrow).
- A person carries 5/9/12/8 weight (child/youth/adult/elder); a handcart's bed holds 42.
