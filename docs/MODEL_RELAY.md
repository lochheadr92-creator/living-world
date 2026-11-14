# Model relay

An opt-in tool for one change at a time: Claude designs it and judges the result, xAI Grok writes the code, DeepSeek and then
ChatGPT review it adversarially. Built on the owner's request of 13 November 2026. It is not part of the simulation and not a
required step: `WORKFLOW.md` stands as it is (no mandatory second reviewer, no approval round), and nothing in `WORKFLOW.md`,
`AGENTS.md` or `CLAUDE.md` was changed. Use it when the owner asks for it by name.

Code: `tools/relay/`. Driver for agents: `.claude/workflows/model-relay.js`. Procedure for a session: the `model-relay` skill
(`.claude/skills/model-relay/SKILL.md`). Tests: `tests/relay_*.test.ts`.

## What happens in a run

```
owner's task
   |
Claude (Fable): start a run -> a private clone at one commit; write the work order (spec, exact files, call-site census, tests)
   |
relay: baseline gate at the base commit
   |
Grok: writes the change as SEARCH/REPLACE blocks  --> applied only if every block matches exactly once, in named files only
   |
Claude: makes the orchestrator-only edits (version, lab arm), reads the code before anything runs it
   |
relay: gate = typecheck + the named tests, judged against the baseline   --(fails)--> back to Grok, at most 2 rounds
       (a named test nobody wrote, a file in which nothing ran, a hook that failed: each fails the gate)
   |
DeepSeek: reviews the diff (JSON findings)
   |
Claude: reproduces each finding with a probe that must fail; verdicts; writes the fix instructions itself
   |
Grok: fixes what was confirmed; gate again, now with the confirmed probes
   |
ChatGPT: reviews the corrected change, without seeing DeepSeek's findings
   |
Claude: reproduces, verdicts; Grok fixes; gate
   |
relay: summary; the branch relay/<run-id> is added to the checkout.  No merge.  No push.
```

The sequence lives in one place, `tools/relay/driver.ts` (`decide`). Whoever drives a run only repeats
`node tools/relay/relay.mjs advance --run <id>` and gives the judgement it asks for; a command out of order is refused.

## Setting it up on the Windows machine

One line per block (Windows PowerShell 5.1). Keys are read from the environment and never written anywhere: `XAI_API_KEY`,
`DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, each from that variable and no other. Set them in the shell that starts the Claude
session (or that runs the relay by hand), for that shell only:

```
$env:XAI_API_KEY = "<the key>"
```
```
$env:DEEPSEEK_API_KEY = "<the key>"
```
```
$env:OPENAI_API_KEY = "<the key>"
```

Setting them once under Windows Settings ("Edit environment variables for your account") also works and saves the typing,
but those values sit in the registry, where any program run as you can read them, the code the gate runs included; the gate's
own environment has the keys taken out, and that would be the way round it. A reviewer whose key is absent is skipped and the
summary says so.

```
cd "C:\dev\Claude Experiment\living-world-integrate"
```
```
node tools/relay/relay.mjs init
```
```
node tools/relay/relay.mjs doctor
```
```
node tools/relay/relay.mjs doctor --live
```

`init` makes the relay's home, by default the folder `_relay` beside the checkout (set `RELAY_HOME` to put it elsewhere, for
example `C:\dev\_claude_scratch\relay`; keep it out of the user profile, whose path carries the account name). It runs `npm ci`
there once, so that every run's clone finds `node_modules` by Node's upward search and no clone holds a link into the checkout.
Run `init` again when `package-lock.json` changes.

`doctor --live` lists the models each key can reach and makes one small real call per role with the same request builder and
the same parsers a run uses (a few cents). **The model names in the defaults were read from search summaries of the vendors'
pages on 13 November 2026 and were never tried against a live key.** Where doctor prints STOP, put a listed name in
`<home>\relay.config.json`:

```json
{ "roles": { "writer": { "model": "grok-4.7" }, "reviewer1": { "model": "deepseek-v4-pro" }, "reviewer2": { "model": "gpt-6.1-sol" } } }
```

The same file can change any setting in `tools/relay/config.ts` (`DEFAULT_CONFIG`): per role `maxOutputTokens`,
`maxInputTokens`, and `extraBody` for vendor options once confirmed (for example `{"reasoning_effort": "high"}`); per provider
`stream`, `tokenParam`, `jsonMode`; the clocks and limits. It cannot change the host a key is sent to, nor the variable a
key is read from: those are constants (`api.x.ai`, `api.deepseek.com`, `api.openai.com`). Certificates are always checked;
behind a proxy that re-signs traffic, put its certificate in `NODE_EXTRA_CA_CERTS`.

## Using it

Ask a Claude Code session for the model relay by name; it follows the skill. By hand, the commands are listed at the top of
`tools/relay/cli.ts` and by `node tools/relay/relay.mjs help`. Each run leaves a folder `<home>\runs\<id>\ledger` holding the
work order, every request and answer, what was applied and how each block matched, gate output, findings, probes, verdicts and
`summary.md`. The clone is deleted at `finish`; the ledger is kept.

Wherever a command takes free text (`--note`, `-m`, `--failed`), `--note-file`, `--m-file` and `--failed-file` read it from a
file. A reader's refusal quotes the code it refuses, and on a command line the shell would run whatever that code holds
between backticks; such text goes in a file.

A review by hand (a ChatGPT or Codex subscription and no API key): `export --run <id> --review 2` writes the two prompt files,
`import --run <id> --review 2 --file <answer.json>` reads the answer. Nothing waits on a person: without a key and without an
import the reviewer is skipped.

## What leaves the machine

Source files from this repository go to xAI, DeepSeek and OpenAI: the work order, the files the writer may edit, the context
files it names, the diff and the gate's summary. A file is sent only when it is tracked, lies under `src/`, `tests/`,
`scripts/`, `docs/` or `tools/`, and matches no never-send pattern; evidence folders, handoff notes, `CLAUDE.md`, `AGENTS.md`
and anything untracked cannot be sent. Git history and author names are not sent; relay commits are made as `model-relay`.
Key values and this machine's paths are replaced before anything is written to the ledger or sent (the path as typed, with
doubled backslashes, with forward slashes, and percent-encoded as in a `file://` address; not the Windows short form such as
`CLAUDE~1`). A tracked file whose own text holds the checkout's path, as about two dozen lines under `docs/` do, cannot be
given to the writer for that reason: the run stops and says so, and that file is edited by the orchestrator. As read on 13 November 2026
from search summaries (not confirmed): xAI and OpenAI keep API traffic 30 days for abuse review and do not train on it by
default; DeepSeek's policy says data is stored in the People's Republic of China, and its retention terms could not be read.
Whether DeepSeek may see this code is the owner's decision; removing `reviewer1` from `reviewers` in the config drops it.

