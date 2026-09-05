# Contact Centre — full redesign plan

**Scope:** Support › Contact Centre (`/support/contact-centre`, the queue and the conversation
pane), the composer, and the systemic visual defects the same screenshots show on Safety and
Finance › Pricing. **Status:** proposed, 2026-09-05. **Owner decisions needed:** §9.
**Precedence:** `docs/RULINGS.md`, then `DESIGN.md` §8.6 / D19 / D22, then this plan.

Read alongside `SUPPORT-UX-PLAN.md`, which put the data right (one thread per ticket, claims,
SLA clocks, snooze, typing, templates). This plan is about the *shape* of the console: what
landed sits on the wrong skeleton, and no amount of polish on that skeleton reads as a chat.

---

## 0. The verdict, in one paragraph

The pane is a **record page wearing a chat's data**. It is built on `DetailPage` (main + rail),
so a conversation opens the way a dispute opens: a page title, a page header's button row, a
thread rendered as a stack of bordered cards, and a rail of four equal cards. Nothing in it
says *people are talking*: no sender identity beside a message, no grouping by sender, no day
breaks, no unread state, no list of the other conversations while you answer this one. The
composer is a bare textarea under two chips that look like buttons. In the dark theme the card
surface sits 1.075:1 above its ground (`globals.css:1746`), so every edge is a hairline border
and every block of text is grey on near-black. The Safety record and the Pricing rate cards
show the same causes, which is why "the whole system feels wrong": the causes are systemic
(§3), and the Contact Centre is where they hurt most because a chat is the one surface in the
product that must not look like a form.

---

## 1. Diagnosis, screen by screen

### 1.1 The conversation pane (`ConversationPane.tsx`, 1128 lines)

| What the screenshot shows | Why it is wrong | Root cause in code |
|---|---|---|
| Customer's message is a grey box, operator's is a bordered box, the note is a wider grey box with a small caption | No visual grammar of *who is speaking*. Every message is a card. Alignment is the only cue, and it is subtle | `MessageRow` at `ConversationPane.tsx:757` draws every message as `rounded-lg border p-3`, three variants of the same card |
| Sender and time float *under* the bubble as one grey line | Identity is an afterthought; a run of five messages needs five re-reads to know who said what | No sender cluster (avatar or initials + name) beside the bubble; no grouping of consecutive messages by the same sender |
| No day or session breaks; the whole thread is one list | An operator cannot tell today's messages from last week's | Thread is a flat `<ol>`; no divider element |
| `Delivered` sits alone under the last outbound message in 11px grey | The only delivery word (R10, correct) is invisible in dark theme | `text-2xs text-muted-foreground` on `--ev-bg2` |
| The header is a page title with four action buttons and two badges | It is a record header, not a conversation header. `Create ticket` as the filled primary says the main job here is raising tickets, not answering | `PageHeader` with `primaryAction` / `secondaryActions`; primary precedence puts `Create ticket` first once a clock has breached |
| `Reply` / `Internal note` are chips above the field; `Reply by email` / `Insert template` are chips below | Chips read as badges, not controls (R7 says a badge is never a control; these look like badges) | `ToggleGroup` and `Toggle` styled `variant="outline"` at 28px, same silhouette as the status badges |
| The field is a 3-row textarea with a placeholder, the `Send` button is a bare word at the end | A composer is the one control the screen exists for (design 11 §1) and it has the least presence of anything on the page | `Textarea` + `Button` with no composer chrome, no attachment affordance, no character or channel context |
| The rail is four equal cards: Customer, This conversation, Elsewhere, History | Everything competes; the SLA clock (the one thing that decides what you do next) is a line inside card two | Rail array in `ConversationPane.tsx:605`; each card is a `Card` at the same weight |
| `First-response deadline · No clock` on a chat | A chat's first reply is the promise that matters; showing *No clock* under it says the product does not know its own rule | Chat conversations are seeded without a first-response target; the pane prints the absence instead of hiding the row |
| You cannot see the queue while answering | Every other chat tool keeps the list beside the thread; here the pane replaces the queue (`openRecord`, `ConversationConsoleScreen.tsx:374`) and `Back` is the only way home | Level-3 route mounts `DetailPage`; the queue is a separate `QueueTable` render |

### 1.2 The queue (`ConversationConsoleScreen.tsx`, 1191 lines)

