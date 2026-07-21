import { spawn } from 'node:child_process';

import { hermesDriver } from './drivers/hermes.driver.js';
import type { WorkerDriver } from './drivers/driver.types.js';
import { findSessionIdSince } from './worker-feed.service.js';

/**
 * How often to poll state.db for the worker's freshly-created session row while
 * waiting for its id. Hermes writes the row ~2-4s after spawn; a sub-second
 * cadence surfaces it promptly so the live feed starts early.
 */
const SESSION_POLL_MS = 400;

/**
 * Spawns a worker CLI against its driver contract, supervises the process, and
 * returns its result. This is the "spawn → parse session → terminate" half of
 * delegation; the live feed is served separately by worker-feed.service (which
 * tails the worker's store by session id).
 *
 * Why process supervision and not just the store: provider errors (credits,
 * auth, rate-limit) never reach the worker store — only the exit code + stdout
 * reveal them. So the terminal status is derived here, from the process, using
 * driver.errorSignals (see docs/HERMES-ERRORS.md + DRIVER-CONTRACT.md).
 *
 * Security: the brief is passed as a single argv element (no shell), cwd comes
 * from the trusted caller, and the command/args come from the local driver
 * descriptor — there is no injection surface from the brief text.
 */

export type WorkerInvokeStatus = 'done' | 'error';

export type WorkerInvokeResult = {
  status: WorkerInvokeStatus;
  workerSessionId: string | null;
  resultText: string;
  errorMessage: string | null;
  exitCode: number | null;
};

export type WorkerInvokeInput = {
  brief: string;
  cwd: string;
  driver?: WorkerDriver;
  /**
   * Prior worker session to continue (via the driver's `resume` flag) instead of
   * starting cold — for shared context and prompt-cache hits. Ignored when the
   * driver declares no `resume` support.
   */
  resumeSessionId?: string | null;
  /** Fired once when the worker announces its session id. */
  onSessionId?: (sessionId: string) => void;
  /** Fired for each stdout chunk, for optional live surfacing. */
  onStdout?: (chunk: string) => void;
  /** Aborts the run (e.g. user cancelled the orchestrator turn). */
  signal?: AbortSignal;
};

/** Builds argv from the driver template, injecting the source tag + brief. */
function buildArgs(driver: WorkerDriver, brief: string, resumeSessionId?: string | null): string[] {
  const { args, sourceTag, briefOnStdin, resume } = driver.invoke;
  const out: string[] = [];
  let taggedSource = false;
  for (const arg of args) {
    if (arg === '{brief}') {
      // Brief first, source tag after: when the driver passes the brief as a
      // flag argument (e.g. `-q <brief>`), it must stay adjacent to its flag —
      // injecting `--source` between them makes the CLI swallow the flag value.
      if (!briefOnStdin) {
        out.push(brief);
      }
      if (!taggedSource) {
        out.push(sourceTag.flag, sourceTag.value);
        taggedSource = true;
      }
      continue;
    }
    out.push(arg);
  }
  if (!taggedSource) {
    out.push(sourceTag.flag, sourceTag.value);
  }
  if (resume && resumeSessionId) {
    out.push(resume.flag, resumeSessionId);
  }
  return out;
}

/** Classifies a failed run's stdout into a user-facing message. */
function classifyError(driver: WorkerDriver, stdout: string, exitCode: number | null): string {
  for (const rule of driver.errorSignals.process) {
    if (new RegExp(rule.match, 'i').test(stdout)) {
      return rule.message;
    }
  }
  const tail = stdout.trim().split('\n').slice(-3).join('\n').trim();
  return tail || `El worker terminó con código ${exitCode ?? 'desconocido'}`;
}

export function invokeWorker(input: WorkerInvokeInput): Promise<WorkerInvokeResult> {
  const driver = input.driver ?? hermesDriver;
  const args = buildArgs(driver, input.brief, input.resumeSessionId);
  const sessionIdRe = new RegExp(driver.invoke.sessionId.pattern);
  const sessionStream = driver.invoke.sessionId.stream;
  const sourceValue = driver.invoke.sourceTag.value;
  // Marker for "which session row is ours": Hermes stamps the row's started_at
  // at init, always after this moment, so we match rows at/after it.
  const spawnedAt = Date.now() / 1000;

  return new Promise<WorkerInvokeResult>((resolve) => {
    let child;
    try {
      child = spawn(driver.invoke.command, args, { cwd: input.cwd });
    } catch (error) {
      resolve({
        status: 'error',
        workerSessionId: null,
        resultText: '',
        errorMessage: error instanceof Error ? error.message : String(error),
        exitCode: null,
      });
      return;
    }

    let stdout = '';
    let stderr = '';
    let workerSessionId: string | null = null;
    let sessionPoll: ReturnType<typeof setInterval> | null = null;

    const stopSessionPoll = () => {
      if (sessionPoll) {
        clearInterval(sessionPoll);
        sessionPoll = null;
      }
    };

    // Announce the session id exactly once, from whichever source finds it first
    // (early db poll, or the end-of-run stderr line as a fallback).
    const announceSessionId = (id: string) => {
      if (workerSessionId) {
        return;
      }
      workerSessionId = id;
      stopSessionPoll();
      input.onSessionId?.(id);
    };

    const captureSessionId = (text: string) => {
      if (workerSessionId) {
        return;
      }
      const match = sessionIdRe.exec(text);
      if (match?.[1]) {
        announceSessionId(match[1]);
      }
    };

    // Get the session id early so the live feed can tail from the start. A
    // resumed run keeps its id, so announce it immediately; a cold run's id is
    // unknowable up front (random suffix), so poll state.db for the new row.
    if (input.resumeSessionId) {
      announceSessionId(input.resumeSessionId);
    } else {
      sessionPoll = setInterval(() => {
        const id = findSessionIdSince(sourceValue, spawnedAt);
        if (id) {
          announceSessionId(id);
        }
      }, SESSION_POLL_MS);
    }

    if (driver.invoke.briefOnStdin) {
      child.stdin?.write(input.brief);
      child.stdin?.end();
    }

    child.stdout?.on('data', (buf: Buffer) => {
      const chunk = buf.toString();
      stdout += chunk;
      input.onStdout?.(chunk);
      if (sessionStream === 'stdout') {
        captureSessionId(stdout);
      }
    });

    child.stderr?.on('data', (buf: Buffer) => {
      const chunk = buf.toString();
      stderr += chunk;
      if (sessionStream === 'stderr') {
        captureSessionId(stderr);
      }
    });

    const onAbort = () => child.kill('SIGINT');
    input.signal?.addEventListener('abort', onAbort, { once: true });

    child.on('error', (error: Error) => {
      stopSessionPoll();
      input.signal?.removeEventListener('abort', onAbort);
      resolve({
        status: 'error',
        workerSessionId,
        resultText: '',
        errorMessage:
          (error as NodeJS.ErrnoException).code === 'ENOENT'
            ? `Worker CLI no encontrado: ${driver.invoke.command}`
            : error.message,
        exitCode: null,
      });
    });

    child.on('close', (code: number | null) => {
      stopSessionPoll();
      input.signal?.removeEventListener('abort', onAbort);
      if (code === driver.errorSignals.successExitCode) {
        resolve({
          status: 'done',
          workerSessionId,
          resultText: stdout.trim(),
          errorMessage: null,
          exitCode: code,
        });
        return;
      }
      resolve({
        status: 'error',
        workerSessionId,
        resultText: stdout.trim(),
        errorMessage: classifyError(driver, stdout || stderr, code),
        exitCode: code,
      });
    });
  });
}
