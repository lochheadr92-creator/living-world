// The model relay's contract: every type shared between its modules. The relay is an opt-in tool (docs/MODEL_RELAY.md): Claude
// designs and adjudicates, an external model writes code, two more review it. Nothing here is part of the simulation, and nothing
// here is imported by src/, scripts/ or vite.config.ts. The relay lives under tools/ and not scripts/ on purpose: a running lab
// fingerprints src/ and scripts/ and rejects its results when a file there changes (scripts/observers/provenance.ts).
//
// Trust: everything an external model returns is untrusted text. A path it names is only ever compared with the paths the work
// order names; code it writes is scanned and read before anything executes it; its prose never reaches another model or an
// adjudicator as an instruction.

export type ProviderName = 'xai' | 'deepseek' | 'openai';
/** writer writes code; reviewer1 reviews first, reviewer2 second and without seeing reviewer1's findings */
export type RoleName = 'writer' | 'reviewer1' | 'reviewer2';

export interface ProviderConfig {
  /** OpenAI-compatible base, without the /chat/completions path. Its host must be the provider's pinned host, or localhost. */
  baseUrl: string;
  /** name of the environment variable that holds the key; the value is never written anywhere */
  keyEnv: string;
  /** the vendor's name for the output cap */
  tokenParam: 'max_tokens' | 'max_completion_tokens';
  /** how a JSON answer is asked for when a request wants one; the answer is validated locally either way */
  jsonMode: 'json_object' | 'none';
  stream: boolean;
  /** send stream_options.include_usage with a streamed request */
  streamUsage: boolean;
  /** a streamed answer counts as complete only when the [DONE] line was seen */
  requireDone: boolean;
  /** GET path under baseUrl that lists models */
  modelsPath: string;
}

export interface RoleConfig {
  provider: ProviderName;
  model: string;
  maxOutputTokens: number;
  /** a pack estimated above this is refused, never truncated */
  maxInputTokens: number;
  /** the vendor's price step: a pack above this is sent with a warning in the ledger */
  warnInputTokens: number;
  /** merged into the request body last, for vendor options the owner has confirmed (for example reasoning_effort) */
  extraBody: Record<string, unknown>;
}

/** four clocks kept with our own timers; an expiry names the clock that fired */
export interface Clocks {
  connectMs: number;
  firstByteMs: number;
  /** longest silence between two chunks of a response body; comment lines and reasoning deltas count as activity */
  idleMs: number;
  totalMs: number;
}

export interface Limits {
  /** repair turns after the writer's first answer when a block is malformed or does not match */
  repairTurns: number;
  /** writer rounds spent on a failing gate before the orchestrator is asked */
  gateFixRounds: number;
  /** writer rounds per reviewer on confirmed findings */
  reviewFixRounds: number;
  /** findings kept per review; the rest are counted and dropped */
  maxFindings: number;
  gateTimeoutMs: number;
  probeTimeoutMs: number;
  gateMaxWorkers: number;
  /** attempts per call, the first included */
  attempts: number;
  backoffMs: number[];
}

export interface RelayConfig {
  providers: Record<ProviderName, ProviderConfig>;
  roles: Record<RoleName, RoleConfig>;
  /** review order; a reviewer whose key is absent is skipped and the summary says so */
  reviewers: RoleName[];
  clocks: Clocks;
  limits: Limits;
  /** directories checked out in a run's clone (git sparse-checkout, cone mode); root files always come with them */
  sparse: string[];
  /** globs no work order can open for writing, matched on the lower-cased canonical path */
  deny: string[];
  /** globs an `edit` entry may match only when the work order also lists that exact path under unlockGuarded */
  guarded: string[];
  /** a file is sent to a vendor or edited only when it is tracked and under one of these prefixes */
  roots: string[];
  /** globs never sent to a vendor even under a root */
  neverSend: string[];
  /** regular expressions for retired model names; doctor warns on a match */
  staleModels: string[];
}

