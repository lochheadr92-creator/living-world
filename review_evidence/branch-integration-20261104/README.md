# Branch review and preservation, 4 November 2026

Owner request: stop capability implementation, commit and push outstanding work, then review all branches for integration, including older work.

`branches.json` is the fetched pre-integration inventory against main a916ec0: 82 references, 63 unique tips, 30 non-ancestor tips. `worktrees.json` records the 78 registered worktrees before preservation. These are dated observations, not live status.

## Outstanding work archive

`preservation.json` lists 71 worktree manifests, 1,378 original main-checkout files to publish, exclusions and the credential-pattern scan result. Each manifest in `worktree-archive/` records its original absolute location, HEAD, branch, outstanding working files, independent staged contents and deletions. Frozen measurement checkouts remain historical snapshots; their source files are not installed into the current product.

A file with `archiveObject` is gzip-compressed exact bytes. Decompress it and compare its SHA-256 with the manifest before restoring it into a NEW recovery directory at the recorded relative path. A file with `repositoryPath` is stored directly in the initial preservation commit containing this README; read that revision of the file, since future edits may change the working copy. Reconstruct a historical checkout from its recorded HEAD, overlay its working files, and apply recorded deletions. Staged files are a separate snapshot, not additional working-file replacements.

The archive contains 3,446 unique compressed objects (247,174,839 bytes). The worktree manifests describe 2,252,869,886 logical bytes, including duplicate snapshots and evidence already represented by identical main files. The compressed objects deduplicate equal file contents.

Ignored project evidence, logs and saves are included. Dependency/build directories, Git internals, local assistant skills/attachments and potential credential filenames are excluded with explicit reasons. The owner prompt archive is outside this repository and was not copied. No credential-pattern hits were found; this is a bounded automated scan, not proof that every possible secret format was recognized.

No source worktree or index was cleaned, reset or switched. Archived sibling checkouts can therefore still show their original dirty state: preservation does not erase the originals.

## Evidence limits

Older probes, failed tests, interrupted runs and adverse results are preserved as found. Archiving is not a passing test verdict or renewed validation of historical conclusions. Some review probes use machine-local paths. The known main typecheck failures in two `zz_review` probes are retained in this initial checkpoint; integration verification is recorded separately. Survival development remains stopped at rules 133, with its existing incomplete programme and adverse outcome findings unchanged.
