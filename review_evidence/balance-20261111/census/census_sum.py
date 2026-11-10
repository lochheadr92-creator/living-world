import glob, json, os, sys
d = sys.argv[1]
rows = [json.load(open(f, encoding='utf-8')) for f in sorted(glob.glob(os.path.join(d, '*.json')))]
n = len(rows)
def mean(k):
    return sum(r.get(k, 0) or 0 for r in rows) / n
def agg(k):
    out = {}
    for r in rows:
        for a, v in (r.get(k) or {}).items(): out[a] = out.get(a, 0) + v
    return {a: v / n for a, v in sorted(out.items(), key=lambda x: -x[1])}
print(f'{n} seeds, rules {rows[0]["rules"]}, {rows[0]["days"]} days; per settlement means')
print('people', round(mean('deaths'),1), 'deaths;', 'births', round(mean('births'),2), '; households', round(mean('households'),1), '; traditions', round(mean('traditions'),2), '; crews', round(mean('crews'),2), '; exchangeReceipts', round(mean('exchangeReceipts'),2), '; sheep', round(mean('animals'),2), '; carts', round(mean('carts'),2))
P = {}
for k in ['alive','children','elders','withTrade','apprentices','partnered','withGoal','ill','injured','heardStories','techniques']:
    P[k] = round(sum(r['persons'][k] for r in rows)/n, 2)
print('persons', P)
print('civic', {s: sum(r['civicProjects'].count(s) for r in rows)/n for s in ['active','completed','failed']})
print('buildings', {k: round(v,2) for k, v in agg('buildings').items()})
print('occasions', {k: round(v,2) for k, v in agg('occasions').items()})
print('chronicle', {k: round(v,1) for k, v in agg('chronicle').items()})
print('events', {k: round(v,1) for k, v in agg('events').items()})
print('conversations by purpose', {k: round(v,1) for k, v in agg('convByPurpose').items()})
print('activity ends (success/all) by kind:')
ok = agg('actEndOk'); al = agg('actEnd')
for k, v in sorted(al.items(), key=lambda x: -x[1]): print(f'  {k:16s} {ok.get(k,0):8.1f} / {v:8.1f}')
print('\nOFFERED (option kind: label) per settlement over 25 days, sampled every 50 ticks:')
off = agg('offered'); ch = agg('chosen')
for k, v in list(off.items())[:70]: print(f'  {v:8.1f} offered {ch.get(k,0):8.1f} chosen  {k}')
print('\nLIFE options offered/chosen (socialize, attend, visit, wander, host, mediate):')
for k, v in off.items():
    if k.split(':')[0] in ('socialize','attend','visit','wander','attend_meal','host_meal','pay_respects','alone','argue'): print(f'  {v:8.1f} offered {ch.get(k,0):8.1f} chosen  {k}')
print('\nBLOCKED (top 60):')
for k, v in list(agg('blocked').items())[:60]: print(f'  {v:8.1f}  {k}')
print('\nEVENT TEXTS (top 60):')
for k, v in list(agg('eventTexts').items())[:60]: print(f'  {v:7.1f}  {k}')