/** What the architect hands the writer. Registered once per run and frozen by its hash; a change is a recorded amendment. */
export interface WorkOrder {
  title: string;
  /** ^[a-z0-9-]{1,40}$ */
  slug: string;
  /** the complete instruction, markdown; the writer relies on nothing else, and reviewers judge the change against it */
  spec: string;
  /** existing files the writer may edit; each is sent whole */
  edit: string[];
  /** files the writer may create; each must not exist */
  create: string[];
  /** read-only files for the writer and reviewers: 'path' or 'path#L10-L80' */
  context: string[];
  /** files the orchestrator edits itself in the clone (for example src/sim/rulesversion.ts); reviewers get their hunks only */
  orchestrator: string[];
  /** vitest files the gate runs */
  tests: string[];
  typecheck: boolean;
  /** guarded paths this order opens, by exact name */
  unlockGuarded: string[];
  /** per written file, import specifiers and global names the pre-gate scan allows beyond relative imports and 'vitest' */
  allowImports: Record<string, string[]>;
  /** the commands that list every call site of the thing being changed, with their output; sent to writer and reviewers */
  census?: string;
  /** the rules version this change belongs to, when it has one */
  rulesVersion?: number;
}

// ---- edits (edits.ts) ----

export interface EditBlock {
  /** the path as the model wrote it, after backslashes were turned into slashes */
  path: string;
  search: string;
  replace: string;
  /** 1-based position in the reply */
  index: number;
}

export type ParseResult =
  | {
      ok: true;
      blocks: EditBlock[];
      /** the text after the last block, without the END-OF-EDITS line */
      notes: string;
      /** set when the reply holds no blocks and its notes begin with BLOCKED: */
      blocked: string | null;
    }
  | { ok: false; error: string };

export interface FilePolicy {
  /** work-order paths the writer may edit or create, keyed by lower-cased canonical path, value the work order's spelling */
  edit: Map<string, string>;
  create: Map<string, string>;
  /** lower-cased paths of test files frozen at the first green gate and not unlocked for this round */
  locked: Set<string>;
}

export interface FileStore {
  /** the file's text decoded as UTF-8 with any BOM kept as U+FEFF, or null when it does not exist */
  read(path: string): string | null;
}

export interface PlannedFile {
  /** the work order's spelling */
  path: string;
  created: boolean;
  /** null for a created file */
  before: string | null;
  after: string;
  /** per block applied to this file: 0 exact, 1 uniform-indentation */
  tiers: number[];
}

export interface BlockFailure {
  index: number;
  path: string;
  reason:
    | 'path_not_allowed'
    | 'file_missing'
    | 'file_exists'
    | 'no_match'
    | 'many_matches'
    | 'overlap'
    | 'mixed_line_endings'
    | 'marker_in_file'
    | 'forbidden_characters'
    | 'locked_test'
    | 'empty_search_on_edit';
  detail: string;
}

export type PlanResult = { ok: true; files: PlannedFile[] } | { ok: false; failures: BlockFailure[]; repairMessage: string };

// ---- provider (provider.ts) ----

export interface ChatRequest {
  role: RoleName;
  system: string;
  user: string;
  /** ask for a JSON object */
  json: boolean;
}

export interface ChatReply {
  text: string;
  /** the model name the vendor echoed; vendors reroute retired names silently, so this is what actually ran */
  model: string;
  finish: string;
  usage?: { input: number; output: number };
  attempts: number;
  ms: number;
  status: number;
}

export type ProviderErrorKind =
  | 'config'
  | 'no_key'
  | 'auth'
  | 'bad_request'
  | 'not_found'
  | 'quota'
  | 'rate_limit'
  | 'server'
  | 'network'
  | 'clock'
  | 'truncated'
  | 'blank';

// ---- findings (findings.ts) ----

export type Severity = 'P0' | 'P1' | 'P2';

export interface Finding {
  /** assigned by the relay (R1-F01); a reviewer's own id is discarded */
  id: string;
  severity: Severity;
  file: string;
  startLine: number;
  endLine: number;
  title: string;
  mechanism: string;
  /** the inputs or state that trigger it and the wrong result that follows */
  trigger: string;
  /** the offending code, verbatim from the pack */
  quote: string;
  /** which way a fix lies; never a patch */
  direction: string;
  /** mechanical triage; it informs the adjudicator and never replaces a reproduction */
  flags: { fileExists: boolean; quoteFound: boolean; inDiff: boolean };
}

export type VerdictKind = 'confirmed' | 'refuted' | 'not_reproduced' | 'out_of_scope' | 'unadjudicated';

