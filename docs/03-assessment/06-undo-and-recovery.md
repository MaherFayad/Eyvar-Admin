# 06 — Undo and recovery

**Owner:** product-designer · **Status:** assessment, read-only. No production code was changed.
**Question asked:** *"is the system actually helping the user fix, and undo mistakes not just
confirm them"*

**Verdict up front.** The *model* is the best-reasoned part of this codebase. `registry.ts` makes
undo a first-class field on a command's outcome, `undo.ts` runs the inverse through the data seam as
a real audited mutation, `outcomeToast.ts` implements D18's ten-second window and the critical-toast
fork, and D18's own table names which acts qualify and which do not. That work is correct and should
not be touched.

**The delivery is not.** Six commands carry an undo handle. **Two surfaces in the product call the
function that renders it.** Four of the six handles are reachable only from ⌘K. On one of those —
`ticket.resolve` — the confirmation was *removed* on D18's promise of an undo, and the undo was never
wired to the screen, so resolving the wrong ticket from the row kebab now has no confirm, no undo,
and no inverse control anywhere on the screen. That is a net loss against the pre-D18 state.

And underneath all of it: **the audit log records eleven clients and none of Operations, Support or
Onboarding.** `AuditAction` has no arm for a suspension, an approval, a resolution or a flag, and
`drivers.ts`, `tickets.ts`, `trips.ts` and `applicants.ts` never call `appendAudit`. Admin › Activity
tells the truth about money and settings and is silent about everything an operator does all day.
The 4pm walkthrough dies at step one.

---

## 1. The action inventory

**Four categories, and they are not exclusive.** An act is scored on all four axes, because that is
the only way the interesting cases show up:

| | Meaning |
|---|---|
| **C** — confirmed | A modal or a second press precedes the write. |
| **U** — undoable | An `Undo` control appears **on the surface the operator used**, in a window. |
| **R** — reversible | An inverse control exists **and is reachable in the product**. Not "a client function exists". |
| **I** — irreversible | Nothing in the product walks it back. |
| **A** — audited | The act writes an `AuditEntry`. |

`R` is scored strictly. `payout.reverse` is a member of the `AuditAction` union with no client
function and no screen; that is not a compensating action, it is a name.

### 1.1 Operations

| Act | Where | C | U | R | I | A | Note |
|---|---|:-:|:-:|:-:|:-:|:-:|---|
| Suspend captain | `CaptainsView` row + bulk, ⌘K | ✔ reason | **✔ 10 s** | ✔ Reinstate, same kebab | | ✘ | The one fully-wired undo in the product |
| Reinstate captain | same | ✔ | ✔ *conditional* | ✔ Suspend | | ✘ | Undo withheld when the record carries no `suspensionReason` — `captains.ts:387`. Honest |
| Compliance suspend / reinstate | `ComplianceView:213,238` | ✔ | ✘ | ✔ the mirror is on the same screen | | ✘ | Registry not used; no undo handle |
| **Approve applicant** | `ApplicationsView:202` | **✘** | ✘ | ✘ | **✔** | ✘ | **One click. Mints a `DRV-*`, notifies the applicant.** `applicants.ts` confirms it; the screen does not use the registry |
| Reject applicant | `ApplicationsView:212` | ✔ destructive + reason | ✘ | ✘ | ✔ | ✘ | `ApplicantStatus` has no transition out of `rejected`. Correctly red |
| Claim application | `ApplicationsView` | ✘ | ✘ | ✔ Release, same row | | ✘ | Low stakes, correctly unconfirmed |
| Take over a claim | `ApplicationsView:250` | ✔ names the holder | ✘ | ✘ | ✔ | ✘ | |
| Release application | `ApplicationsView:196` | ✘ | ✘ | ~ re-claim, if nobody took it | | ✘ | Race, not a reversal |
| Flag trip | `TripsScreen:650` | ~ note modal | ✘ *handle exists* | ✔ Remove flag | | ✘ | **The required investigation note is discarded** — `flagTrip(id, _reason?)` drops it |
| Remove flag | `TripsScreen:656` | ✘ | ✘ *handle exists* | ✔ Flag | | ✘ | No confirm, no undo, no trace, and the note it clears was never stored |
| Assign captain to request | `RequestsScreen:331` | ✔ | ✘ | ✘ | ✔ | ✘ | Body says *"This cannot be undone from here"* on the subscription branch. Honest |
| Close request, no captain | `RequestsScreen` | ✔ | ✘ | ✘ | ✔ | ✘ | Rider told; hold released. Honest |
| Cancel and settle subscription | `CancelSettleModal` | ✔ destructive + reason + note | ✘ | ✘ | ✔ | ✘ | **Model citizen.** Body says it cannot be undone; toast names the refund |
| Freeze subscription | `SubscriptionsScreen` | ~ duration modal | ✘ | ✘ | ✔ | ✘ | **No `unfreezeSubscription` exists anywhere.** D18's table lists Freeze↔Unfreeze as undoable; half of it was never built |

### 1.2 Support

