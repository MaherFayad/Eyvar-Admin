/**
 * Support › Contact Centre — the inbox's own strings (design 12 §12). Every
 * `conversations.*`, `view.conversations.*` and `queue.*` key is reused
 * unchanged from the console and the queues; only what the three-pane shape
 * adds lives here. Sentence case, verbs on buttons, no em dash (X14, R6).
 */

import type { Dictionary } from '@/lib'

export const INBOX_EN: Dictionary = {
  /* pane A */
  'inbox.search': 'Search by name, ID or message',
  'inbox.search.clear': 'Clear search',
  'inbox.folders.label': 'Folders',
  'inbox.folders.show': 'Show folders',
  'inbox.folders.hide': 'Hide folders',
  'inbox.folders.collapsed': '{folder} · {count}',
  'inbox.list.label': 'Conversations',
  'inbox.list.end': 'That’s every conversation in this folder.',
  'inbox.row.yours': 'Yours',
  'inbox.row.select': 'Select the conversation with {name}',
  'inbox.row.age': 'Last message {age}',

  /* pane B */
  'inbox.thread.label': 'Conversation with {name}',
  'inbox.thread.noSelection': 'Select a conversation to read it.',
  'inbox.thread.today': 'Today',
  'inbox.thread.yesterday': 'Yesterday',
  'inbox.thread.you': '{name} (you)',
  'inbox.thread.sentAt': 'Sent at {time}',
  'inbox.thread.new#one': '1 new',
  'inbox.thread.new#other': '{count} new',
  'inbox.thread.new.label': 'Scroll to the newest message',
  'inbox.thread.system': '{body} · {time}',
  'inbox.header.more': 'More actions',
  'inbox.header.back': 'Back to conversations',
  'inbox.header.details': 'Details',
  'inbox.bulk.clear': 'Clear selection',

  /* the composer, AC-CC-11: six carriers, none colour alone */
  'inbox.composer.label': 'Reply to {name}',
  'inbox.composer.tab.verb': 'Reply to',
  'inbox.composer.consequence.reply': 'Sent to {name} by {channel}',
  'inbox.composer.consequence.note': 'Internal note. Not sent to the customer.',
  'inbox.composer.placeholder.reply': 'Write a reply to {name}…',
  'inbox.composer.placeholder.note': 'Write an internal note…',
  'inbox.composer.keys.reply': 'Enter sends to {name} · Shift + Enter adds a line',
  'inbox.composer.keys.note': 'Enter adds an internal note · Shift + Enter adds a line',
  'inbox.composer.announce.reply': 'Reply. Sends to {name}.',
  'inbox.composer.announce.note': 'Internal note. Not sent to the customer.',

  /* pane C */
  'inbox.rail.show': 'Show details',
  'inbox.rail.hide': 'Hide details',
  'inbox.rail.elsewhere': 'Elsewhere in the console',
  'inbox.rail.error': 'This card did not load. Try again.',
  'inbox.rail.history.empty': 'No claims or transfers yet.',
  'inbox.customer.open': 'Open profile',
  'inbox.customer.plan': 'Plan',
  'inbox.customer.city': 'City',
}
