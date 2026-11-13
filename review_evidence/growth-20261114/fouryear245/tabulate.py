#!/usr/bin/env python3
"""Tabulate the four-year runs (out/<world>-<arm>.json from scripts/generation_trace.ts --load ...).

    python tabulate.py [--dir C:/dev/_claude_scratch/fouryear245] [--base A] [--vs B] [--noise A1,A2] [--md tables.md]

The arms are the base (A, rules as saved), the arm measured against it (--vs, B = rules 245; later C = rules 246 can be named here),
and the one-draw nudge arms of the base (--noise), which are the noise floor. One run per arm per world: a description, not a test.
Writes <dir>/tables.md and <dir>/metrics.json (every number the tables use, per world and arm).
"""
import argparse, json, math, os, sys
from collections import Counter

ap = argparse.ArgumentParser()
ap.add_argument('--dir', default='C:/dev/_claude_scratch/fouryear245')
ap.add_argument('--base', default='A')
ap.add_argument('--vs', default='B')
ap.add_argument('--noise', default='A1,A2')
ap.add_argument('--md', default='tables.md')
ap.add_argument('--worlds', default='aspen,cedar,fern,meadow,birch,river')
a = ap.parse_args()
OUT = os.path.join(a.dir, 'out')
WORLDS = a.worlds.split(',')
BASE, VS, NOISE = a.base, a.vs, a.noise.split(',')
ARMS = [BASE, VS] + NOISE

_saved = {}
def correct_prior_deaths(r, tag):
    """A run made before the runner counted only its own deaths (no `priorDeaths` in the JSON) has the save's earlier deaths in its
    first day's `died`, `causes`, `born` and `came` and at the head of `deaths`. Take them out, using the deceased list of the save the run
    was loaded from (read-only). Runs made by the fixed runner carry `priorDeaths` and are left as they are."""
    if 'priorDeaths' in r or not r.get('loaded'):
        return r
    path = r['loaded']
    if path not in _saved:
        _saved[path] = json.load(open(path, encoding='utf8'))['world']['deceased']
    old = _saved[path]
    n = len(old)
    d0 = r['days'][0]
    d0['died'] -= n
    c = Counter(d0['causes'])
    for o in old:
        c[o['cause']] -= 1
        if o['age'] < 1: d0['born'] -= 1
        else: d0['came'] -= 1
    d0['causes'] = {k: v for k, v in c.items() if v > 0}
    if any(v < 0 for v in c.values()) or d0['died'] < 0 or d0['born'] < 0 or d0['came'] < 0:
        print('WARNING negative count after the correction in', tag, file=sys.stderr)
    if any(x['day'] <= r['startDay'] for x in r['deaths'][n:]) or any(x['day'] > r['startDay'] for x in r['deaths'][:n]):
        print('WARNING the first', n, 'deaths of', tag, 'are not exactly those before the save', file=sys.stderr)
    r['deaths'] = r['deaths'][n:]
    if sum(d['died'] for d in r['days']) != len(r['deaths']):
        print('WARNING deaths in days[] and deaths[] disagree in', tag, file=sys.stderr)
    r['priorDeaths'] = n
    r['_corrected'] = True
    return r

runs = {}
for w in WORLDS:
    for arm in ARMS:
        p = os.path.join(OUT, f'{w}-{arm}.json')
        if os.path.exists(p) and os.path.getsize(p) > 0:
            try:
                runs[(w, arm)] = correct_prior_deaths(json.load(open(p, encoding='utf8')), f'{w}-{arm}')
            except Exception as e:  # a file being rewritten
                print('unreadable', p, e, file=sys.stderr)

def mean(xs):
    xs = [x for x in xs if x is not None]
    return sum(xs) / len(xs) if xs else None

def fmt(x, d=1):
    if x is None: return 'n/a'
    if isinstance(x, int) or (isinstance(x, float) and x == int(x) and d == 0): return str(int(x))
    return f'{x:.{d}f}'

def lean_seasons(r):
    """Runs of consecutive days with hardship == 'lean'. before = people the day before the first lean day (the day before the window
    for a season that starts on its first day is not in the JSON: n/a); low = lowest people from the first lean day through four days
    after the last (cut at the end of the window); deaths over that same span."""
    days = r['days']
    out = []
    i = 0
    while i < len(days):
        if days[i]['hardship'] == 'lean':
            j = i
            while j + 1 < len(days) and days[j + 1]['hardship'] == 'lean': j += 1
            k = min(len(days) - 1, j + 4)
            before = days[i - 1]['alive'] if i > 0 else None
            low = min(d['alive'] for d in days[i:k + 1])
            out.append(dict(first=days[i]['day'], last=days[j]['day'], through=days[k]['day'], cut=(k < j + 4), before=before, low=low,
                            loss=(before - low) if before is not None else None, deaths=sum(d['died'] for d in days[i:k + 1]),
                            born=sum(d['born'] for d in days[i:k + 1]), startAlive=days[i]['alive']))
            i = j + 1
        else:
            i += 1
    return out