| Act | Where | C | U | R | I | A | Note |
|---|---|:-:|:-:|:-:|:-:|:-:|---|
| Claim ticket | `TicketsScreen:88` | ✘ | ✘ | **✘** | ✔ | ✘ | **No `releaseTicket` exists.** `tickets.ts:151` says so out loud. A misclaim is permanent |
| **Resolve ticket** | `TicketsScreen:102`, `TicketDetailScreen:206` | **✘** | **✘** | **✘ in the UI** | ✔ | ✘ | **The regression.** D18 traded the confirm for an undo; the screen calls `resolveTicket` and `toast.success` directly. `ticket.reopen` exists as a command with no screen control |
| Reopen ticket | ⌘K only | ✘ | ✔ via palette | ✔ | | ✘ | Not on any screen |
| Reply to ticket / log call | `TicketDetailScreen`, `LogCallModal` | ✘ | ✘ | ✘ | ✔ | ✘ | Customer-visible |
| Send conversation reply | `ConversationPane` composer, **Enter sends** | ✘ | ✘ | ~ follow-up message, same composer | ✔ | ✘ | Genuinely irreversible; the compensating action is one keystroke away. Acceptable |
| Close conversation | `ConversationConsoleScreen:488` | ✔ + reason | ✘ | **✔ `Reopen` is the header primary on the closed thread** | | ✘ | **The best-shaped pair in the product** |
| Transfer conversation | `ConversationConsoleScreen` | ✔ | ✘ | ✘ | ✔ | ✘ | D19. Honest |
| Close safety incident | `SafetyScreen:320` | ✔ | ✘ | ✘ | ✔ | ✘ | |
| Precautionary suspension | **not shipped** | — | — | — | — | — | **Withheld deliberately** because nothing lifts it (`SafetyScreen:42-51`). The single best recovery decision in the repo |
| Decide a fairness case | `FairnessScreen:261` | ✔ | ✘ | ✘ | ✔ | ✘ | Both outcomes irreversible; neither is red, by ruling |

### 1.3 Financials

| Act | Where | C | U | R | I | A | Note |
|---|---|:-:|:-:|:-:|:-:|:-:|---|
| Pay a captain | `PayoutsScreen:383,614` | ✔ 3-line money dialog | ✘ | **✘** | ✔ | ✔ | `payout.reverse` is an audit verb with **no client and no UI** |
| Release escrow | `PayoutsScreen:836,905` | ✔ | ✘ | **✘** | ✔ | ✔ | `escrow.rehold` — same |
| Apply a deduction | `PayoutsScreen:1133,1230` | ✔ | ✘ | **✘** | ✔ | ✔ | `Waive` refuses an already-applied deduction (`fin.deduction.blocked.decided`). The apparent inverse is not one |
| Waive a deduction | `PayoutsScreen:1167,1267` | ✔ + reason | ✘ | ✘ | ✔ | ✔ | |
| Adjust a wallet | `WalletsScreen:340` | ✔ + amount + reason + cap | ✘ | **✘** | ✔ | ✔ | **`direction: 'credit'` is a hardcoded literal.** The client takes `'debit'`, the dictionary has `fin.wallet.adjust.direction.debit`, no screen sends it |
| Resolve / escalate a cash report | `CashScreen` | ✔ + reason | ✘ | ✘ | ✔ | ✔ | |
| Record a cash repayment | `CashScreen` | ✔ + amount + reason | ✘ | ✘ | ✔ | ✔ | |
| Enable / disable a gateway | `LedgerControlsScreen:715` | ✘ | ✘ | **✔ the same switch** | | ✔ | **Correctly unconfirmed.** The switch never flips optimistically (AC-422), the act is audited, and flipping back is the inverse. This is the pattern the rest of the product should copy |
| Set the default gateway | `LedgerControlsScreen:731` | ✘ | ✘ | ✔ set another | | ✔ | Same |
| **Reverse a posting** | **no UI** | — | — | — | — | ✔ | `reversePosting` is fully built, idempotent, refuses a double reversal by naming the reversing posting, and **no screen calls it** |
| **Issue a refund** | **no UI** | — | — | — | — | ✔ | `issueRefund` returns a `Refund` **and a `CreditNote`**. `RevenueScreen:489` says the act lives in the PageHeader; **`RevenueScreen` renders no `primaryAction`** |

### 1.4 Admin and shell

