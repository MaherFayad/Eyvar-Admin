# 11 — The conversation pane and its composer

**Screen:** Support › Contact Centre, level-3 conversation pane · **Spec:** `DECISIONS.md`
**D19**, **D22** · **Owner:** product-designer · **Status:** designed. F-R5-1 is closed.

> **The blocker is cleared.** `DESIGN.md` §6.4 now carries a row for this screen and §8.6 is
> its governing section. Both were written as part of this step, into
> `docs/06-design-reference/_partials/`, and `DESIGN.md` was rebuilt. **`DESIGN.md` is
> generated and was not hand-edited.** See §9 for exactly what changed.

## 1. Pattern

| | Row | Governing sections |
|---|---|---|
| **The queue** | `contacts` (Support › Contact Centre) → **Work queue** | §8.4 |
| **The pane** | same row → **Two-column detail + a sending composer** | §2.2, §3.8, **§8.6** |

**Page shape: main + right rail** (§2.2), one of the four. Not a full-bleed editor — §2.5
governs inspector panels and device previews and none of it reaches a thread. Not a
monitoring shell — the thread updates live but it is a record being worked, not a feed being
watched, and §8.1's apparatus (staleness, the live dot, the ambient loop under R18) does not
apply to it.

**What §8.6 adds that no existing row carried.** §4 governs a form that *saves*; this one
*sends*. The four differences — no dirty state, no discard, an irreversible primary, a
delivery state that arrives after the interaction is over — are §8.6's opening table.
**Read §8.6 before building. This file draws it; §8.6 rules it.**

## 2. Layout

```
┌ page header ─────────────────────────────────────────────────────────────┐
│ ‹ Nora Al-Harbi            (Chat) (Waiting)     [Transfer] [Create ticket]│
│                                                          [ Close ]        │
└──────────────────────────────────────────────────────────────────────────┘
┌ main ─────────────────────────────────────────┐┌ rail — 320px ───────────┐
│              [ Load earlier messages ]        ││ ┌ Customer ───────────┐ │
│                                               ││ │ Nora Al-Harbi       │ │
│  ┌────────────────────────────────┐           ││ │ Rider · RDR-1041 →  │ │
│  │ I still haven't had my refund. │           ││ │ +966 5x xxx xxxx    │ │
│  └────────────────────────────────┘           ││ └─────────────────────┘ │
│  Nora · 09:38                                 ││ ┌ This conversation ──┐ │
│                                               ││ │ Waiting  12m 04s    │ │
│               ┌─────────────────────────────┐ ││ │ Chat · opened 09:38 │ │
│               │ Checking that for you now.  │ ││ │ Held by you         │ │
│               └─────────────────────────────┘ ││ │ TKT-501 →           │ │
│                              Sarah · 09:41    │││ └─────────────────────┘ │
│                              Delivered        ││ ┌ History ────────────┐ │
│                                               ││ │ Claimed by you 09:40│ │
│ ┌ INTERNAL NOTE ──────────────────────────┐   ││ │ Opened 09:38        │ │
│ │ ⟨Internal note⟩ Sarah · 09:42           │   ││ └─────────────────────┘ │
│ │ Refund is stuck on the escrow release.  │   ││                         │
│ └─────────────────────────────────────────┘   ││                         │
├───────────────────────────────────────────────┤│                         │
│ ┌ composer ───────────────────────────────┐   ││                         │
│ │ [ Reply | Internal note ]               │   ││                         │
│ │ ┌─────────────────────────────────────┐ │   ││                         │
│ │ │ Write a reply…                      │ │   ││                         │
│ │ └─────────────────────────────────────┘ │   ││                         │
│ │ (attach)(canned) [Reply by email] [Send]│   ││                         │
│ └─────────────────────────────────────────┘   ││                         │
│ Enter sends · Shift + Enter adds a line       ││                         │
└───────────────────────────────────────────────┘└─────────────────────────┘
```

**Card order in the rail, and why.** `Customer` first — it is the thing the whole screen is
about and it is the only card with a link out of the screen. `This conversation` second: the
countdown, the channel, the claim holder and the ticket link, i.e. everything an operator
answers *"can I act on this?"* with. `History` last: claims, take-overs and transfers, which
are read after a surprise, not before an action.

**The countdown lives in the rail, not the header.** §8.4.2's SLA countdown is a property of
the work item, and the header already carries the status badge. Two clocks in two places is
how a breach gets missed in both.