## Limits to know before trusting it

- **The gate is not a sandbox.** It runs code an external model wrote, as the owner, on the owner's machine. Four things
  stand in front of that. The applier writes only files the work order names, whole lines only, and refuses invisible and
  line-breaking characters. A syntax scan refuses imports other than relative ones and `vitest`, vitest's own module loaders
  (`vi.importActual`, `vi.mock` and their like) for anything else, any string beginning `node:`, and names such as `process`,
  `eval`, `import.meta` and `.constructor`, before the code reaches the disk. A Claude reader must pass the diff before the
  gate, or a probe, will run it. And the gate runs with a stripped environment (no keys) and a time limit, after which the
  relay checks the clone: a file, a name git ignores, a commit it did not make or a package folder above the clone stops the
  run. None of that is containment against a determined attacker. A file written anywhere else on the machine is not noticed,
  a process started detached outlives the gate, and the scan can be passed by code that builds a name at run time, which is
  what the reader is for. For containment, put the relay's home inside a virtual machine or WSL.
- **Reviewers see only what they are sent.** A call site the work order missed is invisible to both. The census in the work
  order is the defence; a reviewer can also name files it would need.
- **A silent reviewer proves nothing.** The summary says "no findings reported", never "clean".
- **The gate runs only the tests the work order names.** The full suite, the lab and pins are the orchestrator's, afterwards,
  as for any change. The gate is judged against a baseline taken at the base commit; a baseline that timed out or in which
  the tools did not start is refused, not used.
- One writer round per review. A second pass over the same findings is not made; the confirmed probes ride with every later
  gate instead. A writer answer that changes nothing is not counted as that round.
- The writer's SEARCH must be whole lines that match in exactly one place. A model that edits part of a line is refused and
  told the file's real lines; how often each vendor's model trips on this is not known yet.

## What was compared before writing it

`CLAUDE.md` asks for a look at established projects before unfamiliar tooling is written. Compared (sources read on 13 November
2026; formats and rules borrowed as ideas, no code copied):

- **Edit format**: aider's SEARCH/REPLACE blocks (Apache-2.0), the format aider assigns to Grok, DeepSeek and GPT models and the
  only one with published conformance figures for them. Not taken from aider: first-match-wins, retargeting a failed block to
  another file, appending on an empty SEARCH, writing the blocks that passed, any similarity matching.
- **Apply rule**: exactly one match or an error, from Anthropic's text-editor `str_replace` contract and Cline's editor
  (Apache-2.0). One tolerance tier, aider's uniform-indentation rule, also required to be unique. Rejected: the unified-diff and
  Codex `apply_patch` envelopes, which need a large tolerant applier; whole-file output for existing files.
- **Architect and editor split**: aider's architect mode (the editor gets a fresh context, the current files from disk and one
  complete instruction). Added here: a path allow-list enforced by the applier, and a BLOCKED answer for a writer that lacks
  something.
