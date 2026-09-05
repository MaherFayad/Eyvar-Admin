/**
 * **The composer draft store — §8.6.9, and D16's fourth class that is not one.**
 *
 * > *"Unsent text is held per conversation, in memory, for the life of the
 * > session, and is not persisted. Returning to a conversation restores what was
 * > typed; a reload discards it; nothing anywhere indicates that a draft
 * > exists."*
 *
 * D16 names three persistence classes and a composer draft is none of them: it
 * is **not URL-expressible** (a half-typed sentence in the address bar is a
 * paste hazard and a link that carries somebody else's words), **not a
 * preference** (it is about one record, not about the operator), and **not a
 * named artefact** (nobody saved it). §8.6.9 takes the least-costly-to-reverse
 * default and raises **F-5** rather than inventing a fourth class.
 *
 * So this is a module-scoped `Map` and it is deliberately the dumbest possible
 * thing:
 *
 *   - **not `localStorage`, not `sessionStorage`, not `UiStateStore`.** A draft
 *     that survives a reload is a draft the operator has forgotten they wrote,
 *     and the first thing they will do with it is send it into a conversation
 *     that has moved on.
 *   - **no indicator anywhere.** §8.6.9 is explicit. A dot on a queue row saying
 *     "you have an unsent draft here" is a promise this store cannot keep.
 *   - **keyed by conversation AND register**, because `Reply` and `Internal
 *     note` are two different messages to two different audiences and merging
 *     them is how a note reaches a customer.
 *
 * `src/hooks/` has a single owner and `11-conversation-composer.md` §11 already
 * asks utilities-engineer for a shared session-scoped draft store. This is the
 * screen-local one until that exists; it is eleven lines and it moves whole.
 */

import type { MessageVisibility } from '@/data/types'

const drafts = new Map<string, string>()

function key(conversationId: string, register: MessageVisibility): string {
  return `${conversationId}:${register}`
}

export function readDraft(conversationId: string, register: MessageVisibility): string {
  return drafts.get(key(conversationId, register)) ?? ''
}

/** An empty draft is **deleted**, not stored as `''` — the map holds only real text. */
export function writeDraft(
  conversationId: string,
  register: MessageVisibility,
  body: string,
): void {
  const id = key(conversationId, register)
  if (body === '') drafts.delete(id)
  else drafts.set(id, body)
}

export function clearDraft(conversationId: string, register: MessageVisibility): void {
  drafts.delete(key(conversationId, register))
}

/** For tests and for `resetDataLayer`-shaped teardown. Never called by a screen. */
export function resetDrafts(): void {
  drafts.clear()
}
