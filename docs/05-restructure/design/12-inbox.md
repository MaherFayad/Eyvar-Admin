# 12 — The Contact Centre inbox: three panes, one route

**Screen:** Support › Contact Centre, `/support/contact-centre` and `/support/contact-centre/:id` ·
**Code:** `src/screens/support/inbox/` — `InboxScreen`, `FolderNav`, `ConversationList`,
`ConversationListItem`, `Thread`, `MessageGroup`, `Bubble`, `NoteBlock`, `DayDivider`,
`SystemLine`, `DeliveryLine`, `ThreadHeader`, `Composer`, `ContextRail`, `CustomerCard`,
`ThreadCard` · **Decisions:** `DECISIONS.md` D19, D22, D16a · **Owner:** product-designer.

This file is the whole design of the inbox: the three panes, the thread grammar, the composer,
the domain states, the copy and the Arabic rules. Owner decisions are in §11 and the
acceptance criteria in §13.

Precedence applied: `docs/RULINGS.md`, then the Rulings table, then §6.2, then §7–§9. Where
this file and `DESIGN.md` (or the token set in `globals.css`) disagree, `DESIGN.md` wins and the
row in §10 says so. `DESIGN.md` has no inbox row; the nearest rules are cited.

**How the screen is drawn today.** `scripts/harness/support-inbox.mjs` (deep probe:
`inbox-{list,mine,thread,note,empty-thread,long-name,snoozed}-{wide,compact}-{en,ar}-<label>.png`
plus `inbox-{thread,note}-wide-en-dark-<label>.png` under `scripts/harness/shots/`) and
`scripts/harness/support-queues.mjs` (`contact-centre` and `contact-centre-thread` at 1280, en
and ar). The verified frames are filed under `docs/02-verification/inbox/`.

## 1. Pattern

| Pane | §6.4 row | Governing sections |
|---|---|---|
| A · list | **Work queue** (`contacts`) rendered as a list, not a `DataTable` | §8.4.1 claim, §8.4.2 countdown, §8.4.6 R5a marker |
| B · thread + composer | **Two-column detail + a sending composer** | **§8.6** in full, §2.2 for what belongs beside a record |
| C · context | the rail half of §2.2 | §2.2: status, summary, metadata, links only |

**Page shape: none of the four.** The inbox is a full-height three-track grid under the top
bar, the shape R4-2 minted for master–detail (`PageShell.tsx:376`, `grid-cols-master-detail`)
extended by one track. `SingleColumnPage` and `DetailPage` are not used. This is a gap in
§6.4 and is recorded as finding F-12-1, not improvised around: every rule below is cited
from the nearest row. Not a monitoring shell: the thread updates live but §8.1's staleness
apparatus and R18 ambient loop do not apply.

The list rows, the search-and-toolbar cluster, the segmented control and the muted second
line all follow the shell's own language (D7, `03-visual-language.md`). The composer chrome
— toolbar row under the field, the audience line outside the surface — and the bubble
grammar in §4 are decided here; no other Eyvar surface is a chat.

## 2. Layout at 1280px

Content region = 1280 − `--ev-rail-w` 80 − `--ev-subnav-w` 224 = **976px** (Arabic 936).
Height = viewport − `--ev-topbar-h` 52. Three tracks, `grid-template-columns:
var(--ev-inbox-list-w) minmax(0,1fr) var(--ev-inbox-rail-w)`, gap 0, each pane its own
scroll container (`min-h-0`). Pane borders: 1px `--ev-hairline` on the inline-end of A and
inline-start of C. All grounds `--ev-bg`; cards in C on `--ev-surface`.

| Token (new, §9) | Value | Track |
|---|---|---|
| `--ev-inbox-list-w` | 272px | A |
| `--ev-inbox-rail-w` | 272px | C expanded |
| `--ev-inbox-rail-min-w` | 40px | C collapsed |

B = 976 − 544 = **432px** expanded, 664px with C collapsed. Arabic 392 / 624. Wider panes of
300 / 320 would leave B at 356px, under the width a 14px sentence needs; see §10.

```
┌ A · 272 ───────────┬ B · 432 ────────────────────────────────┬ C · 272 ──────────────┐
│ [🔍 Search        ] │ (N) Nora Al-Harbi        [Transfer] [⋯] │ Customer              │
│ ▾ Folders          │     Chat · Active · ⏱ 11m 20s left      │ (N) Nora Al-Harbi     │
│   Unassigned    5  ├─────────────────────────────────────────┤ RDR-1041              │
│   Mine          2  │            [ Load earlier messages ]    │ +966 5x xxx xxxx      │
│   Waiting       3  │ ─────────────  Today  ────────────────  │ nora@example.com      │
│   Active        1  │ (N) Nora                                │ [Open profile]        │
│   Snoozed       0  │ ┌──────────────────────┐                │ [Create ticket]       │
│   Closed       14  │ │ I still haven't had  │                │                       │
│ ───────────────────│ │ my refund.           │                │ This conversation     │
│ ● (N) Nora     ⏱2m │ └──────────────────────┘ 08:52          │ Resolution 11m 20s    │
│   I still haven't… │                          Sarah (you) (S)│ Held by you · Release │
│ ○ (T) Tariq     4m │             ┌─────────────────────────┐ │ Reason  Refund        │
│   Thanks, sorted   │             │ Checking that for you   │ │ Ticket  TKT-501       │
│ ○ (M) Mohammed 11m │             │ now.                    │ │                       │
│   Order not arri…  │             └─────────────────────────┘ │ ▸ Elsewhere  (3)      │
│                    │                          08:57 Delivered│ ▸ History    (2)      │
│                    │ ┃ Internal note · Sarah · 08:55         │                       │
│                    │ ┃ Billing shows the escrow is stuck.    │                       │
│                    │        Sarah claimed this conversation  │                       │
│                    │ Nora is typing…                         │                       │
│                    │ ┌ Reply │ Internal note ───────────────┐│                       │
│                    │ │ Write a reply…                       ││                       │
│                    │ │ [Insert template] [Reply by email]   ││                       │
│                    │ │                             [ Send ] ││                       │
│                    │ └──────────────────────────────────────┘│                       │
│                    │ Enter sends · Shift + Enter adds a line  │                       │
└────────────────────┴─────────────────────────────────────────┴───────────────────────┘
```

