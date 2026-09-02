# Operations — P4-T1 (bulk work), P8-T1 (360° reach), and the forms that lied

**Scope:** `src/screens/operations/**`, plus two additive changes outside it, both named below.
**Status:** `npx tsc --noEmit` clean across `screens/operations` and `screens/queues`.
52 tests green (`screens/operations`, `components/table/bulkSelection`, `commands`).
Token audit clean on every file created or rewritten.

---

## 1. What each screen gained

| Screen | Selection + bulk bar | 360° reach | Forms / §11.2 |
|---|---|---|---|
| **Trips** | `Flag` · `Remove flag`, D21-gated, both reaching `flagTrip` / `unflagTrip` | trip id, rider, captain, **subscription**, **payment** — all resolver-asked links | row actions moved into `DataTable`; `FlagTripModal` takes a set, awaits the write, refuses in place; `STATUS_TONES` re-keyed on `TripStatus` |
| **Subscriptions** | `Freeze` only — see §5 | subscription id, rider, captain | `Change captain` disabled with its reason (no client); freeze + settle await the write; `Calculated refund` → `Estimated refund`; toast quotes the **server's** figure |
| **Requests** | `bulkClaim: true` + `Claim` → `claimRequest` | the offered captain is now a link | — |
| **Trip Assurance** | `bulkClaim: true` + `Claim` → `claimAssuranceTrip` | rider and captain on the leg | Absences correctly keeps **no** checkbox (Q-60) |
| **My Work** | `bulkClaim: true` + `Claim` → the **source queue's** client per record | identity already routed (AC-281) | `source-queue-unavailable` now blocks the bulk claim too (AC-292) |
| **People › Compliance** | bulk `Suspend` / `Reinstate` gated for the first time | — | row kebab and bulk bar now share one predicate |
| **People › Captains** | already had a bar; now refuses **at render** | — | `PeopleTable`'s narrowed `bulkActions` type widened to `BulkAction` |
| **Corporate** | **none — reported, see §6** | company name is a real `<a>`; employee rows link to riders | create form no longer loses seven fields on failure; unlink + invoice disabled with reasons; `vehicleTier` `as any` removed |
| **Live Dispatch** | n/a | — | `ManualDispatchModal` calls `assignRequest`; interventions disabled with their reason |
| **Applicant detail** | n/a | `approvedDriverId` links to the captain | 13 → 29 fields; `not-found` split from `error`; decision bar refuses instead of hiding |

**New files:** `bulkRefusal.ts` (D21 in one function) · `EntityLink.tsx` (hook + cell) ·
`localCopy.ts` (copy bridge) · `trips/copy.ts` · `subscriptions/copy.ts` ·
`subscriptions/SubscriptionDetailDrawer.tsx` · `trips/trips.test.tsx`.

---

## 2. Client operations that do not exist

Every one of these is a control that is now **rendered and refused with its reason** rather
than faked. None is hidden.

```ts
// clients/subscriptions.ts — Change captain
reassignSubscriptionDriver(id: string, driverId: string, signal?: AbortSignal): Promise<Subscription>
//   409 when the subscription is not `active`
//   409 when the captain is at `maxSubscriptions`
//   422 when `driverId` is empty or is the captain already assigned

// clients/corporateAccounts.ts — unlink an employee
removeCorporateEmployee(id: string, riderId: string, signal?: AbortSignal): Promise<CorporateAccount>
//   409 when the rider has open rides billed to this account

// clients/corporateAccounts.ts — Generate invoice
sendCorporateInvoice(id: string, signal?: AbortSignal): Promise<CorporateInvoice>
//   the period, the total, and the delivery record

// clients/dispatch.ts — does not exist at all
acknowledgeIntervention(id: string, note: string): Promise<Intervention>
reassignIntervention(id: string, driverId: string): Promise<Intervention>
//   needs an `Intervention` type and a fixture first; the two rows on the board
//   are literals in `DispatchScreen`
```

**Three writes that silently discard an argument they are given:**

