# The API contract

Full handover: [`docs/07-api/`](../07-api/README.md). This is the one-page version.

## The shape of the problem

**284 endpoints, 46 client modules, ~64,000 lines under `src/data/`.** A backend engineer
cannot read that, so the contract is consolidated into **four files** they read instead:

| File | Written by | Content |
|---|---|---|
| [`07-api/CONTRACT.md`](../07-api/CONTRACT.md) | hand | conventions that apply to all 284 |
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

## Known problems in the contract itself

`npm run api:check` currently reports **52**: 7 facet paths with a double slash
(`/api/v1//drivers/facets`), 6 endpoints with no return annotation, and 39 clients that
declare operation ids but never call `registerOperations()` — so `?mockFail=` and the QA
panel can see almost none of them.
