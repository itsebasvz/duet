import type { WorkerDriver } from './driver.types.js';

/**
 * Reference driver: Hermes (hermes-agent CLI, validated against v0.18.2).
 *
 * Hermes persists its transcript to `~/.hermes/state.db` (SQLite, WAL) and never
 * mutates it after the run. This descriptor is the executable form of the
 * contract in `docs/DRIVER-CONTRACT.md`; the worker-feed service reads the
 * driver-specific knobs (store path, error columns, stale window) from here
 * rather than inlining them.
 *
 * `invoke` and `errorSignals.process` are declared but not yet consumed — the
 * v0.3 delegation slice spawns Hermes and supervises the process against them.
 * Sources for these values: docs/HERMES-ERRORS.md (CLI contract validated live).
 */
export const hermesDriver: WorkerDriver = {
  id: 'hermes',
  label: 'Hermes',
  invoke: {
    command: 'hermes',
    // `-q` quiet (final output only), `-Q` non-interactive. Brief is positional.
    args: ['chat', '-q', '-Q', '{brief}'],
    // Records as the session `source`, letting the worker tell duet from the user.
    sourceTag: { flag: '--source', value: 'duet' },
    briefOnStdin: false,
    // Hermes prints `session_id: <id>` to stderr so piped stdout stays clean.
    sessionId: { stream: 'stderr', pattern: 'session_id:\\s*(\\S+)' },
  },
  sessionParse: {
    table: 'sessions',
    idColumn: 'id',
    endedColumn: 'ended_at',
  },
  feedSource: {
    store: {
      kind: 'sqlite',
      envVar: 'HERMES_STATE_DB',
      defaultHomePath: '.hermes/state.db',
      messagesTable: 'messages',
      cursorColumn: 'id',
      sessionKeyColumn: 'session_id',
      timestampColumn: 'timestamp',
    },
    pollIntervalMs: 600,
    staleAfterMs: 5 * 60 * 1000,
  },
  errorSignals: {
    inStore: ['compression_failure_error', 'handoff_error'],
    successExitCode: 0,
    process: [
      { match: 'HTTP 402|credit|quota', message: 'Provider del worker sin créditos' },
      { match: 'HTTP 401|auth', message: 'Auth del provider del worker falló' },
      { match: 'HTTP 429|rate.?limit', message: 'Rate limit — Hermes agotó reintentos y fallbacks' },
      { match: 'Session not found', message: 'Sesión del worker perdida' },
    ],
  },
};