def metrics(r):
    days, years = r['days'], r['years']
    m = {}
    m['done'] = r.get('done')
    m['rules'] = r.get('rulesVersion')
    m['startDay'] = r.get('startDay')
    m['endDay'] = r.get('endDay')
    m['daysRun'] = r.get('daysRun')
    m['minutes'] = r.get('minutes')
    yrs = [y for y in years]
    m['people_y'] = [y['alive'] for y in yrs]            # end of each year, as many as have run
    m['people_end'] = days[-1]['alive']
    causes = Counter()
    for d in days:
        causes.update(d['causes'])
    m['deaths'] = sum(d['died'] for d in days)
    m['deaths_by_cause'] = dict(causes)
    m['deaths_list_n'] = len(r['deaths'])
    m['born'] = sum(d['born'] for d in days)
    m['came'] = sum(d['came'] for d in days)
    last = days[-1]
    m['store_head_end'] = last['store'] / max(1, last['alive'])
    m['store_head_mean'] = sum(d['store'] for d in days) / max(1, sum(d['alive'] for d in days))
    m['hungry_share'] = mean([d['hungryShare'] for d in days])
    m['hungry_share_last_year'] = mean([d['hungryShare'] for d in days[-12:]])
    m['crit_person_days'] = sum(d['crit'] for d in days)
    if yrs:
        y = yrs[-1]
        m['plots'] = y['plots']
        b = y['buildings']
        m['granary'], m['bakery'], m['mill'] = b.get('granary', 0), b.get('bakery', 0), b.get('mill', 0)
        m['buildings'] = sum(b.values())
        m['households'] = y['households']
        m['householdsOfOne'] = y['householdsOfOne']
        m['largestHousehold'] = y['largestHousehold']
        m['stages_end'] = last['stages']
        m['life_end'] = y['life']
        for k in ('hungryShare', 'thirstyShare', 'workShare', 'survivalShare', 'lifeShare'):
            m['life_' + k] = y['life'][k]
        m['meals_store'] = y['life']['mealsFromStore']
        m['meals_pack'] = y['life']['mealsFromPack']
    m['lean'] = lean_seasons(r)
    return m

M = {k: metrics(r) for k, r in runs.items()}
json.dump({f'{w}-{arm}': v for (w, arm), v in M.items()}, open(os.path.join(a.dir, 'metrics.json'), 'w'), indent=1)

L = []
def P(s=''): L.append(s)

P('# Four years from a saved settlement: rules 244 as saved against rules 245, with one-draw nudges')
P()
P('One run per arm per world: a description, not a test. A = as saved (rules 244); B = `--rules-up 245`; A1, A2 = A with `--nudge 1`, `--nudge 2` '
  '(the lab\'s one extra random draw at the start, the noise floor). Aspen, cedar, fern, meadow continue from day 96 to day 144; birch and river from day 84 to day 132. '
  '"People" is people alive; "store a head" is food in stores and piles over people alive; "hungry share" is the mean over the window days of the day\'s share of '
  '40-tick samples with hunger under 42.')
P()

# --- status
P('## Runs')
P()
P('| world | arm | rules | days | done | minutes |')
P('|---|---|---|---|---|---|')
for w in WORLDS:
    for arm in ARMS:
        m = M.get((w, arm))
        if not m: P(f'| {w} | {arm} | n/a | missing | no | |'); continue
        P(f'| {w} | {arm} | {m["rules"]} | {m["startDay"]}-{m["startDay"] + m["daysRun"]} | {m["done"]} | {m["minutes"]} |')
P()