- `flagTrip(id, _reason)` — `setTripFlag` writes the boolean only, so the category and the
  investigation note the form collects are stored **nowhere**. The *Flagged* view can tell an
  operator a trip is under investigation without telling them what for.
- `freezeSubscription(id, until)` — takes no reason; the form collects one.
- `cancelSubscription` **does** return a server-computed `refundedHalalas`, and the modal was
  showing a browser-side estimate labelled `Calculated refund`. Now labelled *Estimated*, with
  the server's figure in the toast. **The honest fix is a quote endpoint** so the real number is
  on screen *before* the operator commits.

---

## 3. Changes needed in single-owner files

**`useIndexTable.ts` — an index table must be able to decline selection.** This is the blocker
behind §6.

```ts
export interface IndexTableOptions<T> extends BaseTableOptions {
  mode: 'index'
  getRowId: (row: T) => string
  initialSort?: SortSpec | null
  /**
   * §9.1's checkbox column exists to feed a bulk bar. A table with no bulk
   * command has nothing behind the checkbox, and an inert checkbox teaches an
   * operator that a selection does something. Literal `false` only — the
   * selection members then leave the returned type, exactly as they do on a
   * queue without `bulkClaim`.
   */
  bulkActions?: false
}

export interface IndexTableWithoutSelection extends TableCore, TableSorting {
  mode: 'index'
  canSelect: false
  canSort: true
  canRowAction: true
}

// and the overload, above the existing index one:
export function useIndexTable<T>(
  options: IndexTableOptions<T> & { bulkActions: false },
): IndexTableWithoutSelection
```

**`queues/cells.tsx` — `Identity` needs `to: string | null`.** P8-T1's rule is not "every cell
except the first". A record the resolver cannot find has nothing to open from the identity
either, and `Identity` always renders a `<Link>`. `to: string | null`, rendering the name as
muted text when `null`, lets the identity degrade the same way every other name cell does.
Trips and Subscriptions carry a local branch meanwhile; it loses only the avatar, and only on
a row whose record is missing.

**`PageHeader.tsx` — `PageAction` has `disabled` but no `disabledReason`.** §11.2 needs both.
Because it has only the flag, `Generate invoice` moved out of the Corporate detail header into
the *Invoicing schedule* rail card, where the sentence has somewhere to live.

**`EmptyState.tsx` — `EmptyAction` has neither `disabled` nor `disabledReason`.** Corporate's
first-run action therefore renders unconditionally and the refusal happens one step later, in
`NewCorpModal`.

**`i18n/dictionaries.ts` — three screens still cannot register their copy.**

```ts
import { TRIPS_EN } from '@/screens/operations/trips/copy'
import { SUBSCRIPTIONS_EN } from '@/screens/operations/subscriptions/copy'
// ...and `...TRIPS_EN`, `...SUBSCRIPTIONS_EN` in the English assembly.
```

`localCopy.ts`'s `withFallback` bridges it: the strings live in one reviewable dictionary
instead of two hundred `defaultValue` literals inside JSX, and the wrapper becomes a no-op the
day the import lands. Corporate and Dispatch still use inline `defaultValue` and want the same
treatment; they were not in this task's scope.

---

## 4. Two edits I made outside `src/screens/operations/**`

Both additive, both defaulted, no existing call site changed.

1. **`screens/queues/QueuePage.tsx` — `QueueTable` gained a `bulkActions` passthrough.** The
   adapter dropped the prop on the floor, so no queue could have a bulk bar however it declared
   one. Shared with Support (Safety, Fairness) — please confirm no one else is mid-edit there.
2. **`screens/operations/corporate/corporate.test.tsx`** — `LINK_EMPLOYEE` constant updated from
   `Link Employee` to `Link employee` (`copy.md` 2, sentence case). The copy changed; the
   constant followed.

---

## 5. Where the bulk-set rule produced an awkward result

**Subscriptions has exactly one bulk command, and `Cancel and settle` is deliberately not the
second.** It moves money, the refund is server-computed per record, and twelve refunds
committed from one pill is a different risk from twelve freezes. §9.3's "bulk disposition MUST
NOT ship" is scoped to queues, so nothing in the document forbids it — I narrowed on judgement
and am flagging it rather than smoothing it over. **product-designer's call.**

