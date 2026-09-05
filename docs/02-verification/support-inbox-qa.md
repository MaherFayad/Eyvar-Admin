# Support › Contact Centre inbox — behavioural QA verdict

Branch `support/inbox`, base `2e9a192` (engineer's suite of 20), tests at the commit
this file ships with. Spec: `CONTACT-CENTRE-REDESIGN-PLAN.md` §4 (AC-CC-04..11) and §5
(Phase C parity); design `12-inbox.md` incl. §5.x.

| Suite | Result |
|---|---|
| `src/screens/support/inbox/inbox.test.tsx` | **55 passed, 0 failed** (was 20) |
| `src/screens/support/conversations`, `src/shell`, `src/lib/messages.test.ts` | 17 files, **323 passed, 0 failed** |
| `npm run typecheck` (worktree) | clean |

**Runner.** Both suites were run from inside the worktree
(`cd .claude/worktrees/inbox && npx vitest run <path>`). The form named in the brief,
`npx vitest run --root .claude/worktrees/inbox <path>` from the main tree, does not apply
`src/test/setup.ts` in this worktree: every assertion using a jest-dom matcher fails with
`Invalid Chai property: toBeInTheDocument` (first run: 19 failed / 1 passed of 20; final
run: 51 failed / 4 passed of 55, all `Invalid Chai property`). That is a runner fault, not a
screen fault, and it is recorded here so nobody reads it as one. Config and setup files are
byte-identical between the two trees (`diff` clean).

Visual and layout questions (bubble ground, side, radius, pane widths, Arabic mirroring)
are the visual-qa-engineer's; where a criterion below is visual, the test holds the nearest
DOM-level proxy and says so.

---

## 1. Criteria table — AC-CC-04..11

| Criterion | Verdict | Test (in `inbox.test.tsx`) | Note |
|---|---|---|---|
| AC-CC-04 list stays on screen while a thread is open at 1280px | Pass | *AC-CC-04 … renders the list, the thread and the details rail together at 1280px, with the open row current* | `matchMedia` shimmed to the wide breakpoint |
| AC-CC-05 20 messages / 2 senders → sender groups, one avatar per group, divider between days | Pass | *AC-CC-05 … renders one avatar per sender group and a divider between yesterday and today* | **Tightened**: counts the eight group name lines (four `Nora Al-Harbi`, four `Sarah Al-Rashid (you)`) instead of `[data-slot="avatar"]` nodes; the avatar has no accessible name and is decorative |
| AC-CC-06 customer and operator bubbles differ in ground and side; notes never bubbles | Pass (proxy) | *AC-CC-06 … puts the customer at inline-start, the operator at inline-end, and the note in neither* | Ground/side are not perceivable in jsdom; the test holds `data-direction` and the `bg-bubble-in/out` classes and asserts the note carries no bubble. The rendered halves are the harness's (`ar` and light/dark captures) |
| AC-CC-07 opening clears unread; list reflects it without a refetch | Pass | *AC-CC-07 … shows the dot after an inbound message and clears it on open, from the realtime event* | Row keeps the new preview after opening, so it was updated in place |
| AC-CC-08 `j`/`k`/`Enter`/`Esc` per §2.1 | Pass | *AC-CC-08 … moves focus with j and k, opens and focuses the composer on Enter, and returns to the row on Esc* | |
| AC-CC-09 `Send` the only filled button while held | Pass (proxy) | *AC-CC-09 … renders Create ticket and Transfer as ghosts, the rest in More actions, and Send as the one default variant* | "Filled" is read from the button primitive's `data-variant`; the only DOM handle for it |
| AC-CC-10 Arabic mirrors bubble sides, `Send` at inline-end | Pass (static proxy) | *AC-CC-10 … anchors nothing to a physical edge and keeps Send last in its row* | A class-level check for physical utilities plus `ms-auto`; the mirror itself is harness route `ar` |
| AC-CC-11 (1) segmented pair, (3) consequence line, (4) placeholder, (5) no filled button in note register, (6) returns to Reply, key hint names the register | Pass | *AC-CC-11 … states the consequence per register, fills no button in the note register, and returns to Reply after a note* | **Tightened**: the consequence line is asserted as the field's accessible description (how AT reads carrier 3) rather than through a `[data-inbox-composer]` selector; the helper was removed. Waits for the live field before reading the placeholder, which is blank while refused by design (§5) and had been racing the thread load |
| AC-CC-11 `Ctrl/⌘+Shift+N` toggles and is announced | Pass | *AC-CC-11 … toggles the register with Ctrl+Shift+N and announces it* | **Extended**: toggles back and asserts the reply announcement names the customer |
| AC-CC-11 (2) whole surface moves to `--ev-note` | Untestable here | — | Colour; visual-qa-engineer |

The composer's refusals and the four states of each pane (list ×4, thread ×3, rail ×1)
are covered by the engineer's ten tests under *the composer refuses in place…* and
*the four states of each pane*; they were run and pass unchanged, except the phone case
which now reads the note field's description instead of the composer selector.

## 2. Phase C parity — `conversations.test.tsx` (41) → the inbox

### 2.1 Ported (35 new tests)

| Old behaviour | Inbox test |
|---|---|
| AC-939 claim without a confirmation | *claims from the header without a confirmation, and the composer goes live* |
| AC-940 / AC-203 take-over confirms, names the holder | *confirms a take-over and names the operator who holds it, and cancelling changes nothing* |
| Design 12 §7 `c` claims (new to the inbox) | *claims the selected conversation on c* |
| Release (rail `OwnerChip`) | *releases from the rail, and the composer is refused again* |
| §8.6.3/§8.6.4/R10 send: no dialog, no toast, field cleared | *sends without a confirmation or a toast, and clears the field* |
| §8.6.3 empty field disables `Send`, no reason | *disables Send on an empty field without explaining why* (also: the field's only description is the consequence line) |
| §8.6.5 reply by email once from a chat; address in `<bdi>`; conversation stays chat | *sends one reply by email from a chat, names the address, and leaves the conversation a chat* |
| §8.6.5 / D17 toggle refused with real text on no address | *refuses Reply by email on a chat with no address on file, with the reason as text* |
| §8.6.5 absent on an email conversation | *offers no Reply by email on an email conversation* |
| SUPPORT-UX-PLAN §7.3 template inserts, does not send | *inserts a template without sending* |
| §8.7 typing line | *shows that the customer is typing once they have read the reply* (drives `advanceRealtime` instead of a 9 s timeout) |
| Refusal: held by another | *names the holder on a conversation another operator holds* |
| Refusal: closed, `Reopen` primary | *refuses a closed conversation, and Reopen is the header primary* |
| Refusal: WhatsApp has no composer | *renders no composer on a WhatsApp conversation* |
| Refusal: phone note register only (and the field refused, as the console did) | *refuses the note field on a held call with the call sentence, and offers no Reply tab* — see S-1 |
| §8.6.2 D-1 note not-sent vs failed delivery line; D-3 never the code | *separates a note’s not-sent line from a failed message’s delivery line* |
| §8.6.7 `Send again` + `Add an email address` | *offers Send again and Add an email address on a failed message* |
| §8.6.7 restore then retry under one id | *restores a failed message into the composer, then retries it as one line* |
| §8.6.7 retry refused on no address, fix offered | *refuses the retry where there is no address, and offers the actual fix* |
| AC-947 / AC-S-14 ticket from a conversation, linked both ways | *raises a ticket from the conversation, linked both ways, and the rail links it* |
| O6 / D22 snooze from the pane | *snoozes a held conversation until a chosen time from the pane* |
| Close with reason (plan §5 line, old file did not cover) | *closes with a reason, then offers Reopen as the header primary* |
| Reopen does not claim | *reopens a closed conversation, and does not claim it* |
| Transfer with note (plan §5 line, old file did not cover) | *transfers with a note, and the composer passes to the receiving operator* |
| Log a call → system line (plan §5 line, old file did not cover) | *logs a call on a phone conversation, and the system line appears in the thread* |
| AC-936 / AC-963 Unassigned first; first-response breach outranks a longer wait | *opens on Unassigned and paints breached-first, then oldest-waiting* |
| AC-937 no messages says so | *states that a conversation with no messages has none* |
| AC-10 view survives opening a conversation | *lands on the folder a ?view= deep link names, and keeps it while a thread is open* (re-drawn, see 2.2) |
| Level-3 deep link | *opens a conversation from its own path* |
| Bulk claim from the list (plan §5 line) | *claims the checked rows from the list* (`x` then the bar's `Claim`) |
| AC-967 / AC-968 cap refuses a fourth chat with the number, allows email | *refuses a fourth chat in place with the number, and still allows an email* |
| D22 Owner exemption | *does not apply the cap to an Owner* |
| AC-938 `messageCount`, `Load earlier` | *renders the message count from messageCount and offers Load earlier* |
| §8.6.6 / R10 one delivery word | *renders a delivery word on one message, not on every message that has one* |
| Realtime `message.created` (plan §5 line) | *appends a message that arrives on the socket to the open thread* |

### 2.2 Deliberately not ported

| Old test | Why |
|---|---|
| *replaces the queue rather than floating over it* (`queryByRole('table')` absent) | Inverted by design: the list never leaves the screen (AC-CC-04). The inbox has no table at all (Q-CC3) |
| *returns to the queue it came from, with its view intact* (the `Back` button) | There is no `Back` at 1280px; the folder and list persist. Re-drawn as the `?view=` test above, which asserts the folder stays current and the row's href carries `view=waiting`. The compact `inbox.header.back` path is a coverage gap (§3) |
| The six `sla.ts` unit tests (AC-963..966, the asymmetry pair via `compareForQueue`) | Pure functions in `conversations/sla.ts`, still owned and tested there (green in this run). The inbox sorts through `order.ts`; the observable consequence is asserted through the rendered list order instead |
| *changes the placeholder and the send label with the register* (`role="radio"`) | Register is now `Tabs` (design 12 §5); the same behaviour is inside the AC-CC-11 test |
| Row-level `Claim`/`Take over` buttons and the `title` attribute carrying the cap number | The row is a single `<a>` (design 12 §3.1); claim lives in the header, and the cap reason is a real text line the button `aria-describedby`s (§8.6.8), which the cap test asserts instead of `title` |
| The `Toaster` non-assertion | Kept as in the old suite (no `Toaster` mounted; the absence check is weak both there and here) |

## 3. Defects

### D-1 · The closed refusal sentence renders twice on one screen — Low

- **Repro**: open `/support/contact-centre/CNV-114` (closed). Also reachable by closing
  CNV-108 from `More actions › Close conversation`.
- **Expected**: §8.6.8 "one refusal per screen, not one per control"; design 12 §4.1 says the
  header reason renders *once*, §5 says the composer reason renders *once*.
- **Actual**: `This conversation is closed. Reopen it to reply.` appears twice: under the
  header and under the composer. Evidence: first run of *refuses a closed conversation…* and
  *closes with a reason…* failed with `Found multiple elements with the text: This
  conversation is closed. Reopen it to reply.` The header copy comes from `Create ticket`'s
  refusal (`InboxScreen.tsx:489-499`, closed branch at `:497`) surfaced by
  `ThreadHeader.tsx:70-71` and rendered at `:156-160`; the composer copy is
  `InboxScreen.tsx:477` rendered at `Composer.tsx:335-339`. Note the header line is the
  reason for a control that is inside the *closed* `⋯` menu, so an operator reads a refusal
  for something they cannot see.
- **Tests**: scoped to the composer's own sentence via `Send`'s `aria-describedby`; not
  pinned as expected behaviour. Owner of the fix: frontend-engineer, with S-2 below.

No other screen defect was found. Every ported behaviour passed at the first correct
assertion; the six first-run failures were four test-side mistakes (a synchronous region
query before the record landed ×2, an address also present in the rail's Customer card, the
placeholder race in AC-CC-11) and D-1 ×2.

## 4. Coverage gaps

- **Compact breakpoint** (`useCompactShell`): `inbox.header.back`, the folder `Select`, the
  rail as a full-width `Sheet`, sticky composer. Needs the compact shell hook driven in a test;
  not attempted this pass.
- **Rail collapsed / Sheet below `--ev-bp-wide`**: the `matchMedia` shim answers wide only.
- **`↓ N new` pill and stick-to-bottom**: needs scroll geometry; jsdom has no layout. Harness.
- **`message.delivery` and presence events**: delivery moves are exercised on the way to the
  typing line but not asserted as words; presence roster changes untested.
- **Rail per-card error** (`inbox.rail.error`): no failure key for the profile summary
  identified; not tested.
- **`Esc` in the list clearing the checked set**, `r` focusing the composer, `←`/`→` on the
  register tabs: not tested.
- **`x`-checked set across a folder change**: engineer's decision (design 12 §13); untested.
- **Arabic**: every mirrored assertion is the harness's.

## 5. Spec defects and questions — product-owner

- **S-1 · Phone: refused note field under "Log a note instead".** On a held phone
  conversation the composer shows only the `Internal note` tab, and the field is *disabled*
  with `conversations.composer.phone` ("A call has no message to send. Log a note instead.").
  The console did the same (`ConversationPane.tsx:492`, `InboxScreen.tsx:484`), so this is
  parity, not a regression, but the sentence invites an action the field refuses. If the
  intended note path is `Log a call` (plan §5), say so in the copy; if notes should be live on
  a call, the refusal is wrong. Design 12 §5 lists both the tab and the sentence without
  resolving it.
- **S-2 · Two "once"s make two.** Design 12 §4.1 (header reason, once) and §5 (composer
  reason, once) can both fire the same sentence; §8.6.8 says one per screen. Decide which
  surface owns a refusal that applies to both (see D-1). Also whether the header should print
  a reason for a control that sits inside the closed `⋯` menu.
- **S-3 · AC-CC-06 and AC-CC-10 are visual criteria.** "Differ in ground *and* side" and
  "mirrors every bubble side" are not perceivable in jsdom; the tests hold class proxies. The
  criteria should name the harness probe as their evidence so a green jsdom suite is not read
  as proof.
- **Runner note for whoever wires CI on worktrees**: the `--root` form does not apply
  `setupFiles` here (see the header of this file).