**Why this order.** A leads because it carries the selection (R4-2's master–detail reasoning:
the fixed track leads). C trails because §2.2 reserves the rail for what is read *about* the
record, never for what is done to it: every action on the conversation lives in B's header
or composer. Nothing in C is a primary.

**Below `--ev-bp-wide` (1280).** C is forced collapsed to `--ev-inbox-rail-min-w`; its expand
button opens it as a `Sheet side="inline-end"` (no scrim, §5.5). A and B unchanged.

**Below `--ev-bp-compact` (768).** A is the screen. Selecting a row pushes B over it, full
width, with a back button (`inbox.header.back`) leading the thread header and no avatar (§10 row 13). C is a full-width
`Sheet` from the header's `Details` icon button. The composer is `position: sticky; bottom: 0`
on the viewport. Folders are a `Select` above the search field, not a list.

## 3. Pane A — the list

### 3.1 Anatomy

```
┌ 272 ─────────────────────────────────────────┐
│ ┌ 🔍 Search by name, ID or message ────────┐ │  Input, --ev-control-h 32, ps-8 icon slot
│ └──────────────────────────────────────────┘ │
│ ▾ Folders                                    │  collapsible heading, text-xs 600, 32px
│   Unassigned                              5  │  32px rows; count in text-2xs tabular
│   Mine                                    2  │  selected: --ev-bg2 fill + 600 (tabs.tsx idiom)
│   …                                          │
│──────────────────────────────────────────────│  hairline
│┃● ┌──┐ Nora Al-Harbi        ⏱ overdue 2m    │  row 60px = --ev-row-h-media
│┃  │N │💬 I still haven't had my refund.     │  ┃ = R5a marker (breached only)
│   └──┘                                 (S)   │  ● = unread dot · (S) = owner mark
│   ┌──┐ Tariq Al-Qahtani              4m      │
│   │T │✉  Thanks, sorted.                     │  ours: preview --ev-text-2
│   └──┘                                       │
│        That's every conversation here.       │  end-of-list, one grey line (copy rule 10)
└──────────────────────────────────────────────┘
```

**Search** is a field (D11), full width, `Input` with the registry `SearchIcon` inline-start.
Matches `entityName`, handle, id and message text (existing `q` on `listConversations`).
Search text, folder and selection live in the URL (`?q=`, `?view=`, `:id`) — D16 class 1.

**Folders** are D19's six views, in D19's order, as a vertical list with live counts from
`getConversationFacets`. The heading collapses the list to one line reading the current
folder and its count; collapsed state is a D16 class-2 preference. Counts use `formatCount`.
The list is `<nav aria-label={inbox.folders.label}>` of `<a href="?view=…">`.

**Sort** is D22's: first-response-breached rows first (oldest first within), then nearest
running clock, then `waitingSince` ascending. Not user-sortable; a sortable list is a report.

**A row is one `<a>`** (`role` native, `aria-current="page"` when selected) to
`/support/contact-centre/:id`, height `--ev-row-h-media`, padding `px-3`, gap 8:

| Slot | Component | Spec |
|---|---|---|
| R5a marker | `RowCriticalMarker` | 3px inline-start edge, `--ev-marker`, breached first-response only (§8.4.6b) |
| Unread dot | `<span>` 8px `rounded-full` `bg-primary` | `unreadCount > 0`; carrier 1 of 2 |
| Avatar | `Avatar` default (32px rounded square, R4-7) | initials; channel glyph in a 20px `rounded-sm` `--ev-surface` slot with 1px `--ev-hairline` at the bottom-inline-end corner, icon `size-4` `--ev-text-2` |
| Name | `text-sm` `--ev-ink`, truncate | weight 600 when unread (carrier 2), else 500 |
| End of line 1 | one of: `SlaCell` pill · relative time | pill when a clock runs or is breached (`overdue 2m` warning tone, `due 4m` neutral / warning by §8.4.2 bands); else last-message age in `text-2xs` `--ev-text-2` |
| Preview | `text-xs`, truncate | `lastMessagePreview`; `--ev-ink` when `lastMessageAuthorKind === 'customer'`, `--ev-text-2` when ours; `conversations.preview.none` when null |
| Owner mark | `Avatar size="xs"` 20px | initials of the holder; `aria-label` `queue.owner.heldBy` / `inbox.row.yours`; absent when unclaimed |
| Bulk checkbox | `Checkbox` | replaces the avatar on row hover, on row focus, and while any row is checked or after `x`; never hover-only (§7.3) |

`text-2xs` (12px) appears only on the age and the folder count; nothing operator-facing goes below it.
No `CNV-` id in the row; the id is searchable and shown in C.

### 3.2 Row states

