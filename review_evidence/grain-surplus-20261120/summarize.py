"""Validate all runs and produce tables from the retained observations."""
import json
from pathlib import Path

root = Path(__file__).resolve().parent
arms = ['base', 'wild', 't18', 't24', 'boost']
seeds = ['aspen', 'river']

def load(seed, version, arm):
    return json.loads((root / f'{seed}-{version}-{arm}.json').read_text())

def measures(run):
    grain = run['ledger']['grain']
    feed = run['ledger']['stock_feed']
    route = run['routes']['grain']
    end = run['closing']['grain']
    lab = run['labour']
    def phase(key, include_other=False):
        return sum(v[key] for k, v in lab.items() if include_other or k != 'other')
    data = {
        'Grain at start': run['opening']['grain']['total'],
        'Wild grain grown': grain.get('+regrowth: wild grain', 0),
        'Field grain ripened': grain.get('+crop growth', 0),
        'Wild grain collected or eaten on site': route.get('source>person | gather', 0) + grain.get('-eaten at the source', 0),
        'Field grain harvested': route.get('plot>person | harvest', 0),
        'Gross grain transferred into buildings': sum(n for k,n in route.items() if k.split(' | ')[0].endswith('>building')),
        'Raw grain eaten by people': grain.get('-eaten', 0) + grain.get('-eaten at the source', 0),
        'Grain taken from a building to eat': route.get('building>person | eat from store', 0),
        'Raw grain saved as seed': grain.get('-saved as seed', 0),
        'Raw grain mixed into feed': grain.get('-mixing grain feed', 0),
        'Raw grain fed directly or used to lead livestock': sum(grain.get(k,0) for k in ['-livestock feed','-feeding sheep','-leading livestock']),
        'Wild grain grazed by sheep': grain.get('-sheep grazing',0),
        'Field grain rotted': grain.get('xcrop left to rot',0),
        'Other grain spoilage': sum(n for k,n in grain.items() if k.startswith('x') and k != 'xcrop left to rot'),
        'Grain left on wild patches': end['wild'],
        'Grain left standing on plots': end['field'],
        'Grain left in buildings': end['stores'],
        'Grain left in packs': end['packs'],
        'Grain left elsewhere': end['other'],
        'Prepared feed made (portions)': feed.get('+mixing grain feed',0),
        'Prepared feed used (portions)': sum(n for k,n in feed.items() if k.startswith('-')),
        'Flour produced': sum(n for k,n in run['ledger']['flour'].items() if k.startswith('+')),
        'Bread produced': sum(n for k,n in run['ledger']['bread'].items() if k.startswith('+')),
        'Seed sown': run['ledger']['seeds'].get('-sown',0),
        'Seed collected from plots': run['routes']['seeds'].get('plot>person | harvest',0),
        'Grain harvest visits': run['harvestVisits'],
        'Visits that left grain standing': run['partialVisits'],
        'Later grain collections of same ripening': run['repeatVisits'],
        'Grain-task travel ticks': phase('travel'),
        'Grain-task work ticks': phase('work'),
        'Grain-task walking distance (tiles)': round(phase('distance'),1),
        'Settlement travel ticks': phase('travel',True),
        'Settlement work-handler ticks': phase('work',True),
    }
    known = {'-eaten','-eaten at the source','-saved as seed','-mixing grain feed','-livestock feed','-feeding sheep','-leading livestock','-sheep grazing'}
    data['Other raw grain consumed (including processing)'] = sum(n for k,n in grain.items() if k.startswith('-') and k not in known)
    return data

def table(cols, rows):
    return '\n'.join(['| '+' | '.join(cols)+' |','|'+'|'.join(['---']*len(cols))+'|']+
        ['| '+' | '.join(str(v) for v in row)+' |' for row in rows])

def diff(n):
    return f'{n:+,}' if isinstance(n,int) else f'{n:+,.1f}'

runs = {(s,a):load(s,266,a) for s in seeds for a in arms}
historical = {a:load('aspen',261,a) for a in ['base','boost']}
all_runs = [*runs.values(),*historical.values()]
assert len({r['source'] for r in all_runs}) == 1
for r in all_runs:
    assert r['immigration'] and [d['day'] for d in r['days']] == list(range(1,13))
    for d in r['days']:
        assert d['conserved'] and not any(d['residuals'].values()) and not d['fieldResidual'], (r['seed'],r['version'],r['arm'],d)
    assert measures(r)['Prepared feed made (portions)'] == 2*measures(r)['Raw grain mixed into feed']