| Act | Where | C | U | R | I | A | Note |
|---|---|:-:|:-:|:-:|:-:|:-:|---|
| Invite / resend / revoke an invite | `AdminTeamScreen` | ✔ | ✘ | ✔ re-invite | | ✔ | |
| Suspend / reinstate an operator | `AdminTeamScreen` | ✔ | ✘ | ✔ the mirror | | ✔ | Guarded transitions; last `manage_team` holder protected |
| Offboard an operator | `AdminTeamScreen` | ✔ | ✘ | ✘ | ✔ | ✔ | `team.ts:577` — *"permanently, and no surface in the product could undo it."* Honest |
| Set operator permissions | `AdminTeamScreen` | ✔ | ✘ | ✔ set them back | | ✔ | |
| Revoke an operator session | `OperatorSessionsDialog:103` | ✔ inline 2-step | ✘ | ✔ they sign in again | | ✔ | |
| Revoke my device / sign out everywhere | `DeviceList:163,182` | ✔ inline 2-step | ✘ | ✔ sign in again | | ✘ | |
| Issue / rotate / revoke an API key | `ApiKeysCard` | ✔ | ✘ | ~ issue a new one | ✔ *rotate* | ✔ | Rotation shows the secret once; the old one is dead. Correctly confirmed |
| Create / update a webhook, rotate its secret | `WebhooksCard` | ✔ | ✘ | ✔ edit again | | ✔ | |
| **Replay a webhook delivery** | `WebhookDeliveryLogCard` | ✔ | ✘ | ✘ | ✔ | ✔ | Re-fires at a third party |
| **Send a push broadcast** | `PushComposerModal:107` | **✘** | ✘ | ✘ | ✔ | **✘** | **The worst surface in the product.** See §5.1 |
| **Resend an email delivery** | `EmailLogCard:127` | **✘** | ✘ | ✘ | ✔ | **✘** | One click, one real email. The toast names the recipient — after the fact |
| **Set the default sender identity** | `AdminCommunicationsScreen` | ✘ | ✘ | ✔ set it back | | **✘** | `emails.ts:35` — *"an audited act and no audit entry is written yet"*. Blast radius: every transactional email afterwards |
| Save an email template | `EmailTemplatesCard` | ✘ | ✘ | ✘ no version history | ✔ | ✘ | |
| **Queue reconsent** | `AdminWorkspaceScreen:249` | **✘** | ✘ | ✘ | ✔ | ✔ | Pushes a consent prompt to N accounts. **The count arrives in the toast, after the send** |
| Save a retention policy | `AdminDataScreen` | ✘ | ✘ | ~ save again | ✔ *deletions* | **✘** | A shortened window deletes data. `retention.save` exists in the union; nothing calls it |
| Save the operational policy | `AdminPolicyScreen` | ✔ | ✘ | ~ save again | | ✔ | Audits **the changed field paths**. The best audit entry in the product |
| Retire / restore a reason code | `AdminPolicyScreen` | ✔ | ✘ | **✔ `restore` is a real inverse** | | ✔ | A genuine reversible pair, and it is not in D18's table |
| Update workspace settings / remove the logo | `AdminWorkspaceScreen:240` | ~ | ✘ | ✔ re-upload | | ✔ | |
| Delete a report | `ReportLibrary` | ✔ names the pinned dashboards | ✘ | ✘ | ✔ | ✘ | No trash, no restore |
| Delete a dashboard | `DashboardsView` | ✔ | ✘ | ✘ | ✔ | ✘ | Same |
| Save a report / dashboard over itself | `ReportBuilder`, `DashboardDetailScreen` | ✘ | ✘ | ✘ no version history | ✔ | ✘ | |
| Mark all notifications read | `NotificationsLayer:93` | ✘ | ✘ | ✘ | ✔ | ✘ | Destroys the unread set. Low stakes, zero trace |

### 1.5 The counts

| | Acts |
|---|---|
| Total distinct destructive or costly acts inventoried | **53** |
| Confirmed | 33 |
| **Undoable on the surface the operator used** | **2** (`captain.suspend`, `captain.reinstate`) |
| Undoable via ⌘K only | 4 (`ticket.resolve`, `ticket.reopen`, `trip.flag`, `trip.unflag`) |
| Reversible by a reachable compensating action | 19 |
| Irreversible in the product | **29** |
| **Audited** | **24** — and **zero** of them in Operations, Support or Onboarding |

**The ratio that matters: 33 confirms, 2 undos.** The owner's thesis is confirmed by the arithmetic.

---

## 2. The undo window — measured

### 2.1 The numbers

| | Value | Source |
|---|---|---|
| Undo window | **10 000 ms** | `outcomeToast.ts:65` — `export const UNDO_WINDOW_MS = 10_000` |
| Every other toast | 5 000 ms | `sonner.tsx:84` |
| Toasts visible at once | 3 | `sonner.tsx:82` |
| Timer behaviour on hover | **paused** (Sonner default) | asserted in `outcomeToast.ts:57` |
| Critical (failed-undo) toast | **`Infinity`** | `outcomeToast.ts:130` |
| Retry offered | **once**, then `Open the record` where there is one record | `outcomeToast.ts:107-121` |

The window is exactly the life of the toast, which is D18's stated intent and is right: an undo that
outlives its affordance is a promise nobody can see.

### 2.2 Where it is offered

`toastOutcome` has **two call sites in the entire product**:

```
src/commands/usePalette.ts:565                        ⌘K
src/screens/operations/people/CaptainsView.tsx:266    Captains row kebab + bulk bar
```

Six commands declare an undo handle. Four of them belong to screens that never call `toastOutcome`:

- `TicketsScreen:102` → `await resolveTicket(...)` then `toast.success(...)`
- `TicketDetailScreen:206` → same
- `TripsScreen:260,280` → `flagTrip` / `unflagTrip` directly

