/**
 * The conversation console's public surface.
 *
 * **`copy.ts` is deliberately NOT re-exported here.** It imports one type and
 * nothing else; a barrel that also exports the screen would drag `ShellContext`
 * — which imports the dictionary — into a cycle. That is `screens/queues`'s own
 * note and it is the same hazard.
 */

export { ConversationConsoleScreen } from './ConversationConsoleScreen'
export { ConversationPane } from './ConversationPane'
export { MessageComposer } from './MessageComposer'
export { clearDraft, readDraft, resetDrafts, writeDraft } from './drafts'
export { PresenceBar } from './PresenceBar'
export {
  AUTO_AWAY_MINUTES,
  CONCURRENT_CHAT_CAP_DEFAULT,
  CONCURRENT_CHAT_CAP_MAX,
  CONCURRENT_CHAT_CAP_MIN,
  capAppliesTo,
  useAutoAway,
  usePresence,
  type PresenceModel,
} from './presence'
export {
  compareForQueue,
  conversationSla,
  runningClock,
  type ConversationSla,
  type ConversationSlaSource,
} from './sla'
export {
  CHANNEL_KEY,
  CLOSE_REASONS,
  CLOSE_REASON_KEY,
  STATUS_KEY,
  STATUS_TONE,
} from './vocabulary'