hash_status = []
for arm,r in historical.items():
    old = json.loads((root.parent/'livestock-20261120'/f'aspen-trace-{arm}.json').read_text())
    matches = [d['hash']==o['hash'] for d,o in zip(r['days'],old['days'],strict=True)]
    hash_status.append(f"{arm} {sum(matches)}/12 daily hashes, day 12 {r['days'][-1]['hash']} (archive {old['days'][-1]['hash']})")

m = {key:measures(r) for key,r in runs.items()}
parts=['# Harvestable grain and its labour',
'Twelve days from each fresh Normal Aspen and River start, arrivals on, working rules 266. The off arm uses the earlier wild and field yields. Both arms can prepare feed. Figures are settlement totals for individual histories. Grain mixes in stacks. Destinations are measured differences between histories and cannot identify the fate of an individual extra grain.',
'## Current combined boost versus earlier yields',
'Harvest, gathering and storage receipts measure movement. A grain can enter a building, leave it and then be eaten. Only final stocks and irreversible uses can be added to account for new production. Prepared feed uses a separate unit: one grain makes two portions.']
rows=[]
for k in m['aspen','base']:
    line=[k]
    for s in seeds:
        old,new = (m[s,a][k] for a in ['base','boost'])
        line += [old,new,diff(new-old)]
    rows.append(line)
parts.append(table(['Measure','Aspen off','Aspen on','Change','River off','River on','Change'],rows))
parts += ['In Aspen, the combined boost grew 206 additional grain. The extra 176 field grain reconciled to 114 harvested, 40 rotted and 22 left standing. People gathered 36 fewer wild grain. Buildings received 51 more grain over the run but held 16 fewer on day 12. People ate 59 more grain and keepers mixed four fewer grain into feed.',
          'In River, the boost grew 252 additional grain. The extra 96 field grain reconciled to 21 harvested, 35 rotted and 40 left standing. People collected 107 more wild grain. Buildings received 42 more and held 22 more on day 12. People ate 63 more grain and keepers mixed six more grain. Animals consumed three fewer prepared portions in each settlement.']
parts += ['## Changing field yield with current wild grain',
'All four columns per world keep the faster wild regrowth. The target is the maximum at full care and soil condition. Actual harvests depend on care, soil, trips, pack capacity and spoilage.']
cols = ['World','Max grain/plot','Ripened','Harvested','Field rot','Standing','Into stores¹','People ate','Feed made²','Travel ticks','Work ticks']
rows = []
for s in seeds:
    for a,cap in [('t18',18),('wild',21),('t24',24),('boost',31)]:
        v=m[s,a]
        rows.append([s,cap]+[v[k] for k in ['Field grain ripened','Field grain harvested','Field grain rotted','Grain left standing on plots','Gross grain transferred into buildings','Raw grain eaten by people','Prepared feed made (portions)','Grain-task travel ticks','Grain-task work ticks']])
parts += [table(cols,rows),'¹ Gross receipts across buildings include both wild and cultivated grain. ² Prepared portions.']
parts += ['At a fixed wild yield, moving from 21 to 24 raised the amount harvested, deposited and eaten in Aspen; all three fell in River. At 18, both settlements collected less from plots than at 21. These two starts do not establish a field target that consistently delivers more grain into storage and meals.']
parts += ['## Where the labour went',
'Travel is a call to the movement step, including unsuccessful and interrupted attempts; distance is actual displacement in tiles. Work is a call to the activity work handler. Arrival can use both phases in one tick. The grain categories include all tilling, planting, tending and harvesting; wild grain gathering; deposit, withdrawal and haul tasks explicitly carrying a grain plan; milling and feed mixing. Mixed cargo charges the entire task. General eating, giving, animal husbandry and unlabelled transport remain outside this subtotal. Settlement handler totals also include activities such as sleep.']
for s in seeds:
    rows=[]
    for k in ['till','plant','tend','harvest','wild gather','grain transport','mill','mix feed']:
        pair=[runs[s,a]['labour'].get(k,{'travel':0,'work':0}) for a in ['base','boost']]
        rows.append([k]+[v[phase] for phase in ['travel','work'] for v in pair])
    parts += [s.title(),table(['Activity','Travel off','Travel on','Work off','Work on'],rows)]