**The handle is constructed, returned, and dropped on the floor** on every one of those paths.
`outcomeToast.ts`'s own header documents this asymmetry for `CaptainsView` and says the one-line fix
was in a handoff. It landed for captains and for nobody else.

### 2.3 What happens when it expires

Nothing. The toast unmounts, the closure holding `UndoHandle.run` is collected, and there is no
record anywhere that the window existed. Recovery after expiry depends entirely on whether a
compensating control is on screen:

| Act | After 10 s |
|---|---|
| Suspend a captain | ✔ `Reinstate captain` on the same kebab, and the `Suspended` filter finds the row |
| Resolve a ticket | ✘ **nothing on the screen.** `ticket.reopen` is ⌘K-only |
| Flag / unflag a trip | ✔ the mirror is on the same kebab |

### 2.4 Three defects in the shipped window

**(a) The toast carrying the undo does not name the object.** The spec
(`12-refusal-and-undo-surfaces.md` §3.3) writes the sequence as
`Nora Al-Harbi suspended` → `[Undo]`. What ships is:

```
people.toast.suspended.one   'Captain suspended'
people.toast.suspended.other '{count} captains suspended'
```

The *undo* copy is correct — `people.toast.suspended.undone.one` is
`'Suspension reverted for {name}'`. So the operator learns **which captain** only *after* pressing
Undo. That is exactly backwards, and it breaks R9 on the one toast in the product where naming the
object is the whole point. Tickets and trips get this right (`{id}`); captains do not.

**(b) The critical toast's second line is not the specified copy and is not translatable.**
`describeFailure` (`outcomeToast.ts:76`) returns `error.message` raw. The spec's table maps
`ApiError.kind` to three dictionary strings:

| `kind` | Specified line 2 |
|---|---|
| `conflict` | `Someone else changed this record in the meantime.` |
| `network` | `The reversal didn't reach the server.` |

Neither key exists. What renders instead is the client's English developer sentence —
`"DRV-0204 was already reversed by …"` — with no Arabic path at all.

**(c) §3.4's assertive announcement is not implemented.** `sonner.tsx` sets no `role="alert"` and the
critical branch adds none. A toast that changes content in place under the same id is a *polite*
update to already-spoken content, which screen readers routinely drop. **A failed undo is silent to a
screen-reader operator.** §3.1's "pinned to the bottom of the stack, at most one visible" is also
unimplemented; `visibleToasts={3}` with default ordering can push it off the top.

### 2.5 Test health at head

`npx vitest run src/commands` — **2 failures**, both in `CM-3 in CaptainsView`, both timing out at
15 s waiting on the confirmation dialog that gates the only wired undo path. The failure set was not
identical across two runs (1 then 2), so this is flake rather than a hard break — but it means the
one end-to-end undo path in the product has no reliable regression cover.

---

## 3. The honest cases

Some acts genuinely cannot be undone. The test is whether the product **says so** and whether a
compensating action is **reachable from where the mistake is found**.

### 3.1 Where the product is honest — and it often is

| Act | The sentence | Compensating action reachable? |
|---|---|---|
| Cancel and settle a subscription | *"The subscription ends now and the rider keeps nothing unused. The refund is calculated and paid by Finance, and this cannot be undone from here."* | ✘ — see §3.2 |
| Assign a captain to a subscription request | *"The rider's authorisation hold is captured and the subscription starts. This cannot be undone from here."* | ✘ |
| Approve an applicant (the **command**, not the screen) | *"The applicant becomes a captain and is told. Their documents and their history stay on file, and the approval cannot be undone from here."* | ✘ |
| Offboard an operator | `team.ts:577` — *"permanently, and no surface in the product could undo it"* | ✘ |
| Precautionary suspension | **not shipped, on purpose**, because nothing lifts it | n/a — and this is the right call |

The phrase *"from here"* is doing honest work in all three of the first entries: it does not claim the
act is cosmically irreversible, it claims **this console cannot walk it back**, which is true.

`SafetyScreen`'s refusal to ship a half-pair is the strongest recovery decision in the repo and
should be cited as precedent whenever someone proposes shipping an apply without its lift.

### 3.2 Where the product is silent — and it is the money

**Not one financial confirmation says the act is final.** Every `fin.*.confirm.body` describes what
changes and what does not, per §9.1, and stops there:

```
fin.payout.confirm.body     'Payable {payable}, less cash debt {debt}, transfers {net}.
                             The debt is cleared by this payout and nothing else about
                             the captain changes.'
fin.escrow.confirm.body     'The hold stays on this list showing its released state, and
                             the amount is credited to the captain payable ledger. …'
fin.deduction.apply.body    'The amount comes off the captain payable balance. …'
```

Every one of these is true. None of them says *the money leaves and this console cannot bring it
back*. Compare the subscription copy, which does, on the same product, for a smaller amount.

**And the compensating actions are all built and none is reachable:**