**The composer is inside the main column and pinned to its bottom edge.** The thread scrolls
behind it. §8.6.1 — this overrides §3.8's *"composer above the feed"* for a conversation
thread and for nothing else.

## 3. Every state

### 3.1 Content — the four message shapes

Four shapes, four grounds already in the token set, **no new colour, and every one survives
greyscale** (§8.6.2):

```
inbound          ┌──────────────────┐              self-start, --ev-bg2 ground
                 │ …                │
                 └──────────────────┘
                 Nora · 09:38

outbound                        ┌──────────────────┐  self-end, --ev-surface,
                                │ …                │  1px --ev-hairline-control
                                └──────────────────┘
                                Sarah · 09:41
                                Delivered            ← newest outbound only

internal note    ┌─────────────────────────────────────────────────────────┐
                 │ ⟨Internal note⟩ Sarah · 09:42  Not sent to the customer │  FULL WIDTH,
                 │ Refund is stuck on the escrow release.                  │  --ev-bg2,
                 └─────────────────────────────────────────────────────────┘  1px border
                          the not-sent line is in the HEADER, and the delivery
                          position stays EMPTY — §8.6.2, and see D-1 below

system                     Yousef transferred this conversation to Sarah.
                                    centred, --ev-text-2, no ground, no author
```

**The note is the only message that is not a bubble.** That is the difference an operator
reads from across a desk, and it costs nothing.

**Channel changes mid-thread** (`Reply by email` on a chat) get one line above the first
message on the new channel: `Sent by email` — §8.6.5, only where it differs from the message
above.

### 3.2 Empty — `CNV-107`, a real conversation with zero messages

```
│                                                       │
│                    No messages yet.                    │   one grey sentence,
│                                                       │    --ev-text-2, centred
├───────────────────────────────────────────────────────┤
│ ┌ composer — fully normal ────────────────────────────┐│
```

**R8:** no illustration. An illustration belongs to a whole-page, zero-records-ever state,
and this is one conversation that happens to be new. **The composer is fully enabled** — this
is the state in which the operator writes the first message, so refusing it here would refuse
the screen's whole purpose.

Do **not** reuse `No conversations yet.` — `states.md`'s R5-11 rule: three different absences
must not wear the same sentence. The queue's zero-state and a thread's zero-state are
different facts.

### 3.3 Loading

```
│  ▨▨▨▨▨▨▨▨▨▨▨▨▨                                       │   skeleton bubbles,
│                              ▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨       │   alternating start/end,
│  ▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨                                 │   3 of them, no spinner
├───────────────────────────────────────────────────────┤
│ ┌ composer — rendered, disabled, no reason line ──────┐│
```

Skeleton shaped like the content (`states.md`). **Never a centred spinner.** The composer
renders disabled with **no reason line** — a reason for a state that lasts 300ms is a flash of
text, which is worse than nothing.

### 3.4 Error

```
│              Couldn't load this conversation.          │  ErrorState scope="card"
│                      [ Try again ]                     │  no icon (shell dev. 13)
├───────────────────────────────────────────────────────┤
│ ┌ composer ───────────────────────────────────────────┐│
│ │ … disabled …                             [ Send ]   ││
│ └─────────────────────────────────────────────────────┘│
│ Couldn't load this conversation. Try again before replying.
```

The composer is **disabled, not hidden** (§11.2). It is disabled rather than left enabled
because the conversation's `status` is unknown — replying into a conversation that may have
been closed is how a message lands nowhere and the operator believes it landed.

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

## 4. Components