It is a `DataTable` of seven columns: conversation, channel, status, SLA, ticket, owner,
actions. Correct for a work queue; wrong for an inbox. An inbox row is a person, a channel
glyph, a preview of the last message, how long they have waited, and whether it is yours. Ours
carries `CNV-104` ids, a `Ticket` column that is mostly `TKT-`/absent, and an owner chip with a
`Claim` button inside a cell. It has no unread state at all.

### 1.3 The Safety record and the Pricing rate cards (same causes)

- **Hairline everything.** Cards on `--ev-surface` (#1a1f26) over `--ev-bg2` (#101319): the
  eye finds the border, not the surface. Every rate card and the Protocol card are outlines.
- **Chips as buttons.** `High`, `Acknowledged`, `Live`, `Draft`, `Approve`, `Mine 2`, `Online`,
  `On call: …` share one 24–28px pill silhouette in the top bar, in headers and in cards. Half
  are controls, half are badges. The eye cannot tell.
- **Type too small for the ground.** 11–12px grey (`text-2xs`, `text-xs text-muted-foreground`)
  is the dominant size on all three pages. On white it is dense; on #101319 it is unreadable.
- **Key/value grids drawn as tables.** The rate card's five numeric columns are a table with no
  rules, no zebra and no row hover, so the Economy/Comfort rows read as floating numbers.
- **Header action cluster.** `Close` (ghost, disabled, with a 10px reason beneath) beside a
  green `Claim` primary on the incident, four buttons on the conversation. Primary precedence
  is right by the rulings but the *rendering* gives the disabled ghost as much width as the
  primary.

The Finance pages get their own pass (not this plan); Phase A below fixes the causes they share.

---

## 2. Target: an inbox, not a record

Three panes, one route, the list never leaves the screen. This is the Intercom / Front / Help
Scout skeleton, kept inside Eyvar's rules (D19 pull queue, D22 cap, §8.6 register switch, R7
badges, R10 one surface per event).

```
┌────────────┬──────────────────────────────────────────┬──────────────────┐
│ A · List   │ B · Thread                                │ C · Context      │
│ 300px      │ flex                                      │ 320px, collapses │
│            │ ┌──────────────────────────────────────┐ │                  │
│ ▸ folders  │ │ header: Nora Al-Harbi · chat · 🟢 mine│ │ Customer         │
│   Unassg 5 │ │ SLA pill  [Transfer][Snooze][⋯][Claim]│ │ This thread      │
│   Mine   2 │ ├──────────────────────────────────────┤ │ ▸ Elsewhere (3)  │
│   Waiting  │ │ ── Today ──                           │ │ ▸ History        │
│   ...      │ │ (N) Nora        08:52                 │ │                  │
│ ▸ rows     │ │     ┌ bubble ─────────────┐           │ │                  │
│  ● Nora    │ │     └─────────────────────┘           │ │                  │
│    chat 2m │ │            08:57   Sarah (you)  (S)   │ │                  │
│    "My sub…│ │           ┌─────────── bubble ──┐     │ │                  │
│  ○ Tariq   │ │           └─────────────────────┘     │ │                  │
│    email   │ │                        Delivered      │ │                  │
│            │ │ ┃ Internal note · Sarah · 08:55        │ │                  │
│            │ │ ┃ Billing shows …                      │ │                  │
│            │ │ Nora is typing…                       │ │                  │
│            │ ├──────────────────────────────────────┤ │                  │
│            │ │ [Reply | Note]  ┌────────────────────┐│ │                  │
│            │ │                 │ Write a reply…     ││ │                  │
│            │ │ ⎘ template  📎  └────────────[Send ▸]┘│ │                  │
│            │ │ Enter sends · Shift+Enter new line    │ │                  │
└────────────┴──────────────────────────────────────────┴──────────────────┘
```

### 2.1 Pane A — the list

- **Folders** are the six views the route table already declares (Unassigned · Mine · Waiting
  · Active · Snoozed · Closed), as a vertical list with live counts, not a tab strip. The
  current `?view=` param keeps working; the folder is the same state.
- **A row is a person.** 56px: initials avatar with a channel glyph at its corner, name,
  relative wait time at the end, one-line preview of the last message (customer's in regular,
  ours in muted), and at most one pill: the SLA state (`overdue 2m`, `due 4m`) or nothing.
  Unread rows carry a dot and a bold name. Owner shows as a 16px initials disc, not a chip.
- **Sort** is the queue's urgency (breached first, then nearest clock). Search sits at the top
  of the pane and matches name, handle, id and message text.
