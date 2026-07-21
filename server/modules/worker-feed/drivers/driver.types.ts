/**
 * Worker driver contract.
 *
 * A driver describes ONE worker CLI (Hermes today; Codex / OpenCode / OpenClaw
 * later) declaratively, so duet can observe it — and, from v0.3, invoke it —
 * without hard-coding the CLI's internals across the codebase. The canonical,
 * human-facing form of this contract is YAML (see `docs/DRIVER-CONTRACT.md`);
 * the descriptors in this folder are its executable TypeScript form.
 *
 * Four sections, mirroring the roadmap:
 *   - invoke:        how duet spawns the worker           (consumed in v0.3)
 *   - sessionParse:  how a stored session row → summary   (consumed now)
 *   - feedSource:    where live messages are read from    (consumed now)
 *   - errorSignals:  how failure surfaces                 (in-store now, process v0.3)
 */

/** Sub-second polling of a SQLite store, tailed by an autoincrement key. */
export type SqliteFeedStore = {
  kind: 'sqlite';
  /** Env var that overrides the store path (e.g. HERMES_STATE_DB). */
  envVar: string;
  /** Default path when the env var is unset, relative to the user's home. */
  defaultHomePath: string;
  /** Table holding the message transcript. */
  messagesTable: string;
  /** Monotonic column tailed to find new rows (autoincrement id). */
  cursorColumn: string;
  /** Foreign key on the messages table pointing back at the session. */
  sessionKeyColumn: string;
  /** Message timestamp column (epoch seconds), used for liveness. */
  timestampColumn: string;
};

export type FeedSource = {
  store: SqliteFeedStore;
  /** How often to poll for new transcript rows. */
  pollIntervalMs: number;
  /**
   * An open session (no end recorded) with no new message within this window is
   * treated as `stalled`, not `working`. Needed because some workers never
   * write an end marker when their process is killed or crashes.
   */
  staleAfterMs: number;
};

export type SessionParse = {
  /** Table holding one row per worker session. */
  table: string;
  /** Primary-key column identifying a session. */
  idColumn: string;
  /** Column set when a session ends cleanly (NULL while open). */
  endedColumn: string;
};

/** A stream + capturing regex that yields the spawned session's id. */
export type StreamCapture = {
  stream: 'stdout' | 'stderr';
  /** Regex source with one capture group. Hermes prints `session_id: <id>`. */
  pattern: string;
};

/**
 * How duet launches the worker. Declared now so the v0.3 invoker builds against
 * a fixed contract; nothing consumes this section yet.
 */
export type InvokeSpec = {
  /** Executable to spawn (looked up on PATH). */
  command: string;
  /**
   * Argument template. `{brief}` is replaced with the delegation prompt. Passed
   * as a fixed array — never a shell string — so briefs cannot inject arguments.
   */
  args: string[];
  /**
   * Flag/value pair that tags the run as coming from duet's orchestrator, so
   * the worker can tell Claude apart from the user (v0.3 identity protocol).
   */
  sourceTag: { flag: string; value: string };
  /** Whether the brief is delivered on stdin instead of via {brief} in args. */
  briefOnStdin: boolean;
  /** Where the spawned session id is emitted, so duet can tail its feed. */
  sessionId: StreamCapture;
};

/**
 * A terminal error the worker only surfaces on its process (not in the store):
 * a regex over stdout maps to a user-facing message. Consumed by the v0.3
 * process supervisor.
 */
export type ProcessErrorRule = {
  /** Regex source matched (case-insensitive) against stdout. */
  match: string;
  /** Plain-language explanation shown to the user. */
  message: string;
};

/**
 * How failure surfaces. Split because provider errors (credits/auth/rate-limit)
 * NEVER reach the store — only the process (exit code + stdout) reveals them.
 * See docs/HERMES-ERRORS.md.
 */
export type ErrorSignals = {
  /**
   * Session columns that, when non-null/non-empty, mean an in-store failure
   * (compression/handoff for Hermes). Read generically to derive `error`.
   */
  inStore: string[];
  /** Exit code that means success; any other non-zero exit is a failed run. */
  successExitCode: number;
  /** stdout patterns → user-facing error messages (process supervision, v0.3). */
  process: ProcessErrorRule[];
};

export type WorkerDriver = {
  /** Stable driver id (matches the descriptor filename). */
  id: string;
  /** Human label for the UI. */
  label: string;
  invoke: InvokeSpec;
  sessionParse: SessionParse;
  feedSource: FeedSource;
  errorSignals: ErrorSignals;
};
