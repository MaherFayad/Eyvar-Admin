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

## An empty card says which kind of empty it is (R5-11)

Three different absences wear the same grey sentence if you let them. Conflating any two
is the V-2 defect — the operator cannot tell *broken* from *unbuilt*.

| Situation | Sentence |
|---|---|
| We ranked; this window had nothing to rank | `Nothing to rank for this period.` |
| We queried; this date range returned nothing | `There was no data found for this date range.` |
| Nothing is captured, so no ranking or query is possible | `Nothing is recorded here yet.` |

A card in the third state **keeps its title** — the title is the only thing on screen that
names what is missing. A **tile** in that state does not render at all (R4-11 §11.2): a tile
has no body to put a sentence in, and an em dash claims the number exists somewhere.

## A number that is not there (metric tiles — R5-1)

An em dash is a **claim that the number exists somewhere**. Three different absences, three
different treatments, and only one of them is an em dash:

| Situation | Treatment |
|---|---|
| **The measure has no store at all** | **The tile does not render.** Not an em dash, not a skeleton, not "coming soon" (R4-11 §11.2) |
| **We measure it; today there is nothing** | Em dash where the value goes, **plus the reason on the delta line** — `Not captured yet` / `Nothing to measure yet`. The caption is suppressed (R4-4 §4.6) |
| **The value is a genuine measured zero** | **`0`**, never an em dash, and the delta renders normally |

The em dash in the **delta** position is a separate thing and is always accompanied by its own
reason — no comparison period, no target set, too little data, or the target itself.

`design/09-rulings-r5.md` §10 draws all five.

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