- **Selection** is the route (`/support/contact-centre/:id`), so the pane persists across
  reloads and deep links. `j`/`k` move the selection while focus is in the list; `Enter`
  focuses the composer; `Esc` returns focus to the list.
- **Bulk** stays: checkboxes appear on hover / with `x`, and the existing bulk claim applies.

### 2.2 Pane B — the thread

- **Header** (56px): avatar, name as a link to the profile overlay, channel glyph + word, the
  status word, the *running* SLA pill (one, the one that decides), then the actions. The
  primary is **Claim** when unheld, otherwise nothing is filled: `Transfer`, `Snooze until…`,
  `Log a call` (phone), `Create ticket`, `Close` live in a row of ghost buttons with the least
  frequent in `⋯`. A conversation you hold has no filled button in the header because the
  filled button on this screen is **Send** (design 11 §1, R2).
- **Day dividers** (`Today`, `Yesterday`, `24 Jun`) and **sender groups**: consecutive
  messages from one sender within five minutes share one avatar and one name line; each bubble
  shows its time on hover and the last in the group shows it always.
- **Bubbles.** Customer at inline-start on `--ev-bubble-in`; operator at inline-end on
  `--ev-bubble-out` (brand-tinted, not grey); `max-w` 65% of the pane. Bubbles have a 12px
  radius with the corner nearest the avatar squared. No border. System lines (claimed,
  transferred, call logged, snoozed) are centred 12px muted text with a thin rule, never a
  bubble. **Internal notes** are a full-width note block with a `--ev-note` left bar and the
  word *Internal note* in the block, never a bubble (§8.6.2 five carriers stays).
- **Delivery** under the newest outbound only (R10), at 12px in the bubble's own tint, with
  the failed state as a `Send again` button in place (kept).
- **Typing** line above the composer (kept), and **read receipts** as the delivery word
  `Read` (kept).
- **Scroll**: the thread opens scrolled to the bottom; new messages auto-scroll only when the
  operator is already at the bottom, otherwise a `↓ 2 new` pill appears. `Load earlier` stays
  at the top (existing pagination).
- **Composer** docked at the foot with real chrome: a bordered surface on `--ev-surface`, the
  register as **two tabs** on its top edge (`Reply` · `Internal note`) rather than chips, the
  field auto-growing from 2 to 8 rows, a toolbar row with `Insert template`, `Reply by email`
  (where legal) and an attachment slot (future, greyed with reason), and `Send` as the filled
  primary at inline-end. The note register recolours the whole composer surface to the note
  tint so the mistake §8.6.2 guards against is visible at arm's length.
- **Refusals** stay in place (§11.2): a composer you cannot use is dimmed with the sentence in
  the field's placeholder position, not a disabled textarea with the reason beneath.

### 2.3 Pane C — context

- **Customer**: avatar, name, id, handles per channel, plan and city, two links (`Open 360°`,
  `Raise ticket`). One card.
- **This conversation**: the SLA rows only where a clock exists (a chat with no first-response
  target shows the resolution clock alone, never `No clock`), reason code, linked ticket,
  holder with `Release` / `Take over`. One card.
- **Elsewhere in the console** and **History** are collapsed sections with a count in the
  heading, expanded on click and remembered per operator.
- The pane collapses to a 40px strip with icons at 1280px when the operator chooses, and is a
  sheet below the compact breakpoint.

### 2.4 Compact (below the breakpoint)

Pane A is the screen; opening a conversation slides pane B over it with a back arrow; pane C is
a sheet from the header's `Info` button. The composer stays docked to the viewport bottom.

---

## 3. Phase A — the systemic fixes the screenshots share (one week, first)

These land before any chat work and they change every page, so they are their own PR with the
visual-qa harness run on ten routes.

1. **Dark surfaces get elevation.** `--ev-surface` in dark moves from 1.075:1 to ≥1.25:1 above
   `--ev-bg2`, cards drop their border in dark and keep a 1px inner shadow, and the popover /
   drawer tier moves one step further. `design-token-steward` owns it; measured with the
   harness's contrast probe on the rate card, the incident and the pane.
2. **A chip is never a control.** Badge and button diverge in silhouette: badges become 20px,
   uppercase-less, no border, tinted ground; buttons keep 28px with a border or fill. The top
   bar's `Mine 2`, `Online`, `On call` become text buttons with a leading icon, not pills.
