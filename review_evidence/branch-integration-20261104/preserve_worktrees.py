"""Archive outstanding project work without changing any source worktree/index.

Run from repository root. Objects are exact bytes, gzip compressed with mtime=0.
Manifests distinguish working files, staged files and deletions against each HEAD.
The current audit directory is excluded to avoid recursive self-archiving.
"""
import gzip
import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path.cwd()
OUT = ROOT / 'review_evidence/branch-integration-20261104'
ARCHIVE = OUT / 'worktree-archive'
ARCHIVE.mkdir(exist_ok=True)
EXCLUDED_PARTS = {'.git', 'node_modules', 'dist', '.agents', '.codex-remote-attachments'}
SECRET = re.compile(rb'(?:-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sk-(?:proj-|ant-)?[A-Za-z0-9_-]{35,})')

def git(root, *args):
    return subprocess.check_output(['git', '-C', str(root), *args])

def paths(raw):
    return [x.decode('utf-8') for x in raw.split(b'\0') if x]

def excluded(name):
    p = Path(name)
    if set(p.parts) & EXCLUDED_PARTS:
        return 'dependency/build output, Git internals, or local assistant configuration/attachments'
    if name.startswith('review_evidence/branch-integration-20261104/'):
        return 'current archive (avoid recursion)'
    if p.name == '.env' or p.name.startswith('.env.') or p.suffix in {'.pem', '.key', '.pfx'}:
        return 'potential credential file'
    return None

known = {}
objects = {}
hits = []
excluded_files = []
main_publish = []
trees = json.loads((OUT / 'worktrees.json').read_text(encoding='utf-8'))
trees.sort(key=lambda t: Path(t['worktree']).resolve() != ROOT.resolve())

def save_bytes(data, source, repository_path=None):
    digest = hashlib.sha256(data).hexdigest()
    if SECRET.search(data):
        hits.append(source)
        return {'sha256': digest, 'bytes': len(data), 'withheld': 'credential-pattern review required'}
    if digest not in known:
        if repository_path is not None:
            known[digest] = {'repositoryPath': repository_path}
        else:
            name = f'objects/{digest[:2]}/{digest}.gz'
            dest = ARCHIVE / name
            dest.parent.mkdir(parents=True, exist_ok=True)
            if not dest.exists():
                dest.write_bytes(gzip.compress(data, compresslevel=6, mtime=0))
            objects[digest] = dest.stat().st_size
            known[digest] = {'archiveObject': name}
    return {'sha256': digest, 'bytes': len(data), **known[digest]}

summaries = []
for i, tree in enumerate(trees):
    root = Path(tree['worktree'])
    if not root.exists():
        continue
    main = root.resolve() == ROOT.resolve()
    ordinary = set(paths(git(root, 'ls-files', '--others', '--exclude-standard', '-z')))
    changed = set(paths(git(root, 'diff', '--name-only', 'HEAD', '-z')))
    ignored_roots = paths(git(root, 'ls-files', '--others', '--ignored', '--exclude-standard', '--directory', '-z'))
    ignored = set()
    for name in ignored_roots:
        reason = excluded(name)
        if reason:
            excluded_files.append({'worktree': str(root), 'path': name, 'reason': reason})
            continue
        p = root / name
        if p.is_file():
            ignored.add(name)
        elif p.is_dir():
            for f in p.rglob('*'):
                if f.is_file():
                    ignored.add(f.relative_to(root).as_posix())
    entries = []
    for name in sorted(ordinary | changed | ignored):
        reason = excluded(name)
        if reason:
            excluded_files.append({'worktree': str(root), 'path': name, 'reason': reason})
            continue
        p = root / name
        kind = 'tracked-change' if name in changed else 'untracked' if name in ordinary else 'ignored-evidence'
        if not p.exists():
            entries.append({'path': name, 'kind': kind, 'deleted': True})
        elif p.is_file():
            repo_path = name if main and name in ordinary else None
            entry = {'path': name, 'kind': kind, **save_bytes(p.read_bytes(), f'{root}/{name}', repo_path)}
            entries.append(entry)
            if repo_path and 'withheld' not in entry:
                main_publish.append(name)
    # Preserve the original index independently of worktree contents.
    staged = []
    for name in paths(git(root, 'diff', '--cached', '--name-only', '-z')):
        listing = git(root, 'ls-files', '--stage', '-z', '--', name)
        if not listing:
            staged.append({'path': name, 'deleted': True})
        else:
            mode, oid, stage = listing.split(b'\t')[0].decode().split()
            staged.append({'path': name, 'mode': mode, 'stage': stage,
                           **save_bytes(git(root, 'cat-file', 'blob', oid), f'{root}/INDEX:{name}')})
    if entries or staged:
        filename = f'{i:02d}-{root.parent.name}-{root.name}.json'
        manifest = {'worktree': str(root), 'head': tree['HEAD'], 'branch': tree.get('branch'),
                    'workingFiles': entries, 'stagedFiles': staged}
        (ARCHIVE / filename).write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
        summaries.append({'manifest': filename, 'files': len(entries), 'staged': len(staged),
                          'bytes': sum(e.get('bytes', 0) for e in entries)})
        print(filename, len(entries), 'files', flush=True)

result = {'manifests': summaries, 'uniqueCompressedObjects': len(objects),
          'compressedBytes': sum(objects.values()), 'credentialPatternHits': hits,
          'exclusions': excluded_files, 'mainPublish': sorted(main_publish)}
(OUT / 'preservation.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps({k: v for k, v in result.items() if k not in {'manifests', 'exclusions', 'mainPublish'}}))
if hits:
    raise SystemExit('Credential-pattern hits need review; nothing has been committed or pushed.')