| Compensating primitive | State |
|---|---|
| `reversePosting` | Fully implemented. Idempotent on `('reverse', postingId)`. Refuses a double reversal by naming the reversing posting so the refusal can link to it. **Zero UI call sites.** |
| `issueRefund` | Fully implemented. Returns `{ refund, creditNote }`. **Zero UI call sites.** `RevenueScreen:489` claims the act lives in the PageHeader; that PageHeader has no `primaryAction`. |
| `adjustWallet` with `direction: 'debit'` | The client takes it. The dictionary has the label. `WalletsScreen:340` hardcodes `'credit'`. |
| `payout.reverse`, `escrow.rehold`, `refund.reverse` | Audit verbs with no client function behind them. |

So the answer to *"is there a credit note reachable from where the mistake is discovered"* is: **the
credit note is generated by a function no screen calls, and the Credit notes tab renders a read-only
list of documents that only the mock fixture can create.** An operator who pays the wrong captain
23 400.00 SAR at 11am has, at 4pm, exactly one recovery path: leave the console and telephone
Finance.

**The toasts make this worse.** `Payout sent`, `Escrow released`, `Deduction applied`,
`Deduction waived` — none names the object. When money moves to the wrong row, the confirmation that
it moved does not tell you **which row**, and it lasts five seconds.

### 3.3 Where the product is silent about a *message*

`sendPushBroadcast`, `resendEmailDelivery` and `replyConversation` all put text in front of a human.
The conversation composer is the one that handles it well: the follow-up message is one keystroke
away, and `conversations.composer.restored` (*"Restored from a message that didn't send."*) is a real
recovery affordance for the failure case. Push and email have neither a confirmation nor a follow-up
path.

---

## 4. Discovery — the 4pm walkthrough

> *An operator realises at 4pm that they suspended the wrong captain at 11am.*

### Step 1 — "What did I do this morning?" → **Admin › Activity** → **DEAD**

`captain.suspend` writes **no audit entry**. Two independent reasons, either sufficient:

1. **`AuditAction` has no arm for it.** The union (`types/audit.ts:24-99`) covers payouts, escrow,
   deductions, refunds, wallets, postings, cash, gateways, plans, policy, reason codes, team,
   workspace, legal, API keys and webhooks. There is no `captain.suspend`, no `applicant.approve`, no
   `ticket.resolve`, no `trip.flag`, no `conversation.close`, no `subscription.cancel`.
2. **`drivers.ts` never imports `appendAudit`.** Nor do `tickets.ts`, `trips.ts`, `applicants.ts`,
   `safety.ts`, `conversations.ts`, `subscriptions.ts`, `requests.ts`, `disputes.ts`, `fairness.ts`,
   `complaints.ts`, `assurance.ts`, `zones.ts`, `emails.ts`, `alerts.ts`, `dashboards.ts`,
   `reports.ts` or `auth.ts`. Eleven of thirty-odd clients write to the log.

**This is the drop point.** Everything below is what the operator finds *if they get past it*, and
they do not.

The screen's own empty-state copy makes the promise it cannot keep:

> `admin.activity.empty.body` — *"The log is append-only and starts empty. The first payout,
> **suspension** or settings change writes the first line."*

A suspension writes nothing. And the page meta says *"Every mutating action, with the operator who
took it."* Both strings are false as shipped.

### Step 2 — Suppose the entry existed. Is Activity usable for "what did I do this morning"?

**No. It is a compliance artifact, not a recovery tool.** Four structural reasons:

| Problem | Evidence |
|---|---|
| **No date filter, no time range.** | `AdminActivityScreen:102` passes `{ page, pageSize }` and nothing else. `listAuditEntries` accepts `subjectType`, `subjectId`, `action` — the screen sends none of them. There is no `from`/`to` parameter on the client at all. |
| **No "me" filter.** The one question an operator asks. | Same. `actorId` is not a client parameter. |
| **The views are orderings, not filters.** | `VIEW_ORDER` at `:78` sorts by `actorName` / `action` / `subjectType`. `by-actor` groups every operator's rows together; it does not select yours. |
| **Search is page-local.** | `rows` at `:110` filters `data.data.items` — the 25 rows already fetched. A query that matches an entry on page 3 returns "No entries match that query." |

So the intended path is: land on an unfiltered, newest-first, 25-row page and scroll. At any real
volume that is not a path.

### Step 3 — Suppose they find the entry. Can they get from it to the record?

**No.** `AdminActivityScreen`'s `subject` column renders `subjectId` as plain text
(`<span className="font-mono">`), not an `EntityLink`. There are no row actions. The table has a bulk
bar with `Export selected` and `Copy event IDs`. **The audit log is a read-only terminus** — you can
export your mistake to CSV, you cannot click through to it.

### Step 4 — The route that actually works

Operations › People › Captains → filter `Suspended = true` (`captainExtraFilters`, `CaptainsView:389`)
→ scan → find the row → `Reinstate captain` on the kebab → confirm → done, with an undo on the toast.

**That route works and it is the only one.** Its cost: the operator must already know it was a
captain, must already know it was a suspension, and must recognise the person from a list. Three
things the record cannot help with:

- `Driver` has **no `suspendedAt`** — there is no time on the record, so the list cannot be sorted or
  filtered to "this morning".
- `Driver` has **no `suspendedBy`** — nothing says it was *you*.
- The 360° profile layer **does not read the audit log**. `listAuditEntries` has exactly one consumer
  in the product and it is Admin › Activity. There is no per-record history anywhere.