| Element | Component | Variant / tone | Restyle notes |
|---|---|---|---|
| Register switch | segmented control (the `Tabs`-based one from D12/R4-8) | 2 segments, stadium track, `--ev-ink` selected pill | R15 does not govern it — R4-7 settled that. |
| Composer field | `Textarea` | grows to 6 lines then scrolls | `--ev-surface` in `Reply`, **`--ev-bg2` in `Internal note`**. `focus-visible:ring` intact (§7.2). |
| `Send` / `Add note` | `Button` | **`default`** — near-black `--ev-ink` (R2, R3) | The only filled button in the main column. It is not green and it is not blue. |
| `Reply by email` | `Toggle` | `outline`, `aria-pressed` | Label never changes (§8.6.5). |
| `Grab` / `Take over` / `Reopen` | `Button` | `default` in the page header | One primary per surface (§3.9). |
| `Transfer` · `Create ticket` · `Close` | `Button` | `secondary` | `Create ticket` **promotes to `default`** on a resolution breach (D22). |
| `Send again` | `Button` | `secondary`, `size="xs"` | |
| `Add an email address` | `Button` | `ghost`, `size="xs"` | |
| Status badge (header) | `Badge` | `waiting` → **warning** · `active` → **info** · `snoozed` → **neutral** · `closed` → **success** | The map `types/conversation.ts` proposes, ratified. R7's five tones, no sixth. |
| Channel badge | `Badge` | **neutral**, always | A channel is not a status. Four channels sharing one tone is correct. |
| `Internal note` badge | `Badge` | **neutral** | Never warning — R17, one warning tone, and a note is not a warning. |
| Delivery line | plain text | `--ev-text-2`; `--ev-ink` when failed | Not a badge. Not a glyph. |
| Attachment chip | `Badge`-shaped chip | neutral, with filename + size | §3.8's observed anatomy, unchanged. |
| Thread error | `ErrorState` | `scope="card"` | No icon (`00-shell.md` deviation 13). |
| Thread empty | one sentence | `--ev-text-2` | No `EmptyState` component — R8, an empty card is a sentence. |
| Transfer / take-over dialog | `Dialog` | title is a question naming the holder | §5.0: irreversible → modal. These are registry commands and D18 applies to them. |

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

## 6. Interaction

| Act | Behaviour |
|---|---|
| `Send` press | The composer clears **immediately**; the message appears at the foot of the thread reading `Sending…`; focus returns to the field. |
| Send rejected (422 / 409) | The optimistic message is **removed** — never left as a phantom — the body is restored to the field, and the reason renders under the composer. |
| `Enter` | Sends, in **both** registers. Uniform: a special case here is a surprise, and the keyboard line under the composer already states which register is active. |
| `Shift + Enter` | New line. |
| `⌘/Ctrl + Enter` | Sends. Muscle memory; costs nothing. |
| `Esc` in the field | Blurs to the thread. **Does not clear the field** and does not close the pane. |
| Register switch | `←` / `→` between segments — mirrored in Arabic by the primitive, not by us. |
| `Reply by email` | Toggles. `aria-pressed` carries the state; the label does not change. |
| `Load earlier messages` | Prepends, **preserves the scroll anchor** so the message being read does not jump. |
| A message arriving while scrolled up | The thread does **not** auto-scroll. A pill appears at the foot: `New message` — pressing it scrolls to the bottom. Auto-scrolling a thread someone is reading is how the sentence they were mid-way through disappears. |
| Entity name, ticket link | Open the 360° layer / the ticket. Drawer, no scrim (`00-shell.md` §6.1). |
| `Transfer`, `Take over` | Modal. They are irreversible and they are registry commands, so **D18 applies to them in full**. |
| `Grab`, `Release`, `Close`, `Snooze` | **No modal.** Reversible, so D18 buys them out of the dialog; each fires an undo toast (§12's §3). |
| Draft | Held per conversation, **in memory, for the session only**. Returning restores it; a reload discards it; nothing indicates a draft exists. §8.6.9, and **F-4**. |

**No confirmation on send.** §8.6.4 — D18's rule governs registry commands and a composer
send is not one; reading it broadly makes D22's 45-second promise unmeetable. **Raised as
F-1; the design ships on the narrow reading.**

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

## 8. Deviations

Each names the rule it suspends. One that does not name its rule is not sanctioned.

| # | What | Rule suspended | Why |
|---|---|---|---|
| 1 | **The composer sits at the foot of the thread** | §3.8 — *"The timeline MUST place the composer above the feed"* | Written into **§8.6.1**, which scopes the override to a conversation thread and upholds §3.8 for every other timeline. A thread is read in time order and `Conversation.messages` pages newest-first, so the bottom edge is the only stable anchor. |
| 2 | **No confirmation on send** | §5.0's *irreversible → modal* row; **D18** on the broad reading | §8.6.4. D18's rule is written in registry vocabulary; a send has no arity and no affordance. The narrow reading is the only one under which D18 and D22 are both true. **F-1.** |
| 3 | **`Send again` does not send** | **AC-945**'s implied behaviour | The seam has no retry operation and `replyConversation` would mint a duplicate message under a new id. **F-2.** The control, the label and the criterion's visible substance are unchanged. |
| 4 | **The label is `Add note`, not §3.8's observed `Post`** | none — `Post` is `[observed]`, not a rule | §3.8's rule is *disabled until there is content*, which is upheld. The label names the register, which is carrier 4 of five. |
| 5 | **The refusal renders once per screen, not once per control** | none — §11.2 requires the reason to be *available*, not repeated | §8.6.8. Five copies of one sentence buries the sentence. `aria-describedby` makes one instance reachable from every refused control. |

**No new colour, no new radius, no new spacing value, no sixth badge tone, no red.**
§6.4's colour rule is met by construction: every ground used here (`--ev-surface`,
`--ev-bg2`, `--ev-ink`, `--ev-hairline-control`, `--ev-text-2`) already exists.

