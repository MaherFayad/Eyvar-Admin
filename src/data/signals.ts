/**
 * Domain signals the onboarding checklist listens for (spec §8.9 `autoSignal`,
 * AC-612). A client emits one after a mutation succeeds, in both the mock and
 * the http build, so a step can complete itself when the operator does the real
 * task. In-process only: nothing here is persisted or sent anywhere.
 */

export type OnboardingSignal = 'queue.item.claimed' | 'queue.item.disposed' | 'application.decided'

type Listener = (signal: OnboardingSignal) => void

const listeners = new Set<Listener>()

export function emitOnboardingSignal(signal: OnboardingSignal): void {
  for (const listener of listeners) listener(signal)
}

/** Subscribe; returns the unsubscribe. */
export function onOnboardingSignal(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Awaits a mutation, emits `signal` once it resolves, and passes the result through. */
export async function signalled<T>(signal: OnboardingSignal, mutation: Promise<T>): Promise<T> {
  const result = await mutation
  emitOnboardingSignal(signal)
  return result
}
