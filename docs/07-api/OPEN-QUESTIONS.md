# Open questions for the backend

Everything here is a place where the frontend **guessed and shipped**, because a working
mock beat a blocked screen. Each guess is behind a seam, so overruling one is cheap for us —
but only until the API is built. **Answer these before you write handlers.**

Format: what we assumed, what it costs to change, and who decides.

---

## Blocking — these change endpoint shapes

### Q1. Auth scheme
**Assumed:** nothing. `session.ts` and `auth.ts` carry the shapes the screens use
(sign-in, current session, device list, sign-out-everywhere) but no transport.
**Needs:** cookie or bearer, refresh model, session lifetime, and how device revocation
works.
**Cost to change:** low for us — `http.ts` only. High if decided after the first screens are
cut over.
**Two things the UI already depends on:** a 401 is **not retryable** and routes to sign-in;
a **403 must name the missing permission**, because the refusal copy tells the operator who
can grant it. A bare 403 makes that copy impossible to write.
**Decides:** backend + security.

### Q2. Pagination: offset or cursor
**Assumed:** offset — `page` / `pageSize` / `total` / `totalPages`, 1-based.
**Why:** the UI shows "page 3 of 47" and lets an operator jump. A cursor cannot do that.
**Cost to change:** high. It changes the envelope, the table footer, and the URL state on
every index screen.
**If you need cursors for scale**, say so now and say for which resources — we would rather
build a hybrid than retrofit one.
**Decides:** backend, on data volume.

### Q3. Idempotency keys on money mutations
**Assumed:** none, because the mock cannot double-charge.
**The problem:** payouts, refunds, wallet adjustments and message sends are all reachable
from a button that a slow network invites an operator to press twice. This gets worse with
the offline mutation queue (see `docs/ref/pwa.md`), which replays on reconnect.
**Proposal:** client-generated `Idempotency-Key` header on every non-GET, server dedupes for
24h and returns the original response.
**Cost to change:** low now, very high after go-live.
**Decides:** backend. **This is the one on this page most likely to cost real money.**

### Q4. Permissions model
**Assumed:** 20+ permission keys exist in the UI with **zero labels**, and the frontend does
not know where they come from.
**Needs:** are permissions returned with the session, per resource, or both? Is the frontend
allowed to hide a control it lacks permission for, or must it show and refuse?
**Cost to change:** medium. It affects every action surface.
**Decides:** product + backend together.

---

## Shape questions — answer before we cut over

### Q5. `Single<T>` or bare `T`
Some endpoints return `{ data: T }`, some return `T`. [ENDPOINTS.md](ENDPOINTS.md) says
which. **The inconsistency is ours.** We would prefer to normalise on `Single<T>` so `meta`
and `links` can be added later without a break. Tell us if you disagree; changing it now is
a find-and-replace in `src/data/clients/`.

### Q6. Query string encoding
`toSearchParams` in `http.ts` proposes `sort=field:dir` and repeated
`filter=field:op:value`. **It is a proposal.** If your framework prefers
`sort[field]=`/`filter[status][in]=`, one function changes and nothing else does. Say so
before we build 284 handlers around the current form.

### Q7. Facet recomputation
We assume facet counts respect the **other** active filters — filtering to Riyadh changes
the status counts. That is more expensive to compute. If it is too expensive, we need to
know, because "Riyadh (52)" being wrong is worse than not showing a count at all.

### Q8. Realtime transport
`realtime.ts` proposes one connection, many topics, one envelope, with **`seq` monotonic per
topic from 1** and a `since` map on resubscribe so a reconnect replays what was missed.
**Needs:** WebSocket or SSE, and whether per-topic sequence numbers are feasible. The
sequence is what makes reconnect correct rather than approximate; without it we can only
refetch.

### Q9. Timezone
Every timestamp carries an offset, and the product is Saudi-only, so we assume `+03:00`
throughout. **Confirm the server stores UTC and renders the offset**, rather than storing
local time. A daylight-saving assumption is not a risk in Riyadh, but a mixed-storage
one is.

### Q10. Sortable and filterable field lists
Each endpoint declares them in its docblock. **We would like a 400 on an undeclared field**
rather than silent ignoring — a silently ignored sort looks to an operator like the data is
wrong.

---

## Ours to fix, not yours

Listed so you do not report them back to us.

| Problem | Count | Where |
|---|---|---|
| Facet paths with a double slash — `/api/v1//drivers/facets` | 7 | `ENDPOINTS.md` → Problems → `malformed-path` |
| Endpoints with no `-> Type` annotation | 6 | `ENDPOINTS.md` → Problems → `no-return` |
| Clients declaring operation ids but never calling `registerOperations()` | 39 | `ENDPOINTS.md` → Problems → `unregistered` |

Run `npm run api:check` to see the current list. The number should reach zero before the
contract is called final.