So the operator's evidence is `suspensionReason` — the free text *they typed at 11am* — which is a
real anchor and is the reason the reason field is required. That is a good design decision doing work
it was not meant to do alone.

### Step 5 — The mock makes it untestable

`useRowOverrides` holds the mutated row in React state and *"dies with the view"*
(`useRowOverrides.ts:16`), because `suspendDriver` returns a new object without writing back to the
fixture array. **In the running app, the 11am suspension is gone by the time the operator navigates
away and back.** That is a mock-fidelity gap rather than a product defect, but it means this
walkthrough cannot be exercised in the dev server at all, which is presumably why nobody has walked
it.

### The verdict on discovery

> **The path from "I found my mistake" to "I fixed it" is a path. The path from "I made a mistake" to
> "I found it" does not exist for anything outside Financials and Admin.**

---

## 5. The near-misses — silent mistake surfaces

Ranked by blast radius. Every one of these is: **no confirm, no undo, no trace.**

### 5.1 Send a push broadcast — `PushComposerModal:107`

The single worst surface in the product.

- A compose modal with an audience select, a title, a body and a `Send broadcast` button.
- The device count renders as a `FieldDescription` under the select — *before* the operator types the
  message, and never again.
- One click sends to the whole audience. **No confirmation step, no second surface, no count in a
  confirm.**
- `state: 'queued'` on the returned record with **no cancel affordance** on a queued broadcast.
- **No audit entry.** `emails.ts` does not import `appendAudit`.
- No `permission.denied` write either, despite `comms.push.blocked` existing.

A typo in a push body reaches every device on the audience and the console has no record that it
happened, who did it, or what it said beyond the broadcast list row.

### 5.2 Approve an applicant — `ApplicationsView:202`

`const ok = await run(row.id, 'people.error.row.approve', () => approveApplicant(row.id))`

One click on a `<Button size="xs">` in a 176px cell. It mints a `DRV-*` record, notifies the
applicant, and has no transition back. `commands/applicants.ts` was written specifically to fix this
— its header quotes D8's *"a one-click approve is a one-click irreversible act"* and adds a
confirmation — **and the screen does not use the registry.** The fix exists, compiles, is tested, and
is not wired.

Note the asymmetry on the same screen: `Reject` confirms with a red primary. The *reversible-ish*
half is guarded and the irreversible half is not.

### 5.3 Resolve a ticket — `TicketsScreen:102`, `TicketDetailScreen:206`

The regression, stated precisely:

- Before D18: `Resolve` was a row action with a refusal predicate and no confirm. (Ported behaviour.)
- D18's trade: **remove the confirm, because the undo is the net.**
- `commands/tickets.ts` took the trade — *"No confirmation, by D18 — the inverse is declared below,
  nothing left the console, and the ten-second undo on the toast is the net the dialog would
  otherwise have been."*
- The screen never adopted the registry. So the net was never hung, and the rope is still there.

An agent who resolves the wrong ticket has: no confirm, no undo, no `Reopen` control on either the
index or the detail screen, and no audit line. The only recovery is to know that ⌘K exists, that
`Reopen ticket` is a command, and that typing the ticket id pre-seeds it.

### 5.4 Resend an email delivery — `EmailLogCard:127`

One click, one real email to a real recipient. No confirm, no audit. The toast names the recipient,
which is good — and arrives after the send, which is the point.

### 5.5 Queue reconsent — `AdminWorkspaceScreen:249`

Pushes a consent prompt to every account bound to a legal document. No confirm. **The count is
computed by the server and delivered in the success toast** — the operator learns the size of what
they did only once it is done. It is audited (`legal.reconsent`), which is the one thing keeping this
off the top of the list.

### 5.6 Remove a flag from a trip — `TripsScreen:656`

`onSelect: (trip) => void runUnflag([trip])`. No confirm (sanctioned by D18), no undo (the screen
drops the handle), no audit. It clears an investigation another team is working. **And the note it
clears was never stored** — `flagTrip(id, _reason?)` drops the parameter, so the required
investigation note the operator typed into the flag modal goes nowhere. The console demands a
justification and discards it.

### 5.7 Save a retention policy — `AdminDataScreen`

Shortening a retention window causes deletion. `retention.save` is a member of `AuditAction`; nothing
calls it. No confirm found on the pane.

### 5.8 Set the default sender identity — `AdminCommunicationsScreen`

`emails.ts:35` says it plainly: *"Changing which address the product sends as is invisible to everyone
except the recipient, and it is the one act on that screen whose blast radius is every transactional
email the system sends afterwards."* No audit entry. It is reversible by setting it back, which is
why it is not higher.

### 5.9 Save an email template / save a report over itself / save a dashboard

No version history anywhere in the product. An overwrite is total and silent.

### 5.10 Mark all notifications read — `NotificationsLayer:93`

Destroys the unread set with one click. Low stakes, listed for completeness because it is the purest
example of the shape.

---

## 6. Balance — where a confirm should become an undo, and where one is missing