parts += ['## Verification',
'All 144 end-of-day world conservation checks passed. On each day, opening stock plus creation minus consumption and spoilage equalled measured stock for grain, seeds, flour, bread and prepared feed. Opening field grain plus ripening minus collections and field rot equalled standing grain. In all twelve runs the mixing recipe reconciled independently. Archived Aspen rules-261 cross-check: '+ '; '.join(hash_status)+'.',
'Working simulation source SHA-256 before instrumentation: `'+all_runs[0]['source']+'`. Each JSON contains per-item ledger reasons, transfer routes, opening and closing inventories, labour by activity and daily hashes. The field target and observations run in a disposable source copy. See PROTOCOL.md for the pre-run comparison.',
'## Reproduction',
'From the feature checkout in PowerShell:',
'~~~powershell\n$ev = (Resolve-Path review_evidence/grain-surplus-20261120).Path\n$probe = Join-Path $env:TEMP ("grain-surplus-" + [guid]::NewGuid())\npython "$ev/setup.py" $probe\nNew-Item -ItemType Junction -Path "$probe/node_modules" -Target (Resolve-Path node_modules) | Out-Null\nPush-Location $probe\ntry {\n  foreach ($seed in "aspen","river") {\n    foreach ($arm in "base","wild","t18","t24","boost") {\n      node node_modules/vite-node/dist/cli.mjs trace.ts $seed 266 $arm "$ev/$seed-266-$arm.json"\n    }\n  }\n  foreach ($arm in "base","boost") {\n    node node_modules/vite-node/dist/cli.mjs trace.ts aspen 261 $arm "$ev/aspen-261-$arm.json"\n  }\n} finally { Pop-Location }\npython "$ev/summarize.py"\n~~~']
meal_rows = []
combined_rows = []
hand_fed = []
for s in seeds:
    costs = []
    for a in ['base','boost']:
        replay=json.loads((root/f'meal-{s}-{a}.json').read_text())
        meals=replay.pop('grainMeals')
        assert replay == runs[s,a], (s,a,'meal observer changed primary evidence')
        direct = replay['ledger']['grain'].get('-eaten',0) - sum(v['bites'] for v in meals.values())
        assert direct >= 0
        hand_fed.append(f'{s} {a} {direct}')
        for kind,row in meals.items():
            meal_rows.append([s,a,kind,row['meals'],row['bites'],row['travel'],row['work'],round(row['distance'],1)])
        costs.append([sum(v[phase] for v in meals.values()) + m[s,a][metric] for phase,metric in
                      [('travel','Grain-task travel ticks'),('work','Grain-task work ticks')]])
    combined_rows.append([s,*costs[0],*costs[1],diff(costs[1][0]-costs[0][0]),diff(costs[1][1]-costs[0][1])])
parts += ['## Supplementary meal labour',
          'A second observer follows each pack or store meal from departure and counts its full travel and work when at least one bite actually consumes raw grain. Multiple grain bites count the meal once. Mixed meals charge their entire duration. These activities are separate from the production and transport subtotal. A bite eaten at the wild source already belongs to gathering. Failed generic meal trips without a grain bite cannot be attributed this way.',
          table(['World','Arm','Meal activity','Meals','Grain eaten','Travel ticks','Work ticks','Tiles walked'],meal_rows),
          'Production, transport and confirmed grain meals together:',
          table(['World','Travel off','Work off','Travel on','Work on','Extra travel','Extra work'],combined_rows),
          'All four replays reproduced every primary output, including travel and work counters, all daily hashes and per-item flows. After counting the pack and store bites, the eating ledger remainder belongs to hand-feeding (the other caller using that ledger reason). Remainders: '+', '.join(hand_fed)+'.',
          'To reproduce the supplement, substitute setup_meals.py for setup.py in a new temporary directory and run the two seeds with the base and boost arms only. Write those results to meal-<seed>-<arm>.json in the evidence directory, then run summarize.py after both sets have finished.']
(root/'REPORT.md').write_text('\n\n'.join(parts)+'\n',encoding='utf8')
print('\n'.join(hash_status))