/** The adjudicator's answer to one finding. Written by Claude, never by a reviewer. */
export interface Verdict {
  id: string;
  verdict: VerdictKind;
  /** the adjudicator's own grade after reproduction; a finding that needs staged or malformed input is at most P2 */
  severity?: Severity;
  /** fix: back to the writer now; owner: recorded for the owner to decide; drop: recorded only */
  action: 'fix' | 'owner' | 'drop';
  /** what was run and what was observed */
  evidence: string;
  /** the adjudicator's instruction to the writer; the only finding text the writer ever sees */
  fixInstruction?: string;
  /** locked test files the writer may change in this fix round */
  unlockTests?: string[];
}

// ---- scan (scan.ts) ----

export interface ScanIssue {
  path: string;
  line: number;
  what: string;
}

// ---- gate (gate.ts) ----

export interface TestOutcome {
  /** file, then the test's full name */
  id: string;
  file: string;
  state: 'pass' | 'fail' | 'timeout' | 'skipped';
  message: string;
}

export interface GateResult {
  typecheck: 'pass' | 'fail' | 'skipped' | 'timeout';
  typecheckOutput: string;
  tests: TestOutcome[];
  /** the wall-clock limit ended the run and the process tree was killed */
  timedOut: boolean;
  ms: number;
}

/** A gate judged against the baseline taken at the base commit: only what the change broke counts. */
export interface GateVerdict {
  ok: boolean;
  /** type errors when the base typechecked clean */
  typecheckBroken: boolean;
  newFailures: TestOutcome[];
  /** failed only by timing out, twice; never sent to the writer and never counted as a reproduction */
  inconclusive: TestOutcome[];
  /** failing at base as well; reported, not held against the change */
  alreadyFailing: string[];
}

// ---- run state (ledger.ts) ----

export interface ReviewRecord {
  /** 1-based position in config.reviewers */
  n: number;
  role: RoleName;
  status: 'done' | 'skipped';
  reason?: string;
  /** the commit that was reviewed */
  sha?: string;
  findings: number;
  dropped: number;
  /** verdicts registered for this review */
  adjudicated: boolean;
  fixRounds: number;
  /** the fix round's commit passed the gate and every confirmed probe */
  settled: boolean;
}

export interface StepRecord {
  key: string;
  kind: 'baseline' | 'write' | 'gate' | 'review' | 'probe';
  pid: number;
  startedAt: string;
}

export interface RunState {
  id: string;
  slug: string;
  /** absolute path of the checkout the run was started from; the relay reads it and never writes its working tree */
  shared: string;
  base: string;
  branch: string;
  createdAt: string;
  orderHash?: string;
  amendments: number;
  baselineDone: boolean;
  /** the last commit the relay made in the clone */
  head: string;
  writes: number;
  orchestratorDone: boolean;
  /** the commit a Claude reader passed before anything executed it */
  screenedSha?: string;
  gate?: { sha: string; ok: boolean; file: string };
  gateFixRounds: number;
  /** test files the writer wrote, hashed at the first green gate (path -> sha256) */
  lockedTests: Record<string, string>;
  firstGreenSha?: string;
  reviews: ReviewRecord[];
  /** locked test files the writer may change until the review being fixed is settled */
  unlocked: string[];
  /** the Claude reader refused this commit; its note goes to the writer as feedback */
  screenReject?: { sha: string; note: string };
  /** a step ended in a way only the orchestrator can resolve; cleared by amending the order or by `retry` */
  stuck?: { why: string; /** relative to the ledger */ detailFile: string };
  /** steps started so far, for unique step keys */
  steps: number;
  step?: StepRecord;
  finished?: { at: string; outcome: 'done' | 'failed'; note: string };
}

/** What `advance` prints: either it is still working, or a judgement only Claude can give is needed, or the run is over. */
export type Advance =
  | { status: 'running'; step: string }
  | { status: 'needs'; needs: 'order'; clone: string }
  | { status: 'needs'; needs: 'orchestrator-edits'; paths: string[]; clone: string }
  | { status: 'needs'; needs: 'screen'; sha: string; diffFile: string }
  | { status: 'needs'; needs: 'adjudicate'; review: number; findingsFile: string; ids: string[]; priorVerdicts: string[] }
  | { status: 'needs'; needs: 'stuck'; why: string; detailFile: string }
  | { status: 'needs'; needs: 'finish' }
  | { status: 'finished'; outcome: 'done' | 'failed' }
  | { status: 'error'; error: string };