The product does **not** yet suffer from confirm fatigue in the way the question anticipates: 33
confirms across 53 acts, and most of them are on genuinely irreversible things. The imbalance is the
other way — **the confirms are concentrated in Financials and Admin, and Operations and Support
carry the unconfirmed irreversible acts.**

But three confirms are ceremony and should go.

### 6.1 Replace a confirm with an undo (three)

| Act | Why the confirm is ceremony | Replace with |
|---|---|---|
| **Reinstate captain** | Its inverse is the row above it, nothing leaves the console, and `captains.ts` says the dialog is only still there because the surface did not yet offer the undo — *"removing the dialog before the surface offers the undo would take away the net without hanging the rope."* **The surface now offers it** (`CaptainsView:266`). The stated precondition is met. | Drop the dialog. Keep the undo. |
| **Compliance suspend / reinstate** | Same pair, same screen, both directions on the same table. Two dialogs for an act that is reversed by the row beneath it. | Adopt `CAPTAIN_COMMANDS`, drop both dialogs, keep the reason field on suspend (it is an input step, not a confirmation). |
| **Retire / restore a reason code** | `restore` is a real, built, audited inverse. This is the cleanest undoable pair in the product and it confirms. | Undo on the toast. |

### 6.2 Add a confirm where one is missing (four)

Ranked. These are *not* "add more confirms" in general — they are four specific acts that are
irreversible, externally visible, and currently one click.

| Act | What the confirm must say |
|---|---|
| **Send a push broadcast** | *"Send to {count} devices?"* — the count in the **title**, the message body quoted, and a statement that it cannot be recalled. |
| **Approve an applicant** | Use `commands/applicants.ts`. The copy is already written and translated: *"The applicant becomes a captain and is told. Their documents and their history stay on file, and the approval cannot be undone from here."* |
| **Queue reconsent** | The count **before** the act, not in the toast after it. |
| **Resend an email delivery** | *"Resend to {recipient}?"* — one line, naming the address. |

### 6.3 Neither — wire the undo that already exists (two)

| Act | Change |
|---|---|
| **Resolve / reopen a ticket** | `TicketsScreen` and `TicketDetailScreen` adopt `TICKET_COMMANDS` and call `toastOutcome`. This is the same one-line diff that landed in `CaptainsView`. It also puts `Reopen` on a screen for the first time. |
| **Flag / unflag a trip** | `TripsScreen` adopts `TRIP_COMMANDS` and calls `toastOutcome`. |

Neither of these is a design decision. The commands, the copy, the undo handles and the tests all
exist. They are unwired.

---

## 7. Ranked recommendations

Ordered by *harm prevented per unit of work*. The middle column is the honest classification the
owner asked for.