**A queue's bulk bar offers `Claim` and not `Release`.** §9.3 permits "a claim or assign
action"; release is neither, though it is on the same ownership axis and decides nothing. The
strict reading shipped. If release is wanted over a set, it is a one-line addition and a
sentence in §9.3.

**A bulk take-over is blocked rather than offered, on all three queues.** AC-203 makes a
take-over a confirmed act that *names* the operator losing the item; over a set it would strip
N owners and name none of them. So a row already held is `.blocked`, and `Select only the N
eligible` is how an operator gets past it in one click. This is the case where D21's escape
hatch earns its keep — without it, one held row in twelve would make the bar useless.

**Two refused actions can render two `Select only…` controls.** On Trips, a selection mixing
flagged and unflagged rows refuses `Flag` *and* `Remove flag`, each with a different eligible
set. Correct, and legible — but worth a designer's eye at three or four bulk actions.

**`captains.ts` still declares only `.one` and `.other`.** A selection in which *every* captain
is already suspended reads `3 of the selected captains are already suspended` where D21 asks for
`All 3 selected captains are already suspended`. The `.all` key belongs beside the other two in
the domain registry — a file this task does not own. `eligibleIds` **is** wired at that call
site, derived from the same predicate.

---

## 6. Screens where selection is inert, and why I did not invent a command

`CorporateScreen` and `RidersView` render a checkbox column and a select-all with **no bulk bar**,
because `mode: 'index'` sets `canSelect: true` unconditionally.

- **Corporate:** the client offers `createCorporateAccount`, `updateCorporateUsagePolicy` and
  `addCorporateEmployee`. None means anything over a *set of accounts*.
- **Riders:** `clients/riders.ts` has **no mutation at all** — `listRiders`, `getRider`,
  `listNewRiders`, `getRiderFacets`.

Inventing a bulk suspend or a bulk invoice would be a design decision. The right fix is to
suppress the selection, which needs the `useIndexTable` diff in §3.

---

## 7. P8-T1 — the contract, and the one thing I could not close

`EntityLink.tsx` reproduces `screens/financials/shared/entityLinks.tsx`'s **resolver-asking**
contract to the letter: prefix pre-filter → `resolveProfile` per distinct id → **a 404 is
remembered, any other failure is not**. Reproduced rather than imported, because
`operations → financials` is exactly the cross-directory reach `queues/cells.tsx` warns about.

**The one divergence, and it is inside the contract, not from it:** `PROFILE_ID_PREFIXES` adds
`PAY-`, `APP-`, `TKT-` and `CMP-`, because Operations rows name a trip's payment, a captain
application, a ticket and a complaint. The prefix list is a per-workspace pre-filter of *which
ids are worth asking about* — Financials' own comment scopes it that way.

**Consolidation is wanted and belongs to neither of us:** one shared module, in `src/lib` or a
shared `screens/` directory, with one cache. Two module-scoped caches means the same id is asked
twice when an operator crosses workspaces. Cheap, but real.

**`data/types/work.ts` — I did not change the deep links, and here is why.** Six of nine queues
route to a queue *index* rather than a record. Four of those six have **no `all` view and no
record route**, so a `?view=X&X.q=<id>` deep link would land the operator on a filtered list that
may not contain the record — strictly worse than the index. Three of the six point into Support
screens owned by other agents right now. The real fix is a record route per queue, or an `all`
view per queue; both are route-table changes.

---

## 8. Other defects found and reported, not fixed

- **`FlagTripModal` / `FreezeModal` collect a reason nobody stores** — see §2.
- **`CancelSettleModal`'s refund was computed in the browser** — see §2.
- **`clients/profile.ts` resolved against the seed arrays, not the `all*` arrays.** Fixed by the
  fixtures owner mid-task; `EntityLink`'s contract depends on it.
- **`routeTable.ts` still declares `pending` rather than `needs-decision`**, and still marks
  `all` default on Requests (carried forward from wave 2, unchanged).
- **`useIndexTable` has no way for an index table to opt out of selection** — §3.