## 9. What changed in `DESIGN.md`

Two partials edited, then `python docs/06-design-reference/build-design.py`.
**`DESIGN.md` was not hand-edited.**

| Partial | Change |
|---|---|
| `08-eyvar-patterns.md` | **New §8.6 — "The message composer — a form that sends."** Nine sub-sections and 18 rules. §8's intro table gains a sixth surface-type row; the *standing rulings* paragraph records that §8.6 mints **no** new ruling: R5/R5a upheld (red stays at four uses), R7 upheld (the note is neutral), R10's lifetime test decides which messages show a delivery state, and §3.8 is **overridden** for a conversation thread only — the same shape as §8.2's override of §4.2. |
| `06-eyvar-mapping.md` | **§6.4 gains two rows.** `contacts` leaves the index-table row (which described the *legacy phone roster*) and becomes `Work queue` + `Two-column detail + a sending composer`. `ticket-detail` leaves the two-column-detail row and cites §8.6 because it also sends. A blockquote below the table records F-R5-1, why §4 and §3.8 both fail, and the census change: index table 10 → 9, two-column detail 4 → 3, work queue 7 → 8, **no page shape and no component added**. |
| `docs/ref/patterns.md` | Same two rows, plus a *pattern-specific trap*: **a composer is not a §4 form.** Updated in the same commit, per the ref-file rule. |

## 9a. Deltas against `screens/support/conversations/`, which is already built

The read-only thread ships (`ConversationThread.tsx`, `ConversationConsoleScreen.tsx`) and
its author stopped at the composer, citing F-R5-1 in the file header. That was the right
call and this spec unblocks exactly the part they left. **Six deltas, in the order they
matter:**

| # | Built today | This spec | Why |
|---|---|---|---|
| **D-1** | `Not sent to the customer` renders **in the delivery position** on a note | It renders in the note's **header**, beside the badge; the delivery position stays empty | It sits two messages away from `Not delivered — no email address on file`, same slot, same size, both opening on *Not*, meaning opposite things. §8.6.2 — this delta was found by reading the built file and the rule was strengthened because of it. |
| **D-2** | Delivery state renders on **every** message that has one | **Newest outbound customer-visible message only**, plus every `failed` | §8.6.6 — the answer to "how does delivery render without turning the thread into a status board". |
| **D-3** | `failedReason` falls back to `failureCode` | **Never `failureCode`.** With no `failureMessage` the line is `Not delivered` alone | §8.6.7, D17 clause 1: a code is a fact about the software. |
| **D-4** | The pane is a **`Sheet`, `side="inline-end"`** | A **page**: main + right rail (§2.2) | **D19 maps the pane to the two-column-detail row explicitly**, and §6.4 now carries it. `--ev-drawer-w` is 480px; a thread plus a 320px rail plus a pinned composer does not fit, and §5.0's drawer row is for a surface *consulted against* the page behind it — not a 20-minute work session under a 45-second promise. **This is the one decision I am asking frontend to make with me rather than absorb.** |
| **D-5** | Every message is a bordered card in an `<ol>` | Four shapes: inbound `self-start`, outbound `self-end`, note **full width**, system centred | §8.6.2 — the note being the only non-bubble is the carrier that reads from across a desk. `bg-card` vs `bg-muted` plus a badge is two carriers; this is four. |
| **D-6** | `conversations.composer.blocked` / `blockedBody` — *"Replying from this pane is not built yet."* | Deleted. §5 of this file is the replacement copy set | The placeholder did its job. |

Nothing above touches `PresenceBar.tsx`, `presence.ts`, `sla.ts` or `vocabulary.ts`.

## 10. Findings — raised, not decided here