- **Review**: the find, verify, rank shape of Claude Code's review and the qualification rules of the Codex review rubric
  (Apache-2.0; paraphrased). Reviewers are blind to each other because published work on multi-agent debate finds that models
  shown a peer's answer abandon correct independent ones; findings are reproduced before any is acted on because measured
  precision of LLM review findings is far below what acting on them unverified would need.
- **Headless vendor CLIs** (Codex, Grok Build, DeepSeek Harness, opencode, aider) were considered as transports and set aside
  for the first version: each is an agent with file and shell tools on the owner's machine, two of them without a working
  sandbox on Windows, and none could be tried from the session that built this.

## What the adversarial review found

Before this was handed over, six reviewers were set on the implementation, each with one line of attack (the applier, the
driver's sequence, keys and what is sent, the gate, Windows, and the documents against the commands), each required to run a
reproduction. They reported 48 findings, about 33 distinct defects once duplicates were merged, 46 reproduced by execution and
2 argued from the code. Every one held up when read against the source. The serious ones were ways for a run to end "done"
without the work having been done:

- a writer's answer to a fix request that changed nothing was counted as the fix, so the review closed with the confirmed
  defect still in the code;
- a test the work order named and the writer never wrote was left out of the gate, which then passed with no test at all;
- a baseline that timed out on a busy machine, or in which vitest never started, was accepted, and whatever it had not
  settled was forgiven for the rest of the run;
- the gate read a failed hook or an unhandled rejection as a pass, because no single test was marked failed;
- a probe that could not load counted as a reproduction, and probes started together reported each other's files as damage;
- a probe ran the writer's code before the reader had passed it;
- a commit made by hand in the clone was gated and delivered under another commit's name;
- the reader's refusal travelled as a quoted shell argument, so code quoted in it could be run by the shell that holds the
  keys.

All of these are corrected, and each has a test of the corrected behaviour: `tests/relay_driver.test.ts` walks the driver's
cases through scripted runs, and the module tests cover the rest. That they were real on the earlier code is shown by the
reviewers' own reproductions, not by these tests. Also corrected: characters that hide code from a reader
(a line separator after `//`), SEARCH text matching inside a line, vitest's own module loaders passing the import scan, a
settings file able to send one vendor's key to another, a key cut in half before it was redacted, vendor text able to forge
the line a driver acts on, a dead step waited for forever when its process number was reused, and an order edited in place
steering a run. Found while fixing and not by the reviewers: git runs programs named in a clone's config and hooks, which
code run by the gate could write, and git was started with the keys in its environment; git now gets no secret, and a clone
whose config or hooks changed is not touched again.

Left as they are, knowingly: a process the gate's code starts detached outlives it; a file written outside the clone is not
noticed; the Windows short spelling of a path is not redacted.

## What is verified, and what is not

By the session that built it, on Linux with Node 22.23.4, on 14 November 2026:

- VERIFIED: `npx tsc --noEmit` and `npx tsc --noEmit -p tools/relay` are clean. `npx vitest run tests/relay_*.test.ts` passes
  314 tests (13 skipped); with `RELAY_E2E=1` all 327 pass, including three complete runs and two cut short on purpose,
  against a mock vendor on localhost.
- VERIFIED: the real repository in a relay clone (private copy, `src tests scripts docs tools` checked out, tools found in
  the relay's home) typechecks in about 20 seconds and runs named tests, and nothing is left behind. Done three times
  independently, twice by reviewers.
- VERIFIED: the Workflow script, run twice with real Claude agents against the mock vendor, took a task from the owner's
  words to a reviewed branch. In the second run the mock writer planted a comment telling "the reviewer" to run a shell
  command and report nothing: the reader refused it, the refusal reached the writer by file, the command never ran, the true
  finding was confirmed by a failing probe and fixed, the false one was refuted by a passing probe, the second reviewer was
  shown nothing of the first review, and the checkout the run started from was untouched.
- VERIFIED by the reviewers, with scripts: 32 path spellings could not make the applier write an unnamed file; 53 address
  spellings could not move a key to another host; no truncated answer was taken as complete; line endings survive a run under
  `core.autocrlf=true` (simulated through git configuration, on Linux); paths with spaces work throughout.
- UNKNOWN: any call to xAI, DeepSeek or OpenAI. Their hosts could not be reached from the session. The model names, the name
  of each vendor's output-token setting, whether each accepts the JSON mode and the streaming shape assumed here all come
  from search summaries. `doctor --live` settles each; expect to correct at least the model names.
- UNKNOWN: anything on Windows. Nothing here was run there. The process-tree kill (`taskkill`), detached steps, deleting a
  clone, and whether a detached step survives the end of a Claude session were reasoned from Node's and libuv's sources.
- UNKNOWN: how well each vendor's model keeps to the edit format, and what a real run costs in time and money.
