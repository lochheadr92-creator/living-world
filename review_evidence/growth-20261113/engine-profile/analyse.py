import json, glob, collections, os

f = glob.glob('*.cpuprofile')[0]
d = json.load(open(f))
nodes = {n['id']: n for n in d['nodes']}
dt = d['timeDeltas']
samples = d['samples']
self_t = collections.Counter()
for s, t in zip(samples, dt):
    self_t[s] += t
total = sum(self_t.values())
BS = chr(92)


def where(cf):
    u = cf['url'].replace(BS, '/')
    if 'living-world-integrate/' in u:
        return u.split('living-world-integrate/')[-1]
    return '(engine or node) ' + os.path.basename(u)


def name(n):
    cf = n['callFrame']
    return f"{cf['functionName'] or '(anon)'} [{where(cf)}:{cf['lineNumber'] + 1}]"


byf = collections.Counter()
for i, t in self_t.items():
    byf[name(nodes[i])] += t
print('total sampled seconds', round(total / 1e6))
print('-- self time, top 30')
for k, v in byf.most_common(30):
    print(f"{100 * v / total:5.1f}%  {k}")
parent = {}
for n in d['nodes']:
    for c in n.get('children', []):
        parent[c] = n['id']
incl = collections.Counter()
for i, t in self_t.items():
    seen = set()
    j = i
    while j is not None:
        nm = name(nodes[j])
        if nm not in seen:
            incl[nm] += t
            seen.add(nm)
        j = parent.get(j)
print('-- inclusive time, the sim functions, top 45')
k = 0
for nm, v in incl.most_common(400):
    if 'src/sim/' in nm:
        print(f"{100 * v / total:5.1f}%  {nm}")
        k += 1
        if k >= 45:
            break
byfile = collections.Counter()
for i, t in self_t.items():
    byfile[where(nodes[i]['callFrame'])] += t
print('-- self time by file, top 18')
for k2, v in byfile.most_common(18):
    print(f"{100 * v / total:5.1f}%  {k2}")