# --- per world
causes_all = sorted({c for m in M.values() for c in m['deaths_by_cause']})
P('## Per world')
P()
for w in WORLDS:
    if not any((w, arm) in M for arm in ARMS): continue
    P(f'### {w}')
    P()
    hdr = ['arm', 'people y1', 'y2', 'y3', 'y4', 'born', 'deaths'] + [f'd:{c}' for c in causes_all] + ['store/head end', 'store/head mean', 'hungry share', 'plots', 'granary', 'bakery', 'mill', 'buildings', 'households (of one)']
    P('| ' + ' | '.join(hdr) + ' |')
    P('|' + '---|' * len(hdr))
    for arm in ARMS:
        m = M.get((w, arm))
        if not m: continue
        py = (m['people_y'] + [None] * 4)[:4]
        row = [arm] + [fmt(x, 0) for x in py] + [fmt(m['born'], 0), fmt(m['deaths'], 0)] + [fmt(m['deaths_by_cause'].get(c, 0), 0) for c in causes_all] + \
              [fmt(m['store_head_end'], 2), fmt(m['store_head_mean'], 2), fmt(m['hungry_share'], 3), fmt(m.get('plots'), 0), fmt(m.get('granary'), 0), fmt(m.get('bakery'), 0), fmt(m.get('mill'), 0), fmt(m.get('buildings'), 0), f"{fmt(m.get('households'), 0)} ({fmt(m.get('householdsOfOne'), 0)})"]
        P('| ' + ' | '.join(row) + ' |')
    P()
    P('Lean seasons (hardship = lean). before = people the day before; low = lowest people from the first lean day through four days after the last; loss = before - low; deaths and births over that same span.')
    P()
    P('| arm | lean days | before | low | loss | deaths | births |')
    P('|---|---|---|---|---|---|---|')
    for arm in ARMS:
        m = M.get((w, arm))
        if not m: continue
        if not m['lean']: P(f'| {arm} | none in the window | | | | | |'); continue
        for s in m['lean']:
            cut = ' (window ends first)' if s['cut'] else ''
            before = fmt(s['before'], 0) if s['before'] is not None else f"n/a (starts day 1; {s['startAlive']} on its first day)"
            P(f"| {arm} | day {fmt(s['first'], 0)}-{fmt(s['last'], 0)}, to day {fmt(s['through'], 0)}{cut} | {before} | {s['low']} | {fmt(s['loss'], 0)} | {s['deaths']} | {s['born']} |")
    P()

# --- aggregate
def val(w, arm, key, sub=None):
    m = M.get((w, arm))
    if not m: return None
    v = m.get(key)
    if sub is not None: v = (v or {}).get(sub, 0)
    return v

metric_defs = [('people at the end (year 4)', 'people_end', None, 1), ('births', 'born', None, 1), ('deaths, all', 'deaths', None, 1)] + \
    [(f'deaths, {c}', 'deaths_by_cause', c, 1) for c in causes_all] + \
    [('hungry share (window mean)', 'hungry_share', None, 3), ('hungry share (last year)', 'hungry_share_last_year', None, 3),
     ('store a head, end', 'store_head_end', None, 2), ('store a head, window mean', 'store_head_mean', None, 2),
     ('hungry time, waking share, whole window (life counter)', 'life_hungryShare', None, 3), ('work share, whole window (life counter)', 'life_workShare', None, 3),
     ('thirsty time, waking share, whole window (life counter)', 'life_thirstyShare', None, 3), ('meals from a store, whole window', 'meals_store', None, 0),
     ('arrivals', 'came', None, 1),
     ('plots, end', 'plots', None, 1), ('granary, end', 'granary', None, 2), ('bakery, end', 'bakery', None, 2), ('mill, end', 'mill', None, 2),
     ('buildings, end', 'buildings', None, 1), ('households, end', 'households', None, 1)]
# people at the end of each year
for yi in range(4):
    metric_defs.insert(yi, (f'people, end of year {yi + 1}', 'people_y', yi, 1))

def getv(w, arm, key, sub):
    m = M.get((w, arm))
    if not m: return None
    v = m.get(key)
    if key == 'people_y':
        return v[sub] if v and len(v) > sub else None
    if sub is not None: return (v or {}).get(sub, 0)
    return v

agg = []
P('## Aggregate over the six worlds')
P()
P(f'Mean over the worlds of {BASE}, {VS}, and of each nudge arm; the differences are of means. "{VS} - {BASE} in worlds": in how many worlds |{VS} - {BASE}| is larger than both |{NOISE[0]} - {BASE}| and |{NOISE[1]} - {BASE}| (beyond), '
  f'and in how many the sign agrees with the mean difference (same sign). Verdict word: **beyond** = the mean difference is larger than both nudge mean differences and beyond in at least 5 of the worlds with the same sign in at least 5; '
  f'**most** = larger than both and beyond in 4 with the same sign in 4 or more; otherwise **within**. The range column counts the worlds in which '
  f'{VS} is below the lowest, or above the highest, of the three arms {BASE}, {NOISE[0]}, {NOISE[1]} (what chance alone gave). A description of one run per arm, not a test.')