| # | Change | Kind | Owner |
|---|---|---|---|
| **1** | **Audit Operations, Support and Onboarding.** Add `captain.suspend`, `captain.reinstate`, `applicant.approve`, `applicant.reject`, `ticket.claim`, `ticket.resolve`, `ticket.reopen`, `trip.flag`, `trip.unflag`, `conversation.close`, `conversation.reopen`, `conversation.transfer`, `subscription.cancel`, `subscription.freeze`, `request.assign`, `request.expire`, `safety.close`, `push.broadcast`, `email.resend`, `emailTemplate.save`, `senderIdentity.setDefault`, `retention.save` to `AuditAction`, and call `appendAudit` in each client. **Nothing else on this list matters until an operator can see what they did.** | add a trace | mock-data-engineer + data owner |
| **2** | **Add a `from` / `to` / `actorId` filter to `listAuditEntries` and to Admin › Activity, with a `Just me` and a `Today` default view.** Make search server-side. | make the trace usable | frontend-engineer + data owner |
| **3** | **Confirm the push broadcast**, with the device count in the title. | **add a confirm** | frontend-engineer |
| **4** | **Wire `ApplicationsView` to `APPLICANT_COMMANDS`.** Restores the confirm on approve. Copy already exists. | **add a confirm** (already written) | frontend-engineer |
| **5** | **Wire `TicketsScreen`, `TicketDetailScreen` and `TripsScreen` to `toastOutcome`.** Four undo handles go from ⌘K-only to on-surface. Closes the D18 regression on `ticket.resolve`. | **add an undo** | frontend-engineer |
| **6** | **Name the object in `people.toast.suspended.*`.** `'{name} suspended'` / `'{count} captains suspended'`. The undo copy already does this. R9, and the whole point of the toast. | copy | product-designer (this file's author) |
| **7** | **Link the audit row to its subject.** `subjectId` becomes an `EntityLink` where `subjectType` is one of the six the resolver answers. Turns the log from a terminus into a path. | make the trace usable | frontend-engineer |
| **8** | **Say "this cannot be undone" on the four money confirms** — pay, release escrow, apply deduction, waive deduction — and **name the object in their toasts**. `Payout sent` → `{captain} paid {net}`. | honesty + copy | product-designer |
| **9** | **Ship the reversal UI.** `reversePosting` and `issueRefund` are complete and unreachable. A `Reverse` row action on the ledger and an `Issue a refund` page-header primary on Revenue give Financials its first compensating action. | reachable compensating action | product-owner scope call, then frontend-engineer |
| **10** | **Wire `direction: 'debit'` on the wallet adjustment.** One-line change to a hardcoded literal; the client, the cap check and the dictionary all already support it. | reachable compensating action | frontend-engineer |
| **11** | **Confirm reconsent and email resend**, with the count and the recipient stated **before** the act. | **add a confirm** | frontend-engineer |
| **12** | **Drop the `reinstate` confirmation** (captains and compliance) and **the reason-code retire/restore confirmation.** Their stated precondition — the surface offers the undo — is now met. | **remove a confirm** | product-designer + frontend-engineer |
| **13** | **Store the trip flag note.** `flagTrip` drops a required field. Add `flagReason` to `Trip` and thread it, or stop demanding the note. | data | mock-data-engineer |
| **14** | **Fix the critical toast's second line** — map `ApiError.kind` to the two specified dictionary keys instead of rendering `error.message` raw. Untranslatable copy on the failure path. | spec conformance | frontend-engineer |
| **15** | **Announce the critical toast assertively** (`role="alert"`) and pin it to the bottom slot. §3.4 and §3.1 item 4 of the spec are unimplemented; a failed undo is currently silent to a screen reader. | accessibility | frontend-engineer + shell owner |
| **16** | **Add `suspendedAt` and `suspendedBy` to `Driver`,** and surface a per-record history in the 360° layer. The generic version of this is "the profile layer reads the audit log", which is the real fix and is larger. | discovery | product-owner scope call |
| **17** | **Ship `releaseTicket` and `unfreezeSubscription`.** Both halves of a D18 pair are listed as undoable and only one half was built. | reachable compensating action | mock-data-engineer |
| **18** | **Fix the two flaky `CM-3 in CaptainsView` tests.** They cover the only wired undo path and they time out at 15 s. | test health | frontend-engineer |
| **19** | **Correct `admin.activity.meta` and `admin.activity.empty.body`.** Both currently promise a coverage the log does not have. Until item 1 lands they are false; after it lands they are true. | copy | product-designer |

**Items 3, 4 and 11 are the only "add a confirm" entries, and there are four acts between them.**
Items 5, 10, 12 and 17 are "remove a confirm / add an undo / reach the inverse". Items 1, 2 and 7 —
the top of the list — are neither: they are the audit trail, which is the thing the owner's question
is really about and the thing that is missing.

---

## 8. Findings for the record

| # | Finding | Raise with |
|---|---|---|
| **F-1** | **`AuditAction` covers no Operations, Support or Onboarding verb, and sixteen clients never call `appendAudit`.** The audit trail is a Financials-and-Admin artifact presented as a product-wide one. Two shipped strings say otherwise. | product-owner |
| **F-2** | **`ticket.resolve` lost its confirmation to D18 and never gained the undo.** A net regression against the pre-D18 state, in the highest-volume queue in the product. | product-owner, frontend-engineer |
| **F-3** | **`ApplicationsView` does not use `APPLICANT_COMMANDS`.** The one-click irreversible approve D8 named is still shipped, with the fix sitting unwired beside it. | frontend-engineer |
| **F-4** | **`reversePosting` and `issueRefund` have no UI.** The product's only two money-reversal primitives are complete, tested and unreachable, and `RevenueScreen:489` documents an affordance that does not exist. | product-owner |
| **F-5** | **`WalletsScreen` hardcodes `direction: 'credit'`.** The debit path is built in the client and labelled in the dictionary. | frontend-engineer |
| **F-6** | **`flagTrip` discards the required investigation note.** The console demands a justification and drops it before the request. | mock-data-engineer |
| **F-7** | **The undo-bearing toast does not name the object; the undo-*confirmation* toast does.** R9 inverted on the one surface where it matters most. | product-designer — actionable in this file's own copy layer |
| **F-8** | **Spec §3.4 (assertive announcement) and §3.3 (keyed line 2) of `12-refusal-and-undo-surfaces.md` are unimplemented.** The document says specified; the code says otherwise. | frontend-engineer |
| **F-9** | **`useRowOverrides` dies with the view**, so no mutation survives a route change in the dev server. The 4pm walkthrough cannot be exercised manually today. | mock-data-engineer |
| **F-10** | **D18's table lists seven undoable pairs; three are built.** `Claim ↔ Release` (no `releaseTicket`), `Freeze ↔ Unfreeze` (no `unfreezeSubscription`), `Snooze ↔ Un-snooze` (neither exists), `Assign/unassign a tag or owner` (no client), `Archive / restore` (no client). The ruling describes a product that does not exist yet, and nothing records that. | product-owner |

**No `DESIGN.md` rule is deviated from by this document.** Every recommendation above either enforces
an existing rule (R9, §11.2, D8, D18, §5.3) or closes a gap between a ruling and its implementation.
The two places where the document itself is incomplete — the undoable-pairs table in D18 and the
unimplemented clauses of `12-refusal-and-undo-surfaces.md` §3 — are recorded as F-8 and F-10 rather
than amended here, per the boundary on amending `DESIGN.md` and its partials.
