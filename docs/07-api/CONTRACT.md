# The contract

Conventions that apply to **all 290 endpoints**. Read this once and you can read
[ENDPOINTS.md](ENDPOINTS.md) as a list of paths rather than 290 separate designs.

The authority is `src/data/types/common.ts` — it is commented and it is what the screens
actually compile against. This file is that file in prose, plus the parts that live in
`http.ts` and `config.ts`. Where the two disagree, **`common.ts` wins and this file is
stale**; say so rather than working around it.

---

## 1. Base and versioning

```
{API_BASE_URL}/api/v1/...
```

`API_BASE_URL` is `VITE_API_BASE_URL`, empty for same-origin. The version prefix is a
constant in `src/data/config.ts`, not repeated per client. **A breaking change means `v2`,
not a new field name** — the frontend can carry both prefixes during a migration.

## 2. Envelopes

Three, and no fourth.

```ts
Paginated<T>  { items: T[], page, pageSize, total, totalPages }
Single<T>     { data: T }
CountResult   { count: number | null }
```

- **Every index endpoint returns `Paginated<T>`**, including ones that fit on one page
  today. A screen written against a bare array has to be rewritten the first time a tenant
  has 1,200 captains.
- `page` is **1-based**. `totalPages` is `ceil(total / pageSize)` with a **minimum of 1**,
  so an empty result still has a page 1.
- `total` is the count **after filters, before pagination**.
- `Single<T>` exists so `data` can gain `meta` or `links` later without a breaking change.
  Some endpoints return `T` bare — [ENDPOINTS.md](ENDPOINTS.md) says which. That
  inconsistency is ours; if you would rather we normalise it, say so.
- `CountResult.count === null` means **"this resource has no backlog concept"**. It is not
  zero, and the UI renders it differently.

Default page size is **25** (`DEFAULT_PAGE_SIZE`).

## 3. Query wire format

Serialised in exactly one place — `toSearchParams` in `src/data/clients/http.ts`. **This is
a proposal, not a demand.** If the server prefers another encoding, that one function
changes and nothing else does. Tell us early.

| Param | Form | Example |
|---|---|---|
| `page` | 1-based integer | `page=2` |
| `pageSize` | integer | `pageSize=25` |
| `q` | free text | `q=fahad` |
| `view` | view-tab id | `view=expiring-7d` |
| `sort` | `field:dir` | `sort=joinedAt:desc` |
| `filter` | repeated, `field:op:value` | `filter=status:in:active,frozen` |

- **`sort.field` is a domain field name, never a column index.** The server sorts; the table
  asks.
- Operators: `eq neq in nin gt gte lt lte contains between isNull isNotNull`. Array values
  are comma-joined.
- **`view` is a control, not a level.** A view tab is a query parameter and must never
  become its own route. Each resource's legal `view` ids are in its client docblock.
- Resource-specific params (`status`, `riderId`, `kind`) ride alongside as plain scalars.

**Sortable and filterable fields are declared per endpoint** in the client docblock, and
`ENDPOINTS.md` carries them. A field not on that list may 400 — please do, rather than
silently ignoring it.

## 4. Facets — do not make us hardcode a dropdown

Any `select` or `multi-select` filter gets its options from a facet endpoint:

```ts
Facets = Record<string, FacetValue[]>       FacetValue = { value: string, count: number }
```

`count` lets a dropdown show `Riyadh (52)` and lets an operator see that a value exists but
is currently empty. Facets respect the **other** active filters. The alternative is a
hand-written list in a screen, which is wrong the first time a third city is seeded.

## 5. Errors — one type, and `kind` is what matters

Every failure, mock or real, becomes an `ApiError`:

```ts
{ status, kind, code, message, details: ApiErrorDetail[], requestId, retryable }
```

`kind` is derived from status and is what the UI branches on. **Never the message string** —
messages are copy and belong to the design system, not the API.

| Status | `kind` | `retryable` |
|---|---|---|
| 0 (network) | `network` | yes |
| 401 | `unauthorized` | **no** |
| 403 | `forbidden` | **no** |
| 404 | `not-found` | no |
| 408 | `timeout` | yes |
| 409 | `conflict` | no |
| 422 | `validation` | no |
| 429 | `rate-limited` | yes |
| 5xx | `server` | yes |

`retryable` decides whether the error state offers **Try again**. Getting the status right
therefore changes what an operator can do, not just what they read.