| # | Finding | Owner | Blocks |
|---|---|---|---|
| **F-1** | **D18 and D22 collide if D18 is read broadly.** D18's table puts *"anything that sends — chat reply, email"* in the column headed *"Not undoable — **confirms**"*. A dialog on every message makes D22's 45-second first-response promise unmeetable at a cap of 3. I have designed to the **narrow** reading — D18 governs registry commands and a send is not one — and I need that ratified. If the broad reading stands, the cheapest reconciliation is a short **`queued` hold** with `Undo send` on the message, which the model already supports and the seam does not. | product-owner | nothing today |
| **F-2** | **There is no retry operation on the seam.** `deliveryCanRetry()` is a predicate with no operation behind it. Calling `replyConversation` again mints a **new** `CMSG` id, duplicates the body in the thread, and re-runs the status side effects (`status: 'active'`, `waitingSince: null`, `firstResponseAt`). On `CNV-110` it would stack identical failures without bound. **Needs `retryMessage(conversationId, messageId): Promise<Message>`**, re-emitting delivery from `queued` and mutating the existing message in place. | mock-data-engineer | `Send again`'s real behaviour; §3.6 ships the interim |
| **F-3** | **`ConversationParticipant` cannot answer "does this customer have an email address?"** `handle` is documented as *"the address on **this** channel"* — one handle, not a map. So on a **chat** conversation the handle is a chat session id and **`Reply by email` cannot compute its own disabled state**, which is the case D19 invented the control for. Recommend an additive `handles: { [K in ConversationChannel]?: string \| null }`, with `handle` kept as the current-channel alias. Nothing breaks. | mock-data-engineer | `Reply by email` on any non-email conversation |
| **F-4** | **AC-943 names the wrong control.** `CNV-110` is an **email** conversation with `handle: null`, so there is no other channel and no `Reply by email` control to disable — the refusal belongs on `Send`, which is also what the fixture's own comment asks for (*"the console should have refused the send rather than queued it"*). §8.6.5 rules both cases. AC-943's substance is unchanged: a reason naming the missing address, and no message queued. Suggested rewording: *"On `CNV-110`, whose customer has no email handle, the send control renders disabled with a reason stating there is no email address on file, and no message is queued."* | product-owner | nothing |
| **F-5** | **A composer draft has no home in D16.** It is not URL-expressible (class 1), not a preference (class 2), and not a named artefact (class 3). §8.6.9 takes the least-costly-to-reverse default — in memory, session-lived, not indicated anywhere. Confirm, or rule it class 2. | product-owner | nothing |
| **F-6** | **`Message` has no subject, so an email escalated from a chat has no subject the operator can write.** `Conversation.subject` is `null` on chat by design. v1 sends with the conversation's subject and lets the server derive one where it is null; the console cannot express an operator-authored subject at all. | product-owner + mock-data-engineer | nothing in v1; it will be the first complaint |
| **F-7** | **`read` is unreachable live in mock mode.** `scriptDelivery()` emits `queued → sent → delivered` (or `queued → failed`); it never advances into `read`. `read` is seeded on `CNV-105` and `CNV-111`, so the rendering is testable from stored data, but the *transition* is not. Recorded so nobody reports the missing tick as a UI bug. | mock-data-engineer | nothing |
| **F-8** | **Ticket and rider fixtures disagree on `RDR-1041`** — `TKT-501` says *Mohammed Al-Ghamdi*, `riders.ts:22` says *Nora Al-Harbi*. D19 already flagged it: *"two support screens will disagree in front of a customer."* This screen links a conversation to both. **Fix before P5-T4.** | mock-data-engineer | the 360° link from this pane |

## 11. Handoff

**To frontend-engineer.** Build against **§8.6** (`DESIGN.md`), this file for the drawings and
the strings, and `12-refusal-and-undo-surfaces.md` for the refusal and toast surfaces.
**Read §9a first** — the read-only thread is already built and there are six deltas, one of
which (D-4, drawer → page) is a decision I want made together rather than absorbed. Three
further decisions are yours and are not design calls: how the optimistic message is keyed before the
server id arrives; whether the register is `Tabs` or `ToggleGroup` (either satisfies §8.6 as
long as it is at rest and keyboard-navigable with arrows); and how `role="alert"` is attached
to a critical toast without adding a second live region.

**To utilities-engineer.** Four helpers this design implies, each with three call sites
already: a delivery-state → label map (thread, queue row, and any future digest); a
`newestOutboundCustomerMessage(messages)` selector, which is the whole of §8.6.6 in one
function and is the thing a screen will otherwise re-derive per render; a scroll-anchor hook
for prepending earlier messages; and a session-scoped per-key draft store for §8.6.9 that is
explicitly **not** `UiStateStore` and must not touch `localStorage`.

**To mock-data-engineer.** F-2, F-3, F-6, F-7, F-8.

**To product-owner.** F-1, F-4, F-5, F-6.
