# Relation extraction data (machine-generated)

Mechanically extracted from `eyvar_ops_panel_v40_fixed.html`. No interpretation —
these are the raw inputs to the narrative documents in `docs/04-relations/`.

| File | Contents | How produced |
|---|---|---|
| `db-usage-matrix.tsv` | `collection <TAB> function <TAB> R\|W` — 1,183 edges | awk: attribute every `DB.<key>` occurrence to its enclosing function |
| `nav-edges-html.tsv` | `from-page <TAB> to-page <TAB> line` — 26 edges | awk over HTML region L472-2165, attributing `go('x')` to the enclosing `.page` div |
| `nav-edges-js.tsv` | `function <TAB> to-page <TAB> line` — 56 edges | awk over JS region, attributing `go('x')` to the enclosing function |
| `collections-in-literal.txt` | top-level collections inside the `var DB={...}` literal | grep for `^  key:{` / `^  key:[` in L2566-2915 |
| `collections-late-assigned.txt` | collections created later via `DB.x=` | grep `^DB\.[a-z]*=` |
| `collections-referenced.txt` | every `DB.<key>` referenced anywhere | grep + sort -u |

## Caveat recorded during extraction

A first attempt at "collections defined but never read" produced 13 false
positives (`weekly`, `monthly`, `approve_driver`, `permission_denied`, …). These
are **nested keys** inside `DB.plans` and `DB.actionLabels`, not top-level
collections — the parser matched any two-space-indented `key:`. The pattern was
tightened to require `:{` or `:[`. Recorded here because the corrected result —
**every referenced collection is defined; there are no dangling references** —
is only trustworthy if the method that produced it is visible.

---

## Addendum — write matrix (added during the relations pass)

| File | Contents | How produced |
|---|---|---|
| `db-writes.tsv` | `collection <TAB> function <TAB> line <TAB> DIRECT\|ALIAS` — 363 write sites, 239 distinct (collection, function) pairs across 87 collections | two awk passes over the JS region `L2166`–`L21855`, scripts included below |
| `extract-writes-direct.awk` | pass 1 — `DB.x….=`, `+=`, `++`, `.push/.unshift/.splice/.pop/.shift/.sort`, `delete DB.x…` | run with `awk -f extract-writes-direct.awk eyvar_ops_panel_v40_fixed.html` |
| `extract-writes-alias.awk` | pass 2 — binds function-scoped aliases (`var a = DB.x[…]`, `DB.x.forEach(function(p)`) then flags `a.field =` | same invocation |

### Why a second write extraction was needed

`db-usage-matrix.tsv` marks only **93** of its 1,183 rows as `W`, because its write detector matched
only top-level `DB.x =` reassignment. It reports **zero** writers for `riders`, `drivers` and `trips`
— collections that are in fact mutated by 11, 13 and 7 functions respectively. Any conclusion about
shared-write coupling drawn from the `W` column of that file would be wrong.

### Known limits of the new extraction (do not treat as exhaustive)

1. **Second-level aliases are invisible.** `saveCancellationPolicy` (`L7374`–`L7381`) mutates
   `DB.cancellationPolicy` through `getCancellationRule(id)`; `saveSlaPolicy` (`L15143`) mutates
   `DB.slaPolicy` through `DB.slaPolicy.tiers[…]`; `saveCompPolicy` (`L15489`) through
   `DB.compPolicy.roles[…]`. None appears in `db-writes.tsv`. Every "collection with no writer"
   claim in the narrative docs was therefore re-grepped by hand before being stated.
2. **Function attribution drifts.** The enclosing-function tracker takes the last `function NAME(`
   seen, so a write that follows a nested named function is attributed to the inner one. Known
   drifts corrected by hand: `L7029`→`payDriver` (not `goBack`), `L7077`→`confirmApplyDeduction`,
   `L5450`→`toggleAutoRenew`, `L8540`→`logCallOutcome`, `L8564`→`logDriverCall`,
   `L8594`→`sendRiderChangeNotif`, `L8646`→`confirmPostponeTrip`, `L8731`→`executePayout`.
   Rows whose source line starts at column 0 with `DB.` are labelled `(top-level init)` in the
   narrative and excluded from writer counts.

### Correction to `nav-edges-js.tsv`

A direct scan finds **135** `go(…)` call sites over **37** distinct target pages. The two nav-edge
files together contain 82. The 53 missing sites use escaped quotes inside generated HTML strings —
`onclick="…go(\'live\',null)"` (e.g. `L8251`, `L8452`) — which the extractor's `go\('…'` pattern
skips. `MODULE-DEPENDENCY-MAP.md` §5–§6 uses the corrected scan.

---

## ⚠ Correction: the `W` column in `db-usage-matrix.tsv` is UNRELIABLE

**Do not use `db-usage-matrix.tsv` to determine writers.** The read side is
sound; the write side is broken.

### The defect

The extractor classified an occurrence as a write only when `=` appeared
immediately after the matched `DB.<key>` token:

```awk
w = (substr(line,RSTART+RLENGTH,1)=="=" || substr(line,RSTART+RLENGTH,2)==" =") ? "W" : "R"
```

That matches `DB.foo=` and nothing else. It misses every real-world write form:

- `DB.riders[id].status='x'` — assignment through an index and a property
- `DB.trips.push(...)` / `.unshift(...)` — mutation by method
- `delete DB.complianceSuspensions[d]`
- `var p=DB.payouts[id]; p.pending=0` — write through a captured alias

### The consequence, measured

| Collection | Writers per this file | Writers in reality |
|---|---:|---:|
| `riders` | **0** | many |
| `drivers` | **0** | many |
| `trips` | **0** | many |
| `subscriptions` | **0** | 18 functions across 9 modules |
| *total write sites* | **93** | **363** |

Zero writers for the four most-written collections in the system. Any coupling
or ownership conclusion drawn from this column would be exactly backwards.

### Use this instead

`docs/04-relations/data/db-writes.tsv` — rebuilt with a two-pass, alias-aware
extractor (363 write sites, 239 distinct collection↔function pairs, 87
collections). The extraction scripts are alongside it. `MODULE-DEPENDENCY-MAP.md`
and `COUPLING-ANALYSIS.md` are both built on the corrected data.

### Also affected: `nav-edges-js.tsv`

Misses **53 of 135** `go()` call sites — those written with escaped quotes inside
generated HTML strings (`onclick=\"go(\'x\')\"`), which the awk pattern for bare
`go('x')` cannot see. The navigation flowchart in `MODULE-DEPENDENCY-MAP.md` uses
the complete set.

### Why this is left in place rather than deleted

The file is kept, clearly marked, because three documents were written while it
was believed correct and a reader may encounter a conclusion traceable to it.
Deleting the evidence of a flawed input makes the flaw harder to trace, not
easier. The read side remains usable and is what the 1,183-edge figure quoted
elsewhere refers to.

*Found by the relationship-mapping agent, which rebuilt the write side rather
than accepting the supplied data — and verified independently: filtering this
file for `riders`/`drivers`/`trips`/`subscriptions` writes returns 0 rows each.*