**`details[]` is how a form shows a field error**: `{ field, code, message }`, `field` being
a dotted path. Without it, a 422 can only be shown as a banner over the whole form.

**`requestId` on every response, success or failure.** It is what a support engineer quotes.

## 6. Money

**Integer halalas. Always. 1 SAR = 100 halalas.**

```ts
type Halalas = number
interface Money { amount: Halalas; currency: 'SAR' }
```

- Never a float, never a formatted string, never `"12.34"`. Formatting is the UI's job and
  depends on locale and text direction.
- **Negative values are legal and meaningful**: an overdrawn rider wallet, a captain debt, a
  reversed payout. Do not clamp them.
- `currency` is `'SAR'` only today. The field exists so that stays a choice.

### The one exception, and it is deliberate

**`POST /api/v1/reports/export` returns `ReportCsvRow.value` as decimal SAR, not
halalas**, with a `currency` column beside it. A CSV is opened by a person in a
spreadsheet, and `29505` in a revenue column is not a number anybody can read.

This is the only place in the product where money crosses the seam as a decimal.
It was recorded in `src/data/types/report.ts` and nowhere else, which meant a
backend engineer reading only this contract would return halalas and **every
exported revenue figure would be 100x too large** — in a file that goes to
finance, in a format nothing validates.

Everywhere else, including every field of every JSON response, money is integer
halalas. If you find yourself adding a second exception, it is probably wrong.

## 7. Dates and ids

- **`IsoDateTime`** — ISO 8601 **with offset**: `2026-06-25T09:14:00+03:00`. Not epoch
  millis, not a display string. The UI formats; the API never does.
- **`IsoDate`** — `2026-06-25` for calendar dates with no time.
- **Ids are strings**, opaque to the frontend. Do not send numbers we would have to keep as
  numbers.

## 8. Server-composed text must be a key, not a sentence

```ts
interface LocalisedText { key: string; params?: Record<string, string | number> }
```

The product ships Arabic. A concatenated sentence is **untranslatable by construction** —
Arabic does not put the noun where English does. So a ledger description arrives as
`{ key: 'fin.posting.tripFare', params: { driver: 'Fahad', amount: 4500 } }`, and the UI
resolves it.

**Money params stay integer halalas** so the UI's formatter is still the only formatter.

Any enum you return must have a stable machine value (`fare_dispute`, not "Fare dispute").
The label is ours. Renaming a value is a breaking change.

## 9. Badge tones

Five, closed: `success · warning · info · neutral · new`. **There is no red badge.**

Nav counts use a separate two-value vocabulary: `attention · neutral`.

If a domain status has no home in the five, that is a design question — raise it, do not
invent a sixth.

## 10. Claims — server state, not UI state

Work-queue items can be claimed by an operator. A claim survives a route change, expires on
**the server's clock** (legacy stale window: 30 minutes), and is **not a lock** — a
deliberate take-over is legal and recorded.

```ts
Claim            { key: '<type>:<id>', entityType, entityId, ownerId, ownerName,
                   claimedAt, touchedAt, state, releasedAt, releaseReason, takeovers[] }
ClaimAffordance  { claim, heldByMe, canClaim, canRelease, canTakeOver }
```

**`ClaimAffordance` is derived server-side and never re-derived in a component.** The server
knows the session, the permissions and the clock; the frontend knows none of the three
reliably.

## 11. Auth

Not yet designed. `src/data/clients/session.ts` and `auth.ts` carry the shapes the screens
already use — sign-in, session, devices, sign-out-everywhere. **See
[OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) Q1**; the scheme is your call, and the frontend
adapts in `http.ts` only.

What the UI already assumes:
- A **401 is not retryable** and routes to sign-in.
- A **403 is a refusal that must name the missing permission**, because the refusal copy
  tells the operator who can grant it. A bare 403 makes that copy impossible.

## 12. Cancellation and idempotency

- Every client passes an `AbortSignal`; the transport passes it to `fetch`. A cancelled
  request is not an error state.
- **Mutations that a retry could duplicate need an idempotency key.** Payouts, refunds,
  wallet adjustments and message sends are the ones that matter. See OPEN-QUESTIONS Q3 —
  this one has a cost if it is decided late.

## 13. Operation ids

Every operation has a stable dotted id: `drivers.list`, `auth.signIn`, `payouts.pay`. They
are frontend-side (they drive failure injection and the QA panel), but **matching them in
your logs makes a production incident traceable in one grep.** The full list is in
`endpoints.json`.