P()
hdr = ['metric', f'mean {BASE}', f'mean {VS}', f'{VS} - {BASE}', f'{NOISE[0]} - {BASE}', f'{NOISE[1]} - {BASE}', 'worlds beyond', 'same sign', f'{VS} below / above the range of {BASE},{NOISE[0]},{NOISE[1]}', 'verdict']
P('| ' + ' | '.join(hdr) + ' |')
P('|' + '---|' * len(hdr))
for label, key, sub, d in metric_defs:
    per = []
    for w in WORLDS:
        vals = {arm: getv(w, arm, key, sub) for arm in ARMS}
        if any(v is None for v in vals.values()): continue
        per.append((w, vals))
    if not per: continue
    mA = mean([v[BASE] for _, v in per]); mB = mean([v[VS] for _, v in per])
    dB = mB - mA
    dn = [mean([v[n] for _, v in per]) - mA for n in NOISE]
    beyond = sum(1 for _, v in per if abs(v[VS] - v[BASE]) > max(abs(v[n] - v[BASE]) for n in NOISE))
    sign = sum(1 for _, v in per if (v[VS] - v[BASE]) * dB > 0)
    larger = abs(dB) > max(abs(x) for x in dn)
    below = sum(1 for _, v in per if v[VS] < min(v[BASE], *[v[n] for n in NOISE]))
    above = sum(1 for _, v in per if v[VS] > max(v[BASE], *[v[n] for n in NOISE]))
    n = len(per)
    if n == len(WORLDS) and larger and beyond >= 5 and sign >= 5: verdict = 'beyond'
    elif larger and beyond >= 4 and sign >= 4: verdict = 'most'
    else: verdict = 'within'
    if dB == 0 and all(x == 0 for x in dn): verdict = 'zero'
    agg.append(dict(metric=label, meanA=mA, meanB=mB, dB=dB, dn=dn, beyond=beyond, sign=sign, n=n, verdict=verdict, per=per, below=below, above=above))
    P(f'| {label} | {fmt(mA, d)} | {fmt(mB, d)} | {fmt(dB, d)} | {fmt(dn[0], d)} | {fmt(dn[1], d)} | {beyond}/{n} | {sign}/{n} | {below} / {above} | {verdict} |')
P()
P(f'### Each world: {VS} - {BASE} beside the nudges')
P()
for label, key, sub, d in metric_defs:
    if label not in ('people at the end (year 4)', 'deaths, all', 'store a head, end', 'hungry share (window mean)', 'plots, end', 'births') and not label.startswith('deaths,'): continue
    row = next((x for x in agg if x['metric'] == label), None)
    if not row: continue
    P(f'**{label}**: ' + '; '.join(f"{w}: {fmt(v[VS] - v[BASE], d)} (nudges {fmt(v[NOISE[0]] - v[BASE], d)}, {fmt(v[NOISE[1]] - v[BASE], d)})" for w, v in row['per']))
    P()

# --- lean season aggregate
P('## Lean-season losses, summed over the lean seasons of the window')
P()
P('Loss = people the day before a lean season less the lowest people from its first day through four days after its last. Seasons that begin on the first window day have no day before and are left out of the loss sum; the number left out is shown.')
P()
P('| world | arm | seasons | loss | deaths in the spans | left out |')
P('|---|---|---|---|---|---|')
tot = {arm: [0, 0, 0, 0] for arm in ARMS}
for w in WORLDS:
    for arm in ARMS:
        m = M.get((w, arm))
        if not m: continue
        ss = m['lean']
        loss = sum(s['loss'] for s in ss if s['loss'] is not None)
        dth = sum(s['deaths'] for s in ss)
        out = sum(1 for s in ss if s['loss'] is None)
        tot[arm][0] += len(ss); tot[arm][1] += loss; tot[arm][2] += dth; tot[arm][3] += out
        P(f'| {w} | {arm} | {len(ss)} | {loss} | {dth} | {out} |')
P()
P('| arm | seasons | loss, six worlds | deaths in the spans | left out |')
P('|---|---|---|---|---|')
for arm in ARMS:
    P(f'| {arm} | {tot[arm][0]} | {tot[arm][1]} | {tot[arm][2]} | {tot[arm][3]} |')
P()

open(os.path.join(a.dir, a.md), 'w', encoding='utf8').write('\n'.join(L) + '\n')
print('wrote', os.path.join(a.dir, a.md), 'runs read:', len(runs), 'of', len(WORLDS) * len(ARMS))