3. **Floor the type.** Nothing operator-reading is under 12px; `text-2xs` is allowed only for
   the delivery word and table meta. Muted text in dark moves from 55% to 68% opacity of ink.
4. **Key/value grids.** A numeric grid inside a card (rate card, promises) gets row rules at
   8% and a hover ground, so rows read as rows.
5. **Header action rendering.** Disabled secondaries render at 70% width-weight (ghost, no
   border) so the primary is the only full-weight button; the refusal sentence moves into a
   tooltip-plus-visually-hidden pair only when the header is compact, otherwise stays as text
   but at 12px under the button group, once.

Acceptance: AC-CC-01 the harness's dark-theme contrast probe passes AA on every text node of
the three screenshot routes; AC-CC-02 no element uses the badge silhouette as a control
(`role=button` inside `[data-slot=badge]` is zero); AC-CC-03 no operator-facing text under
12px outside the two allowed cases.

---

## 4. Phase B — the inbox skeleton (two weeks)

Worktree `support/inbox`. New folder `src/screens/support/inbox/` beside the current
`conversations/`; the old screen stays mounted until Phase D flips the route, so nothing
breaks mid-way.

| Deliverable | File | Notes |
|---|---|---|
| Three-pane shell | `InboxScreen.tsx` | Owns the route param, folders, selection, keyboard. `SingleColumnPage` is not used; the inbox is a full-height grid under the top bar |
| List | `ConversationList.tsx`, `ConversationListItem.tsx` | Virtualised above 200 rows (`@tanstack/react-virtual`, add on arrival) |
| Folders | `FolderNav.tsx` | Six views + counts from `getConversationFacets` |
| Thread | `Thread.tsx`, `DayDivider.tsx`, `MessageGroup.tsx`, `Bubble.tsx`, `SystemLine.tsx`, `NoteBlock.tsx`, `DeliveryLine.tsx` | `MessageRow` in the old pane is retired |
| Header | `ThreadHeader.tsx` | Not `PageHeader` |
| Composer | `Composer.tsx` | Rewrite of `MessageComposer.tsx` on the same seam calls and the same draft store |
| Context | `ContextRail.tsx`, `CustomerCard.tsx`, `ThreadCard.tsx` | `ElsewhereCard` reused inside a collapsible |
| Avatar | `src/components/Avatar.tsx` | Promote the shell's initials avatar with a channel-glyph corner slot |
| Tokens | `globals.css` | `--ev-bubble-in`, `--ev-bubble-out`, `--ev-bubble-out-ink`, `--ev-note`, `--ev-note-bar`, light and dark |
| Copy | `inbox/copy.ts`, `i18n/ar/inbox.ts` | Folder names reuse `view.conversations.*`; new keys for dividers, groups, composer chrome |

Seam changes (mock-data-engineer): `Conversation.unreadCount` already exists and becomes the
list's unread state; add `markConversationRead(id)` (`POST /conversations/:id/read`); give
chat conversations a first-response target in the fixture so `No clock` never renders; add
`lastMessageAuthorKind` so the preview can tint ours vs theirs without loading the thread.

Acceptance: AC-CC-04 the list stays on screen while a thread is open at 1280px; AC-CC-05 a
thread of 20 messages from two senders renders as sender groups with one avatar per group and a
day divider between days; AC-CC-06 customer and operator bubbles differ in ground *and* side,
notes are never bubbles; AC-CC-07 opening a conversation clears its unread state and the list
reflects it without a refetch (realtime event); AC-CC-08 `j`/`k`/`Enter`/`Esc` as §2.1;
AC-CC-09 the composer's filled `Send` is the only filled button while the operator holds the
conversation; AC-CC-10 Arabic mirrors every bubble side and keeps the composer's `Send` at
inline-end (harness `ar`).

AC-CC-11 (owner, 2026-09-05): **the register is unmistakable.** An operator must never be
unsure whether the field sends to the customer or adds a note. Six carriers at once, none
colour alone: (1) a wide segmented pair with icon and full label, `Reply to {name}` /
`Internal note`; (2) the whole composer surface, field included, moves to `--ev-note` with the
`--ev-note-bar` edge in the note register; (3) a standing label line between the tabs and the
field states the consequence, `Sent to {name} by {channel}` versus `Internal note. Not sent to
the customer.`; (4) the placeholder changes with the register; (5) the note register has no
filled button, `Add note` is secondary, so a filled button on this screen always means the
customer will see it; (6) after a note is added the register returns to Reply, and the key hint
names the register. `Ctrl/⌘+Shift+N` toggles it and the change is announced.

