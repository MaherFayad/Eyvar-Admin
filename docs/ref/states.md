# States

Four base states on every screen, plus every domain state the spec names. This is the
single most common thing shipped incomplete.

## The four

| State | Trigger | What it shows |
|---|---|---|
| **Content** | Data arrived, non-empty | The thing |
| **Empty** | Request succeeded, zero records | See below — the two kinds differ |
| **Loading** | Request in flight | Skeleton matching the content's shape, not a spinner |
| **Error** | Request failed | What happened + how to retry, as an imperative |

Build them in that order in code. Writing them in order makes omitting one visible.

## Two kinds of empty (R8)

| Kind | Treatment |
|---|---|
| **Whole page, zero records ever** — no drivers yet, no discounts yet | Illustration + heading naming the value of the section + 1–2 sentence body + at least one action |
| **Empty card, section, timeline, or filtered-to-zero** | **One grey sentence.** No illustration, no heading. Add a plain-button action only if one genuinely exists |

Filtered-to-zero is not first-run. "No drivers match these filters" with a clear-filters
action — never the first-run illustration, which implies the data does not exist.

## Domain states

The four base states are the floor, not the ceiling. Each spec names more, and they are
where the real defects live:

- a trip mid-ride · a wallet reconciling · a fraud case claimed by another operator
- a record locked, expired, suspended, or pending approval
- a breached SLA (§8.4 — needs the R5a row marker, not a red badge)
- a partial failure: the list loaded, one row's action failed

## Checks

- [ ] All four base states exist and are reachable
- [ ] Every domain state in the spec has a design and fixture data
- [ ] Loading is a skeleton shaped like the content, not a centred spinner
- [ ] Error names the fix, without "please", "invalid", "failed", or blame
- [ ] Empty state copy is final in the design spec — not written by the engineer at build time
- [ ] Mock clients can be made to fail, so the error state is testable at all

## Why this keeps failing

Loading and error are where operators spend their frustrating minutes, and they are the two
states nobody demos. A spec that omits them produces a screen that omits them, and QA has
nothing to fail it against.
