/**
 * §3.3: "One job at a time per runner. A second runner instance refuses to
 * start if a lock file is held." An `O_EXCL` create is the whole mechanism —
 * atomic on every OS this might run on, no separate check-then-write race.
 * Lives outside `agent/sandbox/` (which must stay empty for the spawned
 * session) and outside git (added to `agent/.gitignore`).
 */

import { openSync, closeSync, unlinkSync, writeSync, existsSync, readFileSync } from 'node:fs'

export class RunnerAlreadyRunningError extends Error {
  constructor(readonly holderPid: string) {
    super(`Another runner instance holds the lock (pid ${holderPid}). Only one runner runs at a time (§3.3).`)
  }
}

export interface RunnerLock {
  release(): void
}

/** Throws `RunnerAlreadyRunningError` when the lock is already held. Never silently steals it — a stale lock from a crashed process is a human's call, not this function's. */
export function acquireLock(lockPath: string): RunnerLock {
  try {
    const fd = openSync(lockPath, 'wx') // 'wx': create, fail if it exists — the one atomic step
    writeSync(fd, String(process.pid))
    closeSync(fd)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      const holderPid = existsSync(lockPath) ? readFileSync(lockPath, 'utf8').trim() : 'unknown'
      throw new RunnerAlreadyRunningError(holderPid)
    }
    throw error
  }

  let released = false
  return {
    release: () => {
      if (released) return
      released = true
      try {
        unlinkSync(lockPath)
      } catch {
        /* already gone — nothing left to release */
      }
    },
  }
}
