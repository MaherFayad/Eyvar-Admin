---
name: mock-resource
description: Add a typed mock data resource for Eyvar Admin behind a client seam that swaps for a real API without touching UI code. Use when a screen needs data, when adding a domain resource, or when modelling types from the legacy app. Creates types, fixtures, and the client.
---

# Add a mock resource

## 1. Derive the shape from what exists

Do not invent fields. Grep `eyvar_ops_panel_v40_fixed.html` for the resource name, find
the seeded objects and the render functions that consume them, and record which fields are
real, which enums are actually used, and which values are actually null. Cite `file:line`.

Cross-check against the feature spec's Data table. Where they disagree, that is a finding
for product-owner — not something to resolve silently.

## 2. Create four files

```
src/data/types/<resource>.ts       the contract
src/data/fixtures/<resource>.ts    seeded, deterministic data
src/data/clients/<resource>.ts     the seam
src/data/clients/<resource>.test.ts
```

**Types — model the API, not the fixture.**

```ts
export type DriverStatus = 'active' | 'inactive' | 'suspended' | 'pending'

export interface Driver {
  id: string                    // string ids, always
  name: string
  status: DriverStatus
  walletBalance: number         // integer minor units (halalas), never a float
  lastTripAt: string | null     // ISO 8601, nullable where the server allows null
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
```

**Client — identical signatures in both modes.**

```ts
/**
 * GET /api/v1/drivers?status=&page=&pageSize=
 * -> Paginated<Driver>
 */
export async function getDrivers(params: DriverQuery): Promise<Paginated<Driver>> {
  if (config.DATA_SOURCE === 'http') return http.get('/api/v1/drivers', params)
  await delay(config.MOCK_LATENCY_MS)
  if (mockFailure.get('getDrivers')) throw new ApiError(503, 'Service unavailable')
  return paginate(filterDrivers(driverFixtures, params), params)
}
```

The endpoint comment above each client is the handoff to whoever wires the backend. Write
it properly.

## 3. Seed data that will break things

Fixtures full of tidy three-word English names produce screens that collapse on real data.
Include, deliberately:

- A long Arabic name, and a long English one that overflows its column
- A record in **every** state the feature spec names
- Zero, negative, and very large numbers — a wallet that is overdrawn
- Nulls in every nullable field
- Enough rows to exercise pagination
- A record that is claimed/locked by another operator, where the domain has that

## 4. Check

- [ ] No component imports a fixture directly — only clients
- [ ] Every client returns a Promise; nothing is synchronous
- [ ] Failure is injectable per client, so QA can reach the error state
- [ ] No `Math.random()`, no `Date.now()` at module scope — visual regression cannot diff
      data that changes per run
- [ ] Money is integer minor units; formatting is the UI's job (§8.3)
- [ ] Every spec state has fixture data reaching it without hand-editing
- [ ] Each status enum value has a badge tone in the design spec's five-tone palette (R7);
      if one doesn't, raise it rather than inventing a sixth
- [ ] Each client documents the endpoint that will replace it

## Common failures

- **Synchronous mocks.** They hide every loading state, and the loading state then never
  gets built.
- **Types shaped for the fixture.** Convenient now, a migration later. Model the envelope,
  the nullability, and the ISO strings from day one.
- **Data too clean to be useful.** If no fixture breaks a layout, visual QA will pass a
  screen that real data will break.

## Reference

Check the small file, not the whole document:
`docs/ref/states.md` · `docs/ref/modules.md` · `docs/ref/defects.md`

Index: `docs/ref/README.md`. For a section's full text read its partial in
`docs/06-design-reference/_partials/`; which rule wins is `docs/RULINGS.md`.
