# Crops: tomatoes and corn (rules 245)

On the owner's request of 14 November 2026, a field plot grows one of three crops: grain (as before), corn or tomatoes.

## What it does
- The crop is chosen when a plot is sown. The household's other plots that are growing or ripe are counted by crop (no field means grain). The new plot takes the crop with the fewest, ties in the order grain, corn, tomatoes. So a household's first plot is grain, the second corn, the third tomatoes, the fourth grain. No random numbers are used. One seed sows any crop.
- Corn is worth 20 and goes off at 0.3 of a berry's rate. It yields as grain does.
- Tomatoes are worth 14, yield half as much again (rounded), and go off at 0.9 of a berry's rate.
- Both are food wherever fruit is: eaten, carried, stored, offered, fed to a child, counted in a household's food. Neither is a preserved food, goes in a granary bin, or is milled, baked or brewed.
- Since rules 243 raw grain is passed over while anything else is there to eat, so fresh vegetables leave grain for the granary and bread.
- The harvest log reads "Harvested N corn and M seeds." For grain the line is unchanged. The inspector shows a plot's crop, and growing or ripe plots of corn and tomatoes are drawn differently from grain.

## Saving
Only `Plot.crop` is new, and it is absent for grain. Save format stays 5. A world's hash adds the crop only for a plot that has one, so every earlier world hashes as before. Rules 244 and earlier, authored worlds and `setCrops(false)` (lab arm `rich-no-crops`) grow grain only.

## Not done
No pin is recorded. No lab has been run and no benefit is claimed. Corn is not milled, baked or brewed. Options that harvest a ripe plot still say "grain" in their wording and check pack room for grain (same weight as the new foods).

## Where
`src/sim/crops.ts` (choice, yield, switch), `farming.ts` (ripening and rot), `act_farm.ts` (sowing and harvest), `economy.ts` (`harvestPlot`, `pickFood`, `totalItems`), food lists across `src/sim`, drawing in `src/render/scenery.ts`. Tests: `tests/crops.test.ts`.
