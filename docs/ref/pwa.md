# Offline and installability

Source: `design/18-pwa-arabic-and-voice.md` Part 1. Nothing here is built yet — this file is
the contract to build against, not a description of the app.

## Current state, verified

| Thing | State |
|---|---|
| `public/` | **does not exist** |
| `manifest.webmanifest` | none |
| service worker | none |
| `vite-plugin-pwa` / `workbox` | not in `package.json` |
| `vite.config.ts` | react + tailwind + vitest only |
| viewport | `index.html:5` — `<meta name="viewport" content="width=1280" />` |

## The conflict, and the reframe

That fixed viewport is **deliberate**: the design law has no second breakpoint. A
phone-shaped PWA contradicts it head-on.

**So do not treat PWA as mobile.** Five of the six benefits need no responsive work at all:

1. **Installable standalone window** — reclaims ~90px of browser chrome. Round 17 measured
   only ~10.7 rows fitting at 1280; this is the cheapest row-count win available.
2. **Offline shell** — the app opens without a network.
3. **Cached last-known reads** — an operator sees yesterday's queue instead of a spinner.
4. **Queued mutations** — an action taken on a dropped connection is not lost.
5. **Push** — an SLA breach reaches someone who is not looking at the tab.

Only the sixth, phone layout, conflicts. **Ship five, defer one, and record the deferral as
scope** — never as an oversight.

## Three hard parts already exist

- **`src/hooks/useAsync.ts` + `src/hooks/requestCache.ts`** already implement
  stale-while-revalidate. Only ~2 of ~250 call sites use it. The cache policy is a
  configuration problem, not an architecture problem.
- **`src/data/clients/realtime.ts`** already has reconnect-with-backoff. Offline is the same
  state machine with a longer tail.
- **One data seam.** Every read goes through `src/data/clients/`. A service worker has
  exactly one layer to intercept — this is the reason the whole plan is cheap.

## Caching policy

| Class | Policy |
|---|---|
| App shell, fonts, icons | precache, cache-first, versioned |
| Index reads, detail reads | stale-while-revalidate, and **the staleness is shown** — never render a cached figure as if it were live |
| Money figures, balances, payout state | network-first. A stale halala is worse than a spinner |
| Reports, exports | never cached |
| Auth, session | never cached |

## Mutation queue rules

- **Only idempotent or explicitly re-playable mutations queue.** A payout does not queue.
- A queued mutation is **visible** — the operator can see it, name it, and cancel it before
  it flushes.
- Flushing is **not silent**. On reconnect, the operator confirms or is told what replayed.
- Conflict on replay resolves toward **refusing and surfacing**, never toward last-write-wins.
- Every queued item carries the four states like anything else. See [states.md](states.md).

## Phasing

P1 installable shell (1d) → P2 offline reads (2d) → P3 queued mutations (3d) → P4 push (2d).
P3 is where the risk is; do not fold it into P2 to save a day.
