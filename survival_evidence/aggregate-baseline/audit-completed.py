import json,pathlib,statistics,hashlib
root=pathlib.Path('survival_evidence/aggregate-baseline')
old=json.loads(pathlib.Path('p01_evidence/p01c-floors/summary.json').read_text())['arms']['r121-on']['draws']
refs={(0 if x['spec']=='control' else x['fork'],int(x['spec'].split(':')[1]) if x['spec']!='control' else 0):x for x in old}
rows=[]; manifests=set();initials={}
for path in sorted(root.glob('*/report.json')):
 r=json.loads(path.read_text()); assert r['tick']==60000 and r['days']==25 and r['settings']['rulesVersion']==121 and r['settings']['immigration'] and r['conservation']['ok'] and r['exactSave'] and r['continuationEqual'],str(path)
 assert hashlib.sha256(path.with_name('final.json').read_bytes()).hexdigest()==r['finalSaveHash']
 assert r['settings']['population']==28 and r['settings']['harsh'] is False and r['settings']['scene']=='natural' and r['settings']['dynamics']=='rich'
 manifests.add(hashlib.sha256(json.dumps(r['source'],sort_keys=True).encode()).hexdigest())
 initials.setdefault(r['seed'],set()).add(r['initialHash'])
 row={'name':path.parent.name,'seed':r['seed'],'fork':r['fork'],'nudge':r['nudge'],'population':r['population'],'finalHash':r['finalHash']}
 if r['seed']=='forest':
  ref=refs[(r['fork'] if r['nudge'] else 0,r['nudge'])];assert ref['finalHash']==r['finalHash'],row
  row['matchesHistoricalP01c']=True
 rows.append(row)
expected={(s,f,n) for s in ['forest','river','meadow'] for f,n in [(4,0)]+[(4,n) for n in range(1,9)]+[(f,n) for f in [2,3,5,6] for n in range(1,5)]}
assert {(r['seed'],r['fork'],r['nudge']) for r in rows}==expected
assert len(manifests)==1 and all(len(v)==1 for v in initials.values())
exits=[json.loads(p.read_text()) for p in root.glob('*.exit.json')]
assert len(exits)==14 and all(e['exitCode']==0 and not e.get('error') for e in exits)
report={'scope':'All 75 declared draws completed. Validates saved output hashes, matching frozen source manifests, within-seed initial hashes and recorded integrity flags, not a new replay. The resumed launcher returned 0 and records explicit exit 0 for its 14 new draws. Most original launcher child exit codes were unavailable; its 61 retained results passed the same data audit. All 25 forest final hashes match historical P0.1c. Shared prefixes mean these are not 75 independent worlds.','completed':len(rows),'matchingSourceManifests':len(manifests),'explicitExitZero':len(exits),'seeds':{},'rows':rows}
for seed in ['forest','river','meadow']:
 vals=[r['population'] for r in rows if r['seed']==seed]
 if vals:report['seeds'][seed]={'n':len(vals),'mean':statistics.mean(vals),'median':statistics.median(vals),'range':[min(vals),max(vals)]}
(root/'final-audit.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='rows'},indent=2))
