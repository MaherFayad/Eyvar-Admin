# 11 — The conversation pane and its composer (superseded)

**Superseded by [`12-inbox.md`](12-inbox.md), 2026-09-05 (CONTACT-CENTRE-REDESIGN-PLAN.md §6,
Phase D).** The composer is now design 12 §5 and §5.x; the thread is §4; the header is §4.1;
the four states are §3.3, §4.4 and §6. `DESIGN.md` §8.6 remains the governing pattern section.
This file is kept because `RULINGS.md`, `DECISIONS.md`, `12-refusal-and-undo-surfaces.md` and
`SUPPORT-UX-PLAN.md` cite it by name; nothing below is edited further.

Design 12 §1 says which parts of this file still bind where it is silent: the domain-state
table (§3.5), the failed message (§3.6), the copy (§5) and the Arabic rules (§7). Those four
sections are retained verbatim below; everything else lived in the old
`screens/support/conversations/` build, which Phase D deleted.

## Retained sections

### 3.5 Domain states — the ones that are actually the job

| State | Fixture | Thread | Composer | Rail / header |
|---|---|---|---|---|
| **Unclaimed** | `CNV-101` | normal, read-only | disabled: `Grab this conversation before replying.` | header primary is `Grab` |
| **Claimed by another operator** | `CNV-103` (`USR-3`, fresh) | normal, read-only | disabled: `Yousef Al-Balawi is handling this conversation.` | `Take over` (confirms, names the holder — **AC-940**) |
| **Claim gone stale** | `CNV-112` (idle 42 min) | normal | disabled, same as unclaimed | `Grab` — a stale claim is already free |
| **At the concurrent cap** | 3 live chats held | normal | — | `Grab` disabled: `You are holding 3 live chats, which is the limit.` (**D22**, **AC-967**) |
| **Closed** | `CNV-109` | normal | disabled: `This conversation is closed. Reopen it to reply.` | header primary becomes `Reopen` |
| **Snoozed** | — | normal | normal | rail shows `Snoozed until 14:00`; **both clocks paused** (D22) |
| **First-response breached** | `CNV-104` | normal | normal | **R5a leading-edge marker** on the queue row; the page banner belongs to the queue, not to the pane |
| **Resolution breached** (>20 min) | — | normal | normal | **`Create ticket` becomes the header primary.** It does not reorder and it is not an escalation (**D22**, **AC-964**) |
| **A message failed** | `CNV-104`, `CNV-110` | §3.6 | normal | — |
| **64 messages, one page** | `CNV-108` | `Load earlier messages` at the top; the rail says `64 messages` from `messageCount`, never `messages.length` (**AC-938**) | normal | — |
| **No write permission** | — | normal, read-only | fully disabled, §3.7 | `Grab`, `Transfer`, `Create ticket`, `Close` all disabled, all describing the **one** sentence |
| **WhatsApp** | `CNV-105` | normal | **absent** — `WhatsApp isn't connected yet. This conversation is read-only.` | no compose control anywhere (**AC-948**) |
| **Phone** | `CNV-106` | normal, every message internal | **note register only**; the `Reply` segment is absent | `A call has no message to send. Log a note instead.` |
| **Realtime gap** | `seq` gap on reconnect | refetch; no message missing (**AC-946**) | unchanged | no banner — a reconnection that healed itself is not an event |

### 3.6 A failed message — the state this screen exists for

```
                                ┌───────────────────────────────────────┐
                                │ Following up on your refund request…  │  OUTLINE,
                                └───────────────────────────────────────┘  no fill
                                Yousef · 09:24
                                Not delivered — no email address on file   --ev-ink
                                        [ Send again ]  [ Add an email address ]
```

**No red, no badge** — §8.6.7. R5a enumerates four uses of red and this is not one; R5 says
there is no red badge; R7 has no critical tone. The carriers are the **outline bubble** (the
only bubble in the thread not sitting on a surface), the **full-strength ink** on a line every
other delivery word renders muted, and **the words**.

- `Send again` — always, on every failed message (**AC-945**). It **restores the body into the
  composer, focused, caret at the end, and does not send**. A line appears under the composer:
  `Restored from a message that didn't send.` See **F-2**: the seam has no retry operation and
  this is the honest behaviour until it does.
- `Add an email address` — **only** when `failureCode === 'no_handle'`. Opens the 360° profile
  layer (`?entity=RDR-1041`). It is the actual fix; offering only `Send again` loops the
  operator through a refusal they cannot clear from this screen.
