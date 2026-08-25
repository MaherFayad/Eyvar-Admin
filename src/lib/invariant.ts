/**
 * Fail loudly instead of rendering a lie.
 *
 * The shared layer's failure mode is silence: a money value arrives as a float,
 * a date arrives unparseable, a translation key is missing, and the screen
 * renders `NaN SAR` or `Invalid Date` three components away from the cause.
 * Every helper in `src/lib` that can be handed the wrong shape says so here.
 */
export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new TypeError(message)
}

/**
 * True in dev and under Vitest, false in a production build.
 *
 * Read defensively for the same reason `src/data/config.ts` does: this module
 * must load under Vite, under Vitest and under a bare Node script.
 */
export function isDevEnvironment(): boolean {
  try {
    const env = (import.meta as unknown as { env?: { DEV?: boolean; MODE?: string } }).env
    if (env && typeof env.DEV === 'boolean') return env.DEV
  } catch {
    /* no import.meta.env in this module graph */
  }
  return true
}
