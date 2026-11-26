# Earned trades in Aspen and River

Rules 270 extends the existing trade preference in rich worlds. Every activity kind goes through an exhaustive classification. A person's choice of work can change with experience. The person card shows their earned trade.

| Work | Titles |
|---|---|
| Land, water and livestock | Gatherer, Fisher, Hunter, Butcher, Herder, Farmer, Forester, Miner |
| Construction, materials and workshops | Builder, Carpenter, Potter, Toolsmith, Weaver, Leatherworker, Craftworker, Repairer |
| Food and drink | Cook, Baker, Miller, Brewer, Granary keeper |
| Transport and settlement services | Hauler, Water carrier, Caregiver, Teacher, Trader, Scout, Firekeeper, Guard, Mediator, Organiser |

## How a person earns and uses a title

From age twelve, three successful jobs in one trade, spread across at least two days, can earn a title. A partially finished activity with a completed work cycle also counts. A lesson credits the teacher when someone learns, a swap credits its participants when goods change hands, and successful recruitment or mediation credits the person who did that work. Personal relief, routine store visits and leisure earn no title.

Each trade remembers up to twelve jobs. Once qualified in a second trade, someone can switch when it leads the current trade by three jobs, or when the current trade has been idle for three days. These thresholds and the preference weights are initial choices for this experiment.

An earned trade adds 12 points to a matching option and 18 to an offered deposit carrying goods associated with the trade. Review also values continuing eligible matching work. People still respond to danger and critical needs, and can do other work when their trade has no useful job. Children retain their existing learning and work rules.

Existing deposits carry their actual proposed cargo. For surplus bulk goods such as wool, hides, ore and planks, a specialist can also choose a remembered household home or an own or communal storehouse. A delivery moves real units, checks access and free space on arrival, protects promised or reserved goods, and keeps one spare. Food, seed, livestock supplies and equipment use their existing storage rules.

## Twelve-day comparison

Each pair started from day zero using the same seed, Normal settings and arrivals on. Rules 269 includes the founder-placement change in this working tree. Each file records cumulative figures at the end of each day. Conservation passed daily in all four runs.

| Measure | Aspen 269 | Aspen 270 | River 269 | River 270 |
|---|---:|---:|---:|---:|
| Workers' mean share of jobs in their most frequent trade | 32.1% | 32.8% | 30.5% | 38.1% |
| Successful jobs and partial jobs with a completed cycle | 1,379 | 1,400 | 2,068 | 2,155 |
| Classified activities interrupted because something better came up | 265 | 266 | 296 | 286 |
| Units deposited into buildings | 643 | 614 | 724 | 804 |
| Deaths | 0 | 0 | 1 | 0 |

By day twelve, Aspen had 21 titled people out of 22 eligible, across seven trades. River had 25 out of 27, across eight. The trial describes early settlements. No hunter, butcher or toolsmith had earned the title in either village at the endpoint. The staged herder test delivered four of five wool into a communal store, and preserved a later promise and a change of access. On rules 270, workers deposited 311 units matching their own trade in Aspen and 422 in River. These went through existing deposit routes. The new specialist bulk-storage option moved zero units in these ordinary runs.

The primary-share measure weights each person with at least three classified completions equally, including workers who left or died. It counts work by activity and can include personal provisioning. Building deposits include homes and livestock buildings. The `ownTradeStored` column counts units deposited by a titled person that match their trade's goods, regardless of how they were acquired. One run per seed and rule cannot establish a general productivity or survival effect.

## Reproduce

Run from the feature checkout. The final argument is an existing directory for the daily JSON files.

```powershell
foreach ($seed in 'aspen','river') {
  foreach ($rules in '269','270') {
    node node_modules/vite-node/dist/cli.mjs scripts/occupation_probe.ts $seed $rules review_evidence/occupations-20261120
  }
}
```

The production build and two regression runs passed (268 tests across 25 files). The seven focused occupation tests exercise job classification, earning and changing titles, child and predecessor behavior, relief, storage access and reservations, conservation, save/load and continued replay. See `tests/occupations.test.ts`.