- A message in `sent`, `delivered` or `read` offers neither (**AC-945**).

## 5. Copy — final, every string

| Where | English |
|---|---|
| Placeholder, reply | `Write a reply…` |
| Placeholder, note | `Write a note for your team…` |
| Register segments | `Reply` · `Internal note` |
| Send, reply register | `Send` |
| Send, note register | `Add note` |
| Keyboard line, reply | `Enter sends · Shift + Enter adds a line` |
| Keyboard line, note | `Only your team can see this. Enter adds the note · Shift + Enter adds a line.` |
| Channel switch | `Reply by email` |
| Channel switch, pressed | `This reply goes by email to {address}.` |
| Delivery | `Sending…` · `Sent` · `Delivered` · `Read` |
| Delivery, failed | `Not delivered — {failureMessage}` |
| Failed actions | `Send again` · `Add an email address` |
| After `Send again` | `Restored from a message that didn't send.` |
| Channel changed mid-thread | `Sent by email` |
| Internal note, header | `Not sent to the customer` — **in the header, never in the delivery position** (§8.6.2) |
| Thread empty | `No messages yet.` |
| Thread error | `Couldn't load this conversation.` · `Try again` |
| Composer, thread error | `Couldn't load this conversation. Try again before replying.` |
| Composer, unclaimed | `Grab this conversation before replying.` |
| Composer, held by another | `{name} is handling this conversation.` |
| Composer, closed | `This conversation is closed. Reopen it to reply.` |
| Composer, phone | `A call has no message to send. Log a note instead.` |
| Composer, WhatsApp | `WhatsApp isn't connected yet. This conversation is read-only.` |
| Send / switch, no handle | `No email address on file for this rider.` |
| Send, no permission | `You need the “Contact users” permission. An owner can grant it.` (D17's template) |
| `Grab`, at the cap | `You are holding 3 live chats, which is the limit.` (D22) |
| Send rejected, 409 | `This conversation was closed. Reopen it to send.` |
| Send rejected, network | `Your message didn't send. Try again.` |
| Load more | `Load earlier messages` |
| Rail, message count | `{count} messages` |
| Rail, snoozed | `Snoozed until {time}` |
| Transfer dialog | title `Transfer to {name}?` · body `They own this conversation from the moment you transfer it. This can't be undone.` · primary `Transfer` |
| Take-over dialog | title `Take over from {name}?` · body `{name} keeps their other conversations. This is recorded in the history.` · primary `Take over` |

**Checks applied.** Sentence case throughout. Every button is a verb or verb + object.
No exclamation marks, no emoji, no "successfully", no "please", no "invalid", no "failed to".
Full sentences take a period; fragments, labels and the delivery words do not (**R6**).
No string is built by concatenation — every one is a whole dictionary template.
**No `TODO` anywhere in this file.**

**Deliberately no toast on send** (§8.6.3, R10). The message in the thread is the
confirmation, and it is a better one: it persists, it carries the delivery state, and it is
where the operator is already looking.

## 7. Arabic (§9)

| Thing | Behaviour |
|---|---|
| The whole assembly | Mirrors. `Send` at the inline-end in both languages, which is where the sentence ends in the reading direction. **A composer with a physically-anchored send affordance is a defect.** |
| Bubbles | `self-start` for inbound, `self-end` for outbound. In Arabic the customer is on the right and the operator on the left — correct, and it falls out of logical properties with no branch. |
| Internal note | Full width; nothing to mirror. This is a reason to prefer the shape over an alignment. |
| The email address in `This reply goes by email to {address}.` | **`<bdi>`-isolated.** Unisolated, the `@` and the TLD reorder. |
| Phone number in the rail | `<bdi>`, leading `+` kept (`rtl.md`). |
| Timestamps `09:41` | Numeral run — does **not** reorder. The line aligns inline-start; the string does not. |
| `{count} messages` | `formatCount(n, language)`. Never `String(n)`. |
| Delivery words | Single words, no numerals, no bidi hazard. This is a second reason not to use ticks: a glyph borrowed from a consumer app has no Arabic reading at all. |
| `Enter sends · Shift + Enter adds a line` | Key names stay Latin; **the `·` separator and the sentence order are the translator's**, so it is one template, not three concatenated fragments. |
| The AR dictionary is empty | By design, as a test fixture. Every string above must still resolve through `t()` — a hardcoded English literal in JSX is invisible until the day the dictionary fills. |