---

## 5. Phase C — behaviour parity and the pieces the old pane had (one week)

Everything `ConversationPane.tsx` and `ConversationConsoleScreen.tsx` do today must exist in
the inbox before the route flips. Checklist, each a test:

- Claim / release / take-over with the D22 cap and the Owner exemption.
- Transfer with note, Snooze until…, Close with reason, Reopen.
- Create ticket with the party locked; the ticket link in the context rail; S-3 mirroring.
- Log a call on a phone conversation; the system line appears in the thread.
- Reply, internal note, reply by email with the address check, `Send again` on failure.
- Templates, drafts per conversation and register, typing out and in.
- Realtime: message.created, delivery, presence, conversation.updated / queued.
- Empty (`CNV-107`), loading, error and no-match states on all three panes.
- Bulk claim from the list.
- Deep links `/support/contact-centre/:id` and `?view=`.

Acceptance: the existing `conversations.test.tsx` (41 tests) ported to the inbox and green,
plus one test per line above that the old file did not cover.

---

## 6. Phase D — flip and retire (two days)

Route `/support/contact-centre` mounts `InboxScreen`; the old `conversations/` folder is
deleted in the same PR (D5, no hook left behind); the harness route list gains the three panes;
`docs/05-restructure/design/11-conversation-composer.md` is rewritten as `12-inbox.md` with
the frames from the harness as its reference captures; `SUPPORT-UX-PLAN.md` §8.7 points here.

**Status, 2026-09-05: done on `support/inbox`.** `InboxScreen` is the route; `conversations/`
and `contacts/` are deleted, with `sla.ts`, `drafts.ts`, `vocabulary.ts` and the `conversations.*`
copy moved under `screens/support/inbox/`; both harnesses cover the panes; design 11 is a pointer.

---

## 7. Phase E — what a real chat tool has that ours will still lack (backlog, owner to rank)

1. Attachments in both directions (image, PDF) — needs a storage seam.
2. Emoji / quick reactions on the customer side — needs the customer app.
3. Saved replies with variables rendered from the customer record (the template store has the
   text; variables need `renderEmailPreview` wired to the conversation).
4. Assignment rules — explicitly out by D19 (pull queue); revisit only if the owner reverses it.
5. Multi-conversation tabs for one operator (open three chats at once) — the D22 cap makes this
   worth designing; not before Phase D lands.
6. Customer satisfaction after close, reusing the ticket CSAT shape.

---

## 8. Measurements the harness will assert

| Probe | Today | Target |
|---|---|---|
| Panes visible with a thread open at 1280px | 1 | 3 |
| Bubbles with a border | all | 0 |
| Distinct avatar clusters in a two-sender, six-message thread | 0 | 2 to 4 |
| Filled buttons in the thread header while held | 1 (`Create ticket`) | 0 |
| Filled buttons in the composer | 0 | 1 (`Send`) |
| Text nodes under 12px in the pane | 14 | ≤ 2 |
| Dark-theme AA failures on the pane | measured in Phase A | 0 |
| List rows per 800px viewport | 7 (table) | 12 |
| Route changes to answer one chat from the queue | 2 (open, back) | 0 |

---

## 9. Owner decisions

- **Q-CC1 · Dark theme is the primary theme?** The screenshots are dark. Every Navattic
  reference frame is light. If operators run dark all day, D7's colour reference must gain a
  dark frame set, or Phase A's tokens are the reference. Recommendation: Phase A tokens become
  the dark reference, captured by the harness.
- **Q-CC2 · Operator bubble tint.** Brand-tinted (`--ev-brand` at 12% in light, 24% in dark)
  versus neutral. Recommendation: brand tint; it is the one place the brand colour earns its
  keep in the product.
- **Q-CC3 · The list replaces the queue table, or both stay?** Recommendation: replace. A
  table of conversations is a report, and reports live on the Overview board.
- **Q-CC4 · First-response target on chat.** 45 seconds is D22's number. Seed it in the
  fixture and let the pill show it, or keep chat on resolution only.
- **Q-CC5 · Virtualisation dependency.** `@tanstack/react-virtual` (5 KB) or hand-rolled.
  Recommendation: the library, restyled on arrival like a shadcn primitive.