| State | Rendering |
|---|---|
| Rest | as drawn |
| Hover | `--ev-bg2` ground; checkbox appears |
| Focus-visible | `ring-2 ring-inset` (the zero-gap idiom `tokens.md` licenses for nav rows) |
| Selected | `--ev-bg2` ground + 3px inline-start `--ev-ink` edge via `inset-inline-start` box-shadow; when the row is also breached the R5a red edge wins and selection shows by ground alone |
| Unread | dot + name 600; cleared the moment the row is opened (AC-CC-07) |
| Breached | R5a edge + pill `overdue Nm` warning tone; both, never one (§8.4.6c) |
| Snoozed folder | end of line 1 reads `conversations.rail.snoozed`-style time `until 14:00` neutral |
| Checked | checkbox checked, ground `--ev-bg2`; the bulk bar (tier 2) rises with `queue.claim` |

### 3.3 Pane states

| State | Rendering |
|---|---|
| Content | rows; virtualised above 200 (Q-CC5) with `inbox.list.end` after the last |
| Empty, folder cleared | one grey sentence: the existing `conversations.empty.cleared.<view>` body, centred at `py-8`. No heading, no illustration (R8, an empty card) |
| Empty, search no match | `conversations.empty.noMatch` + `Button variant="ghost" size="xs"` `inbox.search.clear` |
| Empty, first run (every facet 0) | `EmptyState` in **B**, illustration licensed (R8 whole-page zero-ever), `conversations.empty.firstRun.*`; A shows the folder list and its zero counts |
| Loading | 6 skeleton rows: 32px square + two bars (`w-2/3`, `w-full`), `aria-busy` |
| Error | `ErrorState scope="card"` `conversations.error.list` + `conversations.thread.retry` |

## 4. Pane B — the thread

### 4.1 Header (60px = `--ev-row-h-media`)

```
│ (N) Nora Al-Harbi                                 [Transfer] [Snooze until…] [⋯] │
│     💬 Chat · Active · ⏱ 11m 20s left                                             │
```

Avatar 32 · name as `<a>` to the 360° overlay (`withOverlay`, drawer, §6.1) · line 2 in
`text-xs` `--ev-text-2`: channel glyph + `conversations.channel.*` · `StatusBadge` for
status (tones from `vocabulary.ts`: waiting warning, active info, snoozed neutral, closed
success) · the **one running clock** as `SlaCell` (`runningClock` picks it; `promiseLabel`
gives the a11y name). A chat with no first-response target shows the resolution clock; a
phone conversation shows no pill — never the words `No clock` (Q-CC4).

**Actions, inline-end, in this order.** `Button size="sm"` (32px):

| Conversation | Visible | In `⋯` (`DropdownMenu`, **D8-b**: a `⋯` exists only when it holds three or more; with two or fewer they render as labelled ghosts and there is no `⋯`) | Filled |
|---|---|---|---|
| Unheld, open | `Claim` | Transfer · Snooze until… · Create ticket · Close conversation | **`Claim`** (`default`) |
| Held by another | `Take over` | same | **`Take over`** |
| Held by you | `Transfer` | Snooze until… · Log a call (phone) · Create ticket · Close conversation | **none** — `Send` is the screen's filled button (§8.6, R2). See §10 row 11 |
| Held by you, resolution breached, no ticket | `Create ticket` | Transfer · Snooze until… · Log a call (phone) · Close conversation | none; see §10 D22 |
| Closed | `Reopen` · `Create ticket` | none | **`Reopen`** |
| Snoozed | `Create ticket` | Transfer · Close conversation · Snooze until… (a new wake time, the same call) | none |

Every visible non-primary is `variant="ghost"`. A refused control renders disabled in place
and its reason renders **once** under the header in `text-xs` `--ev-text-2` with
`aria-describedby` from every refused control (§8.6.8, D17). At the cap `Claim` is disabled
and the line reads `conversations.cap.reached`. `Log a call` and `Create ticket` keep their
existing modals and refusals (`LogCallModal`, `NewTicketModal`).

### 4.2 The bubble grammar

Body `text-sm` `--ev-ink`, `whitespace-pre-wrap`, padding `px-3 py-2`, radius
`--ev-radius-card` 8px, no border, `max-width` two-thirds of B. Thread padding `px-4 py-3`,
gap 4 inside a group, 16 between groups, 24 around a divider.

```
─────────────────────  Today  ─────────────────────   DayDivider: text-2xs 600 --ev-text-2,
                                                       hairline rules, py-2
(N) Nora                                               name line: text-xs 600 --ev-ink
┌──────────────────────────────┐                       Avatar size="sm" 24px, top of group,
│ I still haven't had my       │  ◄ --ev-bubble-in     inline-start; first bubble squares
│ refund.                      │    rounded-ss-sm      the corner nearest the avatar
└──────────────────────────────┘
┌──────────────────────────┐                           gap-1 within the group
│ It's been three days.    │ 08:52                     time: last bubble always; others on
└──────────────────────────┘                           hover/focus-within + visually hidden

                                  Sarah (you)  (S)     operator group mirrors: inline-end,
              ┌────────────────────────────────┐       --ev-bubble-out, ink --ev-bubble-out-ink,
              │ Checking that for you now.     │       rounded-se-sm on the first bubble
              └────────────────────────────────┘
                                 08:57  Delivered      delivery: text-2xs --ev-text-2, newest
                                                       outbound only (§8.6.6, R10)
┃ Internal note · Sarah · 08:55 · Not sent to the customer      NoteBlock: full width,
┃ Billing shows the escrow is stuck.                            --ev-note ground, 3px
                                                                --ev-note-bar inline-start
                                                                edge, radius 8, no avatar
              Sarah claimed this conversation · 08:58           SystemLine: centred text-2xs
                                                                --ev-text-2, no rule, no ground
```

