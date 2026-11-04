"""Run only after verified recovery has been pushed to main. Preserve named tips and worktree bytes."""
import hashlib,json,subprocess
from pathlib import Path
ROOT=Path.cwd()
OUT=ROOT/'review_evidence/retired-recovery-20261104'
ROWS=json.loads((OUT/'refs.json').read_text(encoding='utf8'))
def git(*args,cwd=ROOT):
 return subprocess.check_output(['git',*args],cwd=cwd).decode('utf8').strip()
def run(*args,cwd=ROOT):
 print('git',*args,flush=True)
 subprocess.run(['git',*args],cwd=cwd,check=True)
def worktrees():
 return [dict(line.split(' ',1) if ' ' in line else (line,True) for line in b.splitlines()) for b in git('worktree','list','--porcelain').split('\n\n')]
def fingerprint(root):
 h=hashlib.sha256()
 h.update(subprocess.check_output(['git','ls-files','--stage','-z'],cwd=root))
 paths=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=root).decode('utf8').split('\0')
 for name in sorted(set(paths)-{''}):
  p=Path(root)/name;h.update(name.encode());h.update(b'\0')
  h.update(p.read_bytes() if p.is_file() else b'<absent>')
 return h.hexdigest()
if __name__=='__main__':
 import sys
 if sys.argv[1:]!=['--apply']:raise SystemExit('Explicit --apply required after integration checks.')
 main=git('rev-parse','main')
 if git('ls-remote','origin','refs/heads/main').split()[0]!=main:raise SystemExit('Local and remote main differ')
 run('merge-base','--is-ancestor','HEAD','main')
 wanted={r:row['sha'] for row in ROWS for r in row['originalRefs']}
 for ref,sha in wanted.items():
  if git('rev-parse',ref)!=sha:raise SystemExit('Retired ref changed: '+ref)
 for row in ROWS:
  if git('rev-parse',row['archiveTag']+'^{}')!=row['sha']:raise SystemExit('Archive target mismatch')
 # Publish the exact annotated archival names, then verify every peeled remote target.
 run('push','--atomic','origin',*['refs/tags/'+r['archiveTag'] for r in ROWS])
 remote=dict((line.split()[1],line.split()[0]) for line in git('ls-remote','--tags','origin','refs/tags/archive/retired-20261104/*').splitlines())
 for row in ROWS:
  if remote.get('refs/tags/'+row['archiveTag']+'^{}')!=row['sha']:raise SystemExit('Remote archive verification failed')
 audit={'main':main,'archiveTagsVerified':len(ROWS),'detached':[],'deletedRemote':[],'deletedLocal':[]}
 def save(): (OUT/'cleanup-result.json').write_text(json.dumps(audit,indent=2)+'\n',encoding='utf8')
 save()
 for t in worktrees():
  if t.get('branch') not in wanted:continue
  root=t['worktree'];before=fingerprint(root)
  run('switch','--detach',t['HEAD'],cwd=root)
  after=fingerprint(root)
  audit['detached'].append({'worktree':root,'head':t['HEAD'],'branch':t['branch'],'before':before,'after':after});save()
  if before!=after:raise SystemExit('Worktree bytes/index changed; deletion stopped')
 names=[r.removeprefix('refs/remotes/origin/') for r in wanted if r.startswith('refs/remotes/origin/')]
 # Compare the live remote once more; never delete a branch that moved after review.
 live=dict((line.split()[1],line.split()[0]) for line in git('ls-remote','--heads','origin').splitlines())
 for name in names:
  if live.get('refs/heads/'+name)!=wanted['refs/remotes/origin/'+name]:raise SystemExit('Remote branch moved: '+name)
 run('push','--atomic','origin',*[':refs/heads/'+name for name in names]);audit['deletedRemote']=names;save()
 for ref,sha in wanted.items():
  if ref.startswith('refs/heads/'):
   run('update-ref','-d',ref,sha);audit['deletedLocal'].append(ref);save()
 run('fetch','origin','--prune')
 remaining=git('for-each-ref','--format=%(refname)','refs/heads','refs/remotes/origin').splitlines()
 if set(wanted)&set(remaining):raise SystemExit('A retired ref remains')
 audit['remainingReviewedRefs']=[];save();print(json.dumps(audit,indent=2))
