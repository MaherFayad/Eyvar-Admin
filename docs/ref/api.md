# The API contract

Full handover: [`docs/07-api/`](../07-api/README.md). This is the one-page version.

## The shape of the problem

**290 endpoints, 46 client modules, ~64,000 lines under `src/data/`.** A backend engineer
cannot read that, so the contract is consolidated into **four files** they read instead:

| File | Written by | Content |
|---|---|---|
| [`07-api/CONTRACT.md`](../07-api/CONTRACT.md) | hand | conventions that apply to all 290 |
| [`07-api/ENDPOINTS.md`](../07-api/ENDPOINTS.md) | **generated** | every endpoint |
| [`07-api/endpoints.json`](../07-api/endpoints.json) | **generated** | the same, machine-readable |
| [`07-api/OPEN-QUESTIONS.md`](../07-api/OPEN-QUESTIONS.md) | hand | what we guessed and need confirmed |

```bash
npm run api:contract   # regenerate the two generated files
npm run api:check      # exit 1 if stale or if a client is malformed
```

## Why it cannot drift

`ENDPOINTS.md` is extracted from the docblock above each exported client function by
`scripts/extract-api-contract.py`. **Nobody writes it.** So a docblock is not documentation
that rots — it is the source, and the annotation format is load-bearing:

```ts
/**
 * GET /api/v1/drivers
 *   params: q, status, page, pageSize, sort, filter
 *   -> Paginated<Driver>
 *   404 when the id does not exist
 */
export async function listDrivers(...)
```

`POST /api/v1/alerts . PATCH /api/v1/alerts/:id` on one line documents two routes sharing a
body and a return type. Break the format and the endpoint silently vanishes from the index.

## The vocabulary, in one screen

Authority is `src/data/types/common.ts`. Nothing below is negotiable inside the frontend.

| Thing | Rule |
|---|---|
| Money | **integer halalas**, never a float or a formatted string. Negatives are legal |
| Time | ISO 8601 **with offset**. Never epoch millis, never a display string |
| Ids | opaque strings |
| Lists | **always `Paginated<T>`**, even when one page fits today. `page` is 1-based |
| Errors | **one `ApiError`**. UI branches on `kind`, never on the message |
| `retryable` | decides whether the error state offers **Try again**. 401/403 are not retryable |
| Filter options | from **facet endpoints**, never hardcoded in a screen |
| View tabs | `?view=` is a **query param, never a route** |
| Server text | `LocalisedText { key, params }` — a concatenated sentence is untranslatable |
| Badges | five tones, closed. **No red badge** |
| Claims | server state. `ClaimAffordance` is derived server-side, never in a component |

## The seam

```
src/data/config.ts     DATA_SOURCE: 'mock' | 'http'  <- the switch, and the only file
src/data/clients/*.ts  same signatures in both modes
src/data/clients/http.ts      request transport. `toSearchParams` is the wire format
src/data/clients/realtime.ts  subscription transport. Same invariants
```

**A component that imports a fixture has broken the seam.** Fix it on sight.

`http.ts` and `realtime.ts` both state that their wire format is **a proposal to whoever
builds the API** — if the server disagrees, one function changes. Do not defend the format
as if it were decided.

## The checker's one blind spot, and how it was closed

`api:check` reported **"284 endpoints, no problems"** while six ticket endpoints were
absent from the handover entirely — `listTickets`, `getTicket`, `claimTicket`,
`replyTicket`, `resolveTicket`, `reopenTicket`. A checker that reads docblocks cannot see
a function that has none, so it validated the endpoints it could see and reported clean on
the ones it could not.

The `missing-annotation` rule now flags any exported client function that reaches the
transport with no route docblock. The real count is **290**.

**The general lesson is the one already in [verify.md](verify.md): a check that matches
formatting rather than meaning reports clean on the defect it exists to find.** This is the
second instance in this file's own tooling — the first was a one-line `_OPERATIONS` block
the entry regex could not match.

## Known problems in the contract itself

**None.** `npm run api:check` exits 0: 290 endpoints, no problems, and `ENDPOINTS.md` has
no Problems section. The 52 that stood here — 7 double-slash facet paths, 6 endpoints with
no return annotation, 39 clients that never called `registerOperations()` — are closed;
`07-api/OPEN-QUESTIONS.md` keeps the record of what each one was.

Two of those cost nothing to re-introduce, so know where they came from:

- **A one-line operations block used to be invisible to the checker** — it matched
  `key: 'value',` at line ends, so `export const X_OPERATIONS = { list: 'x.list' } as const`
  declared ids and still reported clean. Two clients were unregistered that way.
  **Closed 2026-09-02:** the checker now matches the *declaration name*
  (`\b[A-Z][A-Z0-9_]*_OPERATIONS\s*[:=]`), which cannot be written on more or fewer lines.
  The lesson stands even though the hole does not — a checker that matches formatting
  rather than meaning reports clean on the defect it exists to find.
- **Registration must be at module load, beside the constant block**, not on first call.
  `mock()` registers when it runs, so an operation nobody has invoked yet is missing from
  `knownOperations()` and from any validation of `?mockFail=`.
