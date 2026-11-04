import json,re
from pathlib import Path
root=Path('survival_evidence/continuation-20261104')
run=json.loads((root/'full-suite-run.json').read_text(encoding='utf-8-sig'))
assert run['exitCode']==0 and not run['changedSources'],run
report=json.loads((root/'full-suite.json').read_text(encoding='utf-8'))
assert report['success'] and report['numFailedTests']==0
files=len(report['testResults']);tests=report['numPassedTests']
rows=[]
for folder,pattern in [('../living-world-integrate','before-*'),('../living-world-survival149','after149-*'),('.','final151-*')]:
 for p in sorted((Path(folder)/root).glob(pattern)):
  if not p.is_dir():continue
  d=json.loads((p/'report.json').read_text(encoding='utf-8'));assert d['stop']=='horizon' and d['continuationEqual'] and d['conservation']['ok']
  rows.append(dict(run=p.name,rules=d['settings']['rulesVersion'],seed=d['seed'],population=d['population'],tick=d['tick'],pureChecks=d['pureChecks'],seconds=d['seconds'],preservedEaten=d['survival']['consumed'],gear=d['gear']['counts'],sheep=d['livestock']['counts']))
assert len(rows)==9
(root/'ordinary-summary.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8')
summary=f'''**Current checkpoint (4 November 2026): rules 151, product save format 5.** Three survival-chain repairs are implemented: bounded collection of one's processing preserved food and quantity-aware paid butchery (149), checked trap-catch recovery before reset (150), and known food-route comparison before sheep slaughter (151). Final local verification on THEWEAPON passes {files} files / {tests:,} tests with unchanged source/config hashes; typecheck/build pass. Staged autonomous runs demonstrate eaten dried meat, attributable trap-meat meals and a lamb birth with exact continuation and conservation. All nine 25-day Normal arrivals-on screens (rules 148/149/151, forest/river/meadow) pass integrity checks but show no activation of those three target chains. Ordinary uptake, body-origin preserved-meat completion, sustainable flocks and aggregate benefit remain open. See the survival capability record and `survival_evidence/continuation-20261104/README.md`; follow the ordered dependency-chain programme. Earlier checkpoints remain historical.'''
for name in ['AGENTS.md','CLAUDE.md','HANDOFF.md','docs/CLAUDE_AUTONOMY_HANDOFF.md']:
 p=Path(name);s=p.read_text(encoding='utf-8');s=re.sub(r'\*\*Active roadmap \(4 November 2026\):.*?(?=\n\n)',summary,s,count=1,flags=re.S)
 if name=='HANDOFF.md':s=s.replace('# Roadmap execution handoff — rules 148','# Roadmap execution handoff — rules 151',1)
 p.write_text(s,encoding='utf-8')
p=Path('docs/DEPENDENCY_CHAIN_PROGRAMME.md');s=p.read_text(encoding='utf-8').replace('## Reconciled active roadmap — 4 November 2026, rules 148','## Reconciled active roadmap — 4 November 2026, rules 151',1)
s=s.replace('Start from clean published main `2cec05652c46712e64c95be5a14d972c162b2239`.','Reconciliation began from published main `2cec05652c46712e64c95be5a14d972c162b2239`; the subsequent rules-148 checkpoint was `80a0c287`.',1)
s=re.sub(r'\| 2 \| \*\*Survival completion:.*?\n','| 2 | **Survival repairs implemented; ordinary acceptance partial** | Rules 149–151 repair premature rack collection, ingredient-sized butchery, checked trap-catch recovery/reset and sheep slaughter despite faster known food. Staged autonomous dried-meat meals, trap-meat meals and lamb birth pass, including final-source rendered/continuation checks. Fresh 148/149/151 forest/river/meadow 25-day screens are all integrity passes and target-chain activation nulls. Next: diagnose ordinary acquisition/supply opportunities and the body-origin preservation diversion; no speculative score tuning. Frozen older cohorts and wider benefit claims remain separate. See [SURVIVAL_CAPABILITIES.md](SURVIVAL_CAPABILITIES.md). |\n',s,count=1)
s=s.replace('Items 1a and 1b are closed; the next behavior work is item 2, beginning with ordinary preserved-meat diagnosis.','Items 1a and 1b are closed. Subsequent item-2 repairs and their remaining acceptance limits are recorded above.',1)
s=s.replace('### What is already present',summary+'\n\n### What is already present',1);p.write_text(s,encoding='utf-8')
p=Path('docs/SURVIVAL_CAPABILITIES.md');s=p.read_text(encoding='utf-8');s=s.replace('# Survival capabilities\n','# Survival capabilities\n\n'+summary+'\n',1)
s=s.replace('**Resumed 4 November 2026:**','**Historical resumption, 4 November 2026:**',1)
s=s.replace('rules 149 candidate','rules 149 implementation checkpoint',1).replace('rules 150 candidate','rules 150 implementation checkpoint',1).replace('rules 151 candidate','rules 151 implementation checkpoint',1)
s=s.replace('full-suite and ordinary results remain pending at this candidate checkpoint.','full-suite and ordinary results were pending at this historical implementation checkpoint; final results are above.',1)
s=s.replace('Full-suite and final-source ordinary screens are pending.','At this implementation checkpoint the full suite and final-source ordinary screens were pending; final results are above.',1)
p.write_text(s,encoding='utf-8')
p=root/'README.md';s=p.read_text(encoding='utf-8');table='| Rules | Seed | Day | People alive | Target-chain activation |\n|---|---|---:|---:|---|\n'+''.join(f"| {r['rules']} | {r['seed']} | 25 | {r['population']} | None |\n" for r in rows)
text=f'''Final regression: **{files} files, {tests:,} tests passed**, zero failures. `full-suite-run.json` records exit 0, THEWEAPON and unchanged source/config hashes. Typecheck/build pass (`build151.exit.txt`: 0). All 13 rendered assertions across the three scenes pass. Verification verdict: **TURN_INTEGRATION_VERIFIED** for the bounded repairs and staged causal chains; ordinary activation/reliability and mature-world benefit remain inconclusive.

{table}
All nine runs completed at tick 60,000 with 500 pure observation checkpoints each, exact unobserved twins, conservation and 120-tick saved continuation. Rules 148/149 have identical final state after removing only their explicit rules labels (`rules148-149-state-comparison.json`). No aggregate benefit follows from these target-chain nulls. No mature Normal/Large benchmark or completion of the older frozen benefit cohorts was performed in this task.'''
s=s.replace('The ordinary results and full-suite verdict are filled from completed reports at finalization. No aggregate survival benefit or mature Normal/Large performance claim is made. Older interrupted cohort evidence is not mixed into these screens.',text)
p.write_text(s,encoding='utf-8');print({'files':files,'tests':tests,'ordinaryRuns':len(rows)})