| Element | Rule |
|---|---|
| Group | consecutive messages, same `authorId`, same `visibility === 'customer'`, each within 5 min of the previous, no divider or system line between. One avatar, one name line per group |
| Day divider | before the first message of each calendar day in the operator's zone: `inbox.thread.today`, `inbox.thread.yesterday`, else `formatDate(style 'day-month')`, with the year appended only outside the current year |
| Customer | inline-start, `--ev-bubble-in`. Only `--ev-ink` text inside a bubble (`--ev-text-2` fails AA on both tints, §9) |
| Operator | inline-end, `--ev-bubble-out`, text `--ev-bubble-out-ink`. Name line `inbox.thread.you` for self |
| Note | never a bubble, never aligned, no avatar. Header `text-2xs`: `conversations.thread.internal` as a neutral `StatusBadge` · author · time · `conversations.thread.notSent`. No delivery position (§8.6.2) |
| System | `authorKind === 'system'`: centred, no ground, no avatar, time after a `·`. No rule: the rule belongs to the day divider so the two never read as one shape (R5-11's principle) |
| Channel change | `conversations.thread.sentBy` as a `text-2xs` line above the first bubble on the new channel (§8.6.5) |
| Failed | outline bubble (1px `--ev-hairline-control`, no ground), line in `--ev-ink`, `Send again` / `Add an email address` — §4.6 |
| Attachments | a chip under the bubble; there is no attachment control in the composer (§10 row 9) |
| Typing | `conversations.typing`, `text-xs` `--ev-text-2`, `aria-live="polite"`, pinned above the composer |

### 4.3 Scroll, unread, the pill

- Opens scrolled to the bottom. `Load earlier messages` at the top (`Button secondary xs`),
  prepend preserves the scroll anchor.
- A new message auto-scrolls only when the thread is within 40px of the bottom. Otherwise a
  pill appears centred 12px above the composer: `Button variant="secondary" size="xs"`,
  `MoveDownIcon` + `inbox.thread.new#one/#other`, elevation `--ev-shadow-2`, `aria-live`
  polite, `aria-label` `inbox.thread.new.label`. Pressing it scrolls to the bottom and
  clears it; reaching the bottom by scrolling clears it too.
- Opening a conversation calls `markConversationRead` and clears the row's dot at once; the
  `conversation.updated` event confirms. While selected, an inbound message marks read when
  the thread is at the bottom; when the pill is showing, reaching the bottom marks it. The
  selected row therefore never shows unread. Opening never claims (§4.2 / AC-200).

### 4.4 Pane states

| State | Thread | Composer |
|---|---|---|
| No selection (`/support/contact-centre`) | one grey sentence centred: `inbox.thread.noSelection`. No auto-select: selecting marks read, and nobody read it | absent |
| Content | §4.2 | normal |
| Empty (`CNV-107`) | `conversations.thread.empty`, one grey sentence | normal, fully enabled |
| Loading | three skeleton bubbles alternating sides, `aria-busy`; header renders from the list row | rendered, disabled, no reason line |
| Error | `ErrorState scope="card"` `conversations.thread.error` + retry | disabled: `conversations.composer.threadError` |
| Domain states | §4.5, with `Grab` read as `Claim` | |

### 4.5 Domain states — the ones that are actually the job

| State | Fixture | Thread | Composer | Rail / header |
|---|---|---|---|---|
| **Unclaimed** | `CNV-101` | normal, read-only | disabled: `Grab this conversation before replying.` | header primary is `Claim` |
| **Claimed by another operator** | `CNV-103` (`USR-3`, fresh) | normal, read-only | disabled: `Yousef Al-Balawi is handling this conversation.` | `Take over` (confirms, names the holder — **AC-940**) |
| **Claim gone stale** | `CNV-112` (idle 42 min) | normal | disabled, same as unclaimed | `Claim` — a stale claim is already free |
| **At the concurrent cap** | 3 live chats held | normal | — | `Claim` disabled: `You are holding 3 live chats, which is the limit.` (**D22**, **AC-967**) |
| **Closed** | `CNV-109` | normal | disabled: `This conversation is closed. Reopen it to reply.` | header primary becomes `Reopen` |
| **Snoozed** | — | normal | normal | rail shows `Snoozed until 14:00`; **both clocks paused** (D22) |
| **First-response breached** | `CNV-104` | normal | normal | **R5a leading-edge marker** on the list row; the page banner belongs to the queue, not to the thread |
| **Resolution breached** (>20 min) | — | normal | normal | **`Create ticket` becomes the first visible ghost.** It does not reorder and it is not an escalation (**D22**, **AC-964**, §10 row 8) |
| **A message failed** | `CNV-104`, `CNV-110` | §4.6 | normal | — |
| **64 messages, one page** | `CNV-108` | `Load earlier messages` at the top; the rail says `64 messages` from `messageCount`, never `messages.length` (**AC-938**) | normal | — |
| **No write permission** | — | normal, read-only | fully disabled, §5 | `Claim`, `Transfer`, `Create ticket`, `Close` all disabled, all describing the **one** sentence |
| **WhatsApp** | `CNV-105` | normal | **absent** — `WhatsApp isn't connected yet. This conversation is read-only.` | no compose control anywhere (**AC-948**) |
| **Phone** | `CNV-106` | normal, every message internal | **note register only**; the `Reply` segment is absent | `A call has no message to send. Log a note instead.` |
| **Realtime gap** | `seq` gap on reconnect | refetch; no message missing (**AC-946**) | unchanged | no banner — a reconnection that healed itself is not an event |

### 4.6 A failed message — the state this screen exists for

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
  `Restored from a message that didn't send.` The seam has no retry operation and this is the
  honest behaviour until it does.
- `Add an email address` — **only** when `failureCode === 'no_handle'`. Opens the 360° profile
  layer (`?entity=RDR-1041`). It is the actual fix; offering only `Send again` loops the
  operator through a refusal they cannot clear from this screen.
- A message in `sent`, `delivered` or `read` offers neither (**AC-945**).


## 5. The composer

Docked at B's foot, `--ev-surface`, 1px `--ev-hairline-control` border, radius 8, `mx-4 mb-2`.

```
┌─────────────────────────────────────────────────┐   Reply register
│ [ Reply ]  Internal note                        │   Tabs on the top edge, 32px, selected =
│─────────────────────────────────────────────────│   --ev-bg2 fill + weight 600 (tabs.tsx)
│ Write a reply…                                  │   Textarea, no inner border, 2 rows min,
│                                                 │   grows to 8 (`field-sizing-content`,
│─────────────────────────────────────────────────│   max-h 8 × 24px), then scrolls
│ [Insert template] [Reply by email]     [ Send ] │   toolbar 40px: ghost xs, Toggle outline,
└─────────────────────────────────────────────────┘   Send = default, inline-end
  Enter sends · Shift + Enter adds a line              text-2xs --ev-text-2, outside the surface

┃┌────────────────────────────────────────────────┐   Internal note register
┃│  Reply  [ Internal note ]                      │   whole surface --ev-note; 3px
┃│────────────────────────────────────────────────│   --ev-note-bar inline-start edge, the
┃│ Write a note for your team…                    │   same two carriers the NoteBlock wears
┃│                                                │
┃│────────────────────────────────────────────────│
┃│ [Insert template]                  [ Add note ]│   Reply by email absent in this register
┃└────────────────────────────────────────────────┘
  Only your team can see this. Enter adds the note · Shift + Enter adds a line.
```

| Element | Component | Notes |
|---|---|---|
| Register | `Tabs` restyled: `TabsList` flush to the surface's top edge, `TabsTrigger` 32px, `←`/`→` between tabs | §8.6.2's five non-colour carriers stay; `--ev-note` is a sixth, added, not substituted |
| Field | `Textarea` `rows={2}`, `field-sizing-content`, `max-h` 8 lines, transparent ground, focus ring on the composer surface (`focus-within`) | placeholder blank while refused |
| `Insert template` | existing `TemplatePicker` trigger as `Button ghost` (`default`, 32px: `xs` is 11px in Latin) with `FileTextIcon` | surface `chat` / `email`; present in both registers; absent on phone (no surface) |
| `Reply by email` | `Toggle variant="outline"` (`default`, 32px, one height with `Insert template`) `aria-pressed` | §8.6.5: only on `chat`; refusal on the toggle with `conversations.composer.noHandle` |
| Attachment slot | **not rendered** in v1 | see §10 |
| `Send` / `Add note` | `Button variant="default" size="sm"` | the only filled button on the screen while held (AC-CC-09); disabled while empty with no reason |
| Refusal line | `<p id=…>` `text-xs` `--ev-text-2` under the surface, once | §8.6.3 / §8.6.8: real text beneath, never in the placeholder |
| Phone | `Internal note` tab only | `conversations.composer.phone` |
| WhatsApp | no composer; `conversations.composer.whatsapp` in its place | D19 |

Sending, rejection, `Send again` (§4.6), the keyboard line and drafts are governed by §8.6 and D16a
verbatim. Draft per conversation and register, in memory only, indicated nowhere.

### 5.4 The register is unmistakable (AC-CC-11)

Six carriers at once, none colour alone. (1) The register is a wide segmented pair on the
composer's top edge, icon plus full label: `Reply to {name}` (send icon) and `Internal note`
(eye-off icon); the active segment shares the composer surface's colour so it reads as the tab
of the card beneath it. On a long name the name is its own span with `truncate` inside a
`min-w-0` trigger; the verb and the icon are `shrink-0`; `Internal note` is `flex-none` at its
natural width so the reply tab takes the rest and an ordinary name never elides; the trigger's accessible name stays the full `inbox.composer.label` string. No
Reply-only form, no first-name form. (2) In the note register the whole surface and the field move to
`--ev-note` with the 3px `--ev-note-bar` inline-start edge; there is no pale field inside a
tinted card. (3) A standing label line between the tabs and the field states the consequence:
`Sent to {name} by {channel}` / `Internal note. Not sent to the customer.` with the icon; always
rendered. (4) Placeholder: `Write a reply to {name}…` / `Write an internal note…`. (5) Reply
sends with the filled `Send`; a note is added with a secondary `Add note`, so a filled button on
this screen always means the customer will see it. (6) After a note is added the register
returns to Reply; the key hint reads `Enter sends to {name}` / `Enter adds an internal note`.
`Ctrl/⌘+Shift+N` toggles the register; the change is announced through `useAnnounce`. Opening
another conversation lands on Reply unless a note draft exists for it. Tests: the label line per
register; the note register has no filled button. Harness: capture CNV-102 in both registers.

## 6. Pane C — context

Cards `Card` on `--ev-surface`, gap 12, `p-3`. Order and why: **Customer** (the only links
out), **This conversation** (what decides the next act), then two collapsed sections.

| Card | Rows | Component |
|---|---|---|
| Customer | avatar + name (link to 360°) · `entityId` in `<bdi>` · one row per channel handle in `handles`, `<bdi>` · plan and city only if the resolved profile summary carries them (never an em dash, R5-1) · `inbox.customer.open` and `conversations.ticket.create` as `Button ghost xs` | `CustomerCard` |
| This conversation | the running clock(s): `conversations.promise.firstResponse` row only when `firstResponseDueAt` exists, resolution row when `slaDueAt` exists, snoozed → `conversations.rail.snoozed` and both rows paused · reason code · `conversations.ticket.linked` / `conversations.ticket.overdue` (AC-964) · holder: `OwnerChip` with `queue.release` / `queue.takeOver` · `conversations.thread.count` from `messageCount` | `ThreadCard` |
| Elsewhere in the console | `Collapsible`, heading `inbox.rail.elsewhere` + neutral `StatusBadge` count | `ElsewhereCard` inside |
| History | `Collapsible`, heading `conversations.rail.history` + count; rows `conversations.rail.opened/claimed/handover`; empty `inbox.rail.history.empty` | `HistoryCard` |

Collapsed state per section and the rail's own collapse are D16 class 2 (`clients/preferences`).
The collapsed rail is a 40px strip with one `Button ghost` icon-only control at its top
(`inbox.rail.show`, tooltip names it per §5.7; directional chevron via `directionalIcon`).
States: loading = three skeleton lines per card; error per card = one sentence
`inbox.rail.error` + `Try again`; empty per section = its one sentence.

## 7. Keyboard and focus

| Key | Where | Does |
|---|---|---|
| `j` / `k` | focus in A or B, not in an editable field | move focus to the next / previous row (roving, wraps at neither end); does **not** select |
| `Enter` | on a focused row | selects (navigates) and moves focus to the composer field; when the composer is refused, focus goes to the thread region |
| `Esc` | in the composer field | blur to the selected row in A; does not clear the field |
| `Esc` | in A | clears the checked set if any, else nothing |
| `c` | anywhere in the inbox, not in a field | `Claim` / `Take over` for the selected conversation (take-over still confirms) |
| `r` | same | focus the composer in the `Reply` register (`Internal note` on phone) |
| `x` | on a focused row | toggle its checkbox |
| `←` / `→` | on the register tabs | switch register (mirrored by the primitive) |
| `⌘/Ctrl + K` | untouched | shell |

Single-key shortcuts never fire while focus is in an `input`, `textarea` or `contenteditable`
(`GlobalSearch.tsx:149` uses modifiers only, so nothing collides). Focus order: search →
folders → rows → thread header actions → thread → composer tabs → field → toolbar → `Send`
→ rail. Every clickable thing is `<a>` or `<button>`; `outline-none` only with
`focus-visible:ring-*`.

## 8. Arabic (§9)

Everything mirrors through logical utilities: A on the right, C on the left, customer bubbles
on the right, operator bubbles on the left, `Send` at inline-end (the left), the R5a and
selection edges via `inset-inline-start`. Does not mirror: the `↓` on the pill (vertical),
`08:52` and `11m 20s` (numeral runs, `<bdi>`), `CNV-104`, `+966…`, `nora@example.com`
(`<bdi>`), `j`/`k` (physical keys). Counts through `formatCount`; plural keys carry all six
CLDR categories on the Arabic side. Pane widths do not grow in Arabic; B absorbs the 40px
the shell takes. Harness route `ar` asserts bubble sides and `Send`'s edge (AC-CC-10).

The rules, thing by thing:

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
| The Arabic dictionary | Every string must resolve through `t()` — a hardcoded English literal in JSX is invisible until the day the dictionary fills. |

## 9. Tokens — proposals for the token steward

All five colours are new `--ev-*` entries in `globals.css`, light and dark, mapped into no
shadcn slot. Ratios are against the token that sits on them; the steward re-derives.

| Token | Light | Dark | Clears |
|---|---|---|---|
| `--ev-bubble-in` | `#eaeef2` | `#232a33` | `--ev-ink` 15.0:1 / 12.3:1; 1.17:1 over `--ev-bg` light, 1.23:1 dark |
| `--ev-bubble-out` | `#e2ede9` (`--ev-brand` 12% on white) | `#27423c` (`--ev-brand` 24% on `--ev-surface`) | `--ev-bubble-out-ink` 14.6:1 / 9.5:1 |
| `--ev-bubble-out-ink` | `#171a21` (= `--ev-ink`) | `#e6f2ec` | as above |
| `--ev-note` | `#faf7ef` | `#26231a` | `--ev-ink` 15.7:1 / 13.2:1; `--ev-text-2` 4.52:1 / 6.3:1 (the note header line) |
| `--ev-note-bar` | `#9a8a4e` | `#c2ad63` | 3.2:1 / 7.1:1 non-text against `--ev-note` |

`--ev-note` is a warm neutral, deliberately not `--ev-amber-lt`: a note is not a warning (R17)
and the banner tint must keep one meaning (R14's principle). Dimension tokens are §2's three.
No new radius: bubbles use `--ev-radius-card`; the squared corner is `--radius-sm`.

## 10. Deviations and conflicts resolved

| # | Departure | From | Why |
|---|---|---|---|
| 1 | Three-track full-height grid, no `DetailPage` | §6.4 has no row; §2.2's shape | R4-2's master–detail shape extended by one track. F-12-1 asks §6.4 for a row |
| 2 | List rows are 60px | an earlier draft asked for 56 | `--ev-row-h-media` is the two-line row token; 56 is off the token set (rule 1). Harness probe: ≥ 8 rows at 800px with folders expanded, ≥ 11 collapsed |
| 3 | Panes are 272 / 272 | an earlier draft asked for 300 / 320 | the content region is 976px, not the full 1280 |
| 4 | Bubble radius 8 | an earlier draft asked for 12 | no 12px radius token, and this screen mints no new radius |
| 5 | Delivery word in `--ev-text-2`, not the bubble's tint | an earlier draft tinted it | §8.6.6 fixes the colour |
| 6 | Refusal as real text beneath, not in the placeholder | an earlier draft used the placeholder | §8.6.3; a placeholder is not real text and is not reachable by `aria-describedby` |
| 7 | System line has no rule | an earlier draft gave it one | §8.6.2 shape; the rule is the day divider's carrier |
| 8 | `Create ticket` on a resolution breach is the first visible ghost, not filled | **D22**, AC-964, §4.5 | §3.9 / CLAUDE.md rule 6: one filled button per screen, and §8.6 gives it to `Send`. The prompt still renders (`conversations.ticket.overdue` in C). **Owner decision Q-CC6** |
| 9 | No attachment control | an earlier draft had one | D19's reasoning: a control for a pipe that does not exist; §11.2 would cost a second reason line. Slot reserved before `Reply by email`. **Q-CC7** |
| 10 | Bubble time on hover/focus-within plus visually hidden | §7.3 hover-only | the group's last time is always visible and bounds the rest within 5 min; AT gets every time |
| 12 | Snoozed: `Create ticket` alone visible, `Transfer` · `Close conversation` · `Snooze until…` in `⋯` | §4.1's first draft (`Transfer` · `Close conversation` visible, `Create ticket` in a `⋯` of one) | D8-b: a `⋯` of one may not exist and three labelled ghosts leave the identity 0px at 1280 in English. Changing the wake time is a real act on a snoozed conversation (`snoozeConversation` sets a new `snoozedUntil`), so the `⋯` holds three and nothing is withheld; row 8 keeps `Create ticket` the first ghost |
| 14 | Line 2 yields in order: the channel word goes `sr-only` when it cannot show whole, then the status badge hides, never the clock | §4.1 anatomy | The glyph beside it carries the channel; a word cut to one letter is decoded, not read (§5.7). The clock is the one fact that decides the next act |
| 13 | The compact header has no avatar | §4.1 anatomy (avatar 32) | Below `--ev-bp-compact` the back arrow, `Claim`, `⋯` and `Details` leave the identity 78px, under the running clock's own width; the clock is never clipped (V-1), so the one decorative element yields |
| 11 | Held by you: `Transfer` alone visible, `Snooze until…` in `⋯` | §4.1's first draft (`Transfer` · `Snooze until…` visible) | D8-b: on a chat the `⋯` would hold two (Create ticket · Close) and must not exist, and four labelled ghosts do not fit beside the identity in 432px (V-1). Moving `Snooze until…` in makes the `⋯` three. D8-c's discipline applied to a header: the lane shrinks before anything hides |

Nothing here spends a sixth badge tone, a red badge, a new radius or a physical edge.

## 11. Owner decisions — defaults the build follows

| Q | Recommendation, adopted as default |
|---|---|
| Q-CC1 | Dark is a first-class theme. Every token in this file states a light and a dark value, and the harness captures both |
| Q-CC2 | Brand tint on the operator bubble, §9 values. It is the one place the brand colour earns its keep |
| Q-CC3 | The route carries no `QueueTable`. Conversation volume is a report on the Overview board |
| Q-CC4 | Already answered by D22: `firstResponseDueAt` is populated on every non-phone row, chat at 45 s. The `No clock` row was a fixture defect; the pill shows the running clock and a missing clock renders nothing |
| Q-CC5 | `@tanstack/react-virtual`, headless, engaged above 200 rows only; `inbox.list.end` renders after the last row either way |
| Q-CC6 | `Create ticket` first visible ghost on a resolution breach, never filled (§10 row 8) |
| Q-CC7 | No attachment control until the storage seam exists (§10 row 9) |

## 12. Copy — every new string, `inbox.*`

Reused unchanged: every `conversations.composer.*`, `conversations.thread.*`,
`conversations.delivery.*`, `conversations.transfer.*`, `conversations.snooze.*`,
`conversations.close.*`, `conversations.empty.*`, `conversations.error.*`,
`conversations.rail.*`, `conversations.promise.*`, `conversations.channel.*`,
`conversations.status.*`, `conversations.cap.*`, `conversations.typing`,
`view.conversations.*`, `queue.claim`, `queue.release`, `queue.takeOver*`,
`queue.owner.heldBy`. New keys, English final; Arabic under `src/i18n/ar/inbox.ts`:

| Key | English |
|---|---|
| `inbox.search` | `Search by name, ID or message` |
| `inbox.search.clear` | `Clear search` |
| `inbox.folders.label` | `Folders` |
| `inbox.folders.show` | `Show folders` |
| `inbox.folders.hide` | `Hide folders` |
| `inbox.list.label` | `Conversations` |
| `inbox.list.end` | `That's every conversation in this folder.` |
| `inbox.row.yours` | `Yours` |
| `inbox.row.select` | `Select the conversation with {name}` |
| `inbox.row.age` | `Last message {age}` |
| `inbox.thread.label` | `Conversation with {name}` |
| `inbox.thread.noSelection` | `Select a conversation to read it.` |
| `inbox.thread.today` | `Today` |
| `inbox.thread.yesterday` | `Yesterday` |
| `inbox.thread.you` | `{name} (you)` |
| `inbox.thread.sentAt` | `Sent at {time}` |
| `inbox.thread.new#one` | `1 new` |
| `inbox.thread.new#other` | `{count} new` |
| `inbox.thread.new.label` | `Scroll to the newest message` |
| `inbox.thread.system` | `{body} · {time}` |
| `inbox.header.more` | `More actions` |
| `inbox.header.back` | `Back to conversations` |
| `inbox.header.details` | `Details` |
| `inbox.composer.label` | `Reply to {name}` |
| `inbox.rail.show` | `Show details` |
| `inbox.rail.hide` | `Hide details` |
| `inbox.rail.elsewhere` | `Elsewhere in the console` |
| `inbox.rail.error` | `This card did not load. Try again.` |
| `inbox.rail.history.empty` | `No claims or transfers yet.` |
| `inbox.customer.open` | `Open profile` |
| `inbox.customer.plan` | `Plan` |
| `inbox.customer.city` | `City` |

Checks: sentence case; buttons are verbs; no exclamation, no emoji, no em dash (rule 12);
sentences take a period, fragments do not (R6); no toast is added (R10 — a send, a read
and a scroll are not events); no string is concatenated at a call site; no `defaultValue`.

### 12.1 The thread and composer vocabulary, in full

These are the `conversations.*` strings the thread and composer render. They are final.

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
| `Claim`, at the cap | `You are holding 3 live chats, which is the limit.` (D22) |
| Send rejected, 409 | `This conversation was closed. Reopen it to send.` |
| Send rejected, network | `Your message didn't send. Try again.` |
| Load more | `Load earlier messages` |
| Rail, message count | `{count} messages` |
| Rail, snoozed | `Snoozed until {time}` |
| Transfer dialog | title `Transfer to {name}?` · body `They own this conversation from the moment you transfer it. This can't be undone.` · primary `Transfer` |
| Take-over dialog | title `Take over from {name}?` · body `{name} keeps their other conversations. This is recorded in the history.` · primary `Take over` |

Sentence case throughout. Every button is a verb or verb + object. No exclamation marks, no
emoji, no "successfully", no "please", no "invalid", no "failed to". Full sentences take a
period; fragments, labels and the delivery words do not (**R6**). No string is built by
concatenation — every one is a whole dictionary template.

**There is no toast on send** (§8.6.3, R10). The message in the thread is the confirmation, and
it is a better one: it persists, it carries the delivery state, and it is where the operator is
already looking.

## 13. Acceptance criteria

| # | Criterion |
|---|---|
| **AC-CC-01** | The dark-theme contrast probe in `scripts/harness/support-inbox.mjs` passes AA on every text node of the list, thread and note routes. |
| **AC-CC-02** | No element uses the badge silhouette as a control: `role=button` inside `[data-slot=badge]` is zero on every inbox route. |
| **AC-CC-03** | No operator-facing text on an inbox route renders below 12px (`text-2xs`). |
| **AC-CC-04** | The conversation list stays on screen while a thread is open at 1280px. |
| **AC-CC-05** | Consecutive messages from one sender within five minutes render as one group with a single timestamp, and a day divider separates days. |
| **AC-CC-06** | Customer and operator bubbles differ in ground *and* side; an internal note is never a bubble. |
| **AC-CC-07** | Opening a conversation clears its unread state and the list row reflects that without a refetch. |
| **AC-CC-08** | `j` and `k` move row focus, `Enter` opens the focused row, and `Esc` leaves the composer for the selected row — none of them firing while focus is in a field (§7). |
| **AC-CC-09** | The composer's `Send` is the only filled button on the screen while the operator holds the conversation. |
| **AC-CC-10** | The Arabic build mirrors every bubble side and keeps `Send` at the inline-end. |
| **AC-CC-11** | The register is unmistakable: an operator can never send a note as a reply, or a reply as a note, without having seen which register is active (§5.4). |


## 14. Handoff

**frontend-engineer.** Build §2–§8 against `08-eyvar-patterns.md` §8.6; the domain states are
§4.5. Decisions that are yours: the virtualiser's row-measurement strategy;
whether `field-sizing-content` needs a JS fallback for the harness browser; how the
`x`-checked set survives a folder change (recommend: it does not). Add `size="xs"` (20px)
to `ui/avatar.tsx` and a channel-glyph corner slot; register four channel icons (chat,
email, phone, WhatsApp) in `icons.ts`, none of which exist today. `@tanstack/react-virtual`
is headless; note it in the handoff as an arrival.

**utilities-engineer.** Three helpers with three call sites each: `groupMessages(messages,
{ windowMs: 300_000 })` returning day → group → message (thread, the harness probe, the
future digest); a relative-age formatter for the row and the header (`formatDate` has no
relative style today; the list, the rail history and the presence roster all need one); and
`useStickToBottom(ref)` returning `{ atBottom, pendingCount, scrollToBottom }` for §4.3.

**mock-data-engineer.** `lastMessageAuthorKind` on `Conversation`; `markConversationRead`;
`firstResponseDueAt` on every chat row per D22; a resolved profile summary with plan and city
or an explicit absence.

**token steward.** §9's five colours and §2's three dimensions.

**product-owner.** Q-CC6, Q-CC7, and F-12-1: §6.4 needs a *three-pane inbox* row so the next
inbox (Safety's incident feed is the candidate) does not re-derive this file.
