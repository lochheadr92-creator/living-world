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

One line per block (Windows PowerShell 5.1). Keys are read from the environment and never written anywhere. Set them once as
user environment variables (Windows Settings, "Edit environment variables for your account": `XAI_API_KEY`,
`DEEPSEEK_API_KEY`, `OPENAI_API_KEY`), then open a new shell. A reviewer whose key is absent is skipped and the summary says so.

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
`stream`, `tokenParam`, `jsonMode`; the clocks and limits. It cannot change the host a key is sent to: those are constants
(`api.x.ai`, `api.deepseek.com`, `api.openai.com`).

## Using it

Ask a Claude Code session for the model relay by name; it follows the skill. By hand, the commands are listed at the top of
`tools/relay/cli.ts` and by `node tools/relay/relay.mjs help`. Each run leaves a folder `<home>\runs\<id>\ledger` holding the
work order, every request and answer, what was applied and how each block matched, gate output, findings, probes, verdicts and
`summary.md`. The clone is deleted at `finish`; the ledger is kept.

A review by hand (a ChatGPT or Codex subscription and no API key): `export --run <id> --review 2` writes the two prompt files,
`import --run <id> --review 2 --file <answer.json>` reads the answer. Nothing waits on a person: without a key and without an
import the reviewer is skipped.

## What leaves the machine

Source files from this repository go to xAI, DeepSeek and OpenAI: the work order, the files the writer may edit, the context
files it names, the diff and the gate's summary. A file is sent only when it is tracked, lies under `src/`, `tests/`,
`scripts/`, `docs/` or `tools/`, and matches no never-send pattern; evidence folders, handoff notes, `CLAUDE.md`, `AGENTS.md`
and anything untracked cannot be sent. Git history and author names are not sent; relay commits are made as `model-relay`.
Key values and this machine's paths are replaced before anything is written to the ledger or sent. As read on 13 November 2026
from search summaries (not confirmed): xAI and OpenAI keep API traffic 30 days for abuse review and do not train on it by
default; DeepSeek's policy says data is stored in the People's Republic of China, and its retention terms could not be read.
Whether DeepSeek may see this code is the owner's decision; removing `reviewer1` from `reviewers` in the config drops it.

## Limits to know before trusting it

- **The gate is not a sandbox.** It runs code an external model wrote, as the owner, on the owner's machine. Three things
  stand in front of that: the applier writes only files the work order names; a syntax scan refuses imports other than
  relative ones and `vitest`, and names such as `process`, `eval`, `import.meta` and `.constructor`, before the code reaches
  the disk; and a Claude reader must pass the diff before the gate will run. The gate runs with a stripped environment (no
  keys) and a time limit, and anything it leaves in the clone stops the run. None of that is containment against a determined
  attacker. For that, put the relay's home inside a virtual machine or WSL.
- **Reviewers see only what they are sent.** A call site the work order missed is invisible to both. The census in the work
  order is the defence; a reviewer can also name files it would need.
- **A silent reviewer proves nothing.** The summary says "no findings reported", never "clean".
- **The gate runs only the tests the work order names.** The full suite, the lab and pins are the orchestrator's, afterwards,
  as for any change.
- One writer round per review. A second pass over the same findings is not made; the confirmed probes ride with every later
  gate instead.

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

## What is verified, and what is not

Filled in by the session that built it; see the section at the end of this file.
