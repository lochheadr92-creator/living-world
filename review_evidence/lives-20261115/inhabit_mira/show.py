import sys,re
t=sys.stdin.read()
keep=('=== ASK','TIME','SELF','HOUSEHOLD','DOING','IN SIGHT','WORRIES','RECENT MEMORY','RECENT FAILURES','OPTIONS','SET ASIDE','PLANS','YOUR NOTES')
out=[];mode=None
for line in t.split('\n'):
    if line.startswith(' ') or line.startswith('\t'):
        if mode in ('IN SIGHT','RECENT MEMORY','OPTIONS'):
            if mode=='IN SIGHT' and len(out)>0 and sum(1 for o in out if o.startswith('  #'))>=6: continue
            if mode=='RECENT MEMORY' and sum(1 for o in out if o.startswith('  [t'))>=5: continue
            out.append(line[:420])
        continue
    mode=None
    for k in keep:
        if line.startswith(k):
            mode=k;
            if k=='SELF': line=line[:330]
            if k in('SET ASIDE','PLANS','YOUR NOTES'): line=line[:700]
            out.append(line[:420]);break
print('\n'.join(out))
