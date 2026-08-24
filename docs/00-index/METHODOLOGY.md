# Methodology

How this documentation set was produced, in the order it happened. Every step is
reproducible from the commands recorded here.

## Source of truth

A single file, analysed at a fixed state:

| | |
|---|---|
| File | `eyvar_ops_panel_v40_fixed.html` |
| Lines | 21,857 |
| Size | 1,580,139 bytes (1.58 MB) |
| Structure | CSS `L9-468` · HTML body `L472-2165` · JS `L2166-21855` |

No build step, no framework, no backend. All state lives in one global `DB`
object literal beginning at `L2566`; all rendering is string concatenation into
`innerHTML`. This means **the file is the complete specification** — nothing is
hidden behind an API.

## Pipeline

```
Step 0  Structural survey        →  page/tab/function census (this doc + GROUND-TRUTH-INVENTORY.md)
Step 1  Per-module analysis      →  18 parallel agents  →  docs/01-modules/*.md
Step 2  Coverage review (pass 1) →  audits Step 1 against the machine census
Step 3  Accuracy review (pass 2) →  re-reads source, verifies every claim independently
Step 4  Structured extraction    →  docs/03-data/*.json
Step 5  Relationship mapping     →  docs/04-relations/*.md
Step 6  Business restructure     →  docs/05-restructure/*.md
```

## Step 0 — Structural survey

Before any agent ran, the file was censused mechanically so that later coverage
claims could be checked against a number rather than an impression. The commands
are reproducible verbatim:

```bash
# pages
grep -n 'class="page' eyvar_ops_panel_v40_fixed.html
# settings sub-tabs
grep -o 'id="stab-[a-z]*"' eyvar_ops_panel_v40_fixed.html | sort -u
# router branches
sed -n '8787,8825p' eyvar_ops_panel_v40_fixed.html | grep 'if(id==='
# render functions
grep -o 'function render[A-Za-z0-9_]*(' eyvar_ops_panel_v40_fixed.html | sort -u
# interactive elements
grep -o 'onclick="[a-zA-Z_$][a-zA-Z0-9_$]*(' eyvar_ops_panel_v40_fixed.html | sort -u
# element ids / i18n keys
grep -o 'id="[^"]*"'        eyvar_ops_panel_v40_fixed.html | sort -u
grep -o 'data-i18n="[^"]*"' eyvar_ops_panel_v40_fixed.html | sort -u
```

Result: **41 pages · 21 settings sub-tabs · 9 sidebar sections · 30 nav items ·
38 router branches · 136 render functions · 355 distinct click handlers ·
605 element ids (621 raw − 16 JS template artifacts) · 86 i18n keys.** Recorded in
[GROUND-TRUTH-INVENTORY.md](GROUND-TRUTH-INVENTORY.md).

## Step 1 — Per-module analysis (18 agents, parallel)

One agent per module or cohesive module group. Each received: its page ids, its
HTML line ranges, its router-declared render entrypoints, and a fixed extraction
contract.

Every agent was required to enumerate, never summarise:

- every KPI with its **exact formula**, inputs, units and thresholds
- every displayed value with its `DB` path or computation
- every input field: id, type, label, default, unit, options, validation, effect
- every action: label, handler, real effect, DB writes, permission gate, audit
  entry, confirmation
- every table: ordered columns, row source, filters, sorts, row actions, empty
  state
- every modal: title, all fields, all buttons, commit function
- every status/badge with its **exact trigger condition**
- every hardcoded, mock or demo value — flagged explicitly
- cross-module navigation targets

Two rules bound every agent:

1. **No sampling.** Writing "etc." or "and others" in place of a list is a defect.
2. **No guessing.** Anything not verifiable from source is marked `UNVERIFIED`
   with the reason.

Every factual claim carries a source line citation in `L1234` form, which is what
makes Steps 2 and 3 mechanically checkable.

## Steps 2 & 3 — Two independent review passes

The user's requirement was that nothing be missing and nothing be unverified.
One review pass cannot deliver both, because completeness and correctness fail in
opposite directions — so the passes are split and given different jobs:

| | Pass 1 — Coverage | Pass 2 — Accuracy |
|---|---|---|
| Question | *Is anything missing?* | *Is anything wrong?* |
| Method | Diff the docs against the machine census | Re-derive each claim from source, blind to the doc's reasoning |
| Failure it catches | Omission | Fabrication, stale line numbers, wrong formulas |
| Output | `docs/02-verification/pass-1-coverage-review.md` | `docs/02-verification/pass-2-accuracy-review.md` |

Findings from both passes are applied back into `docs/01-modules/` before the
JSON extraction runs, so downstream artefacts inherit reviewed content only.

## Evidence conventions used throughout

| Convention | Meaning |
|---|---|
| `L1234` | Verified at that line of the source file |
| `L1234-L1240` | Verified across that range |
| `UNVERIFIED` | Could not be confirmed from source; reason stated inline |
| `MOCK` | Hardcoded / seeded demo value, not real behaviour |
| `BUG` | Source behaviour contradicts apparent intent; reproduction given |

## Known limits of this method

Stated plainly so readers do not over-trust the output:

- **Static analysis only.** The panel was read, not executed. Runtime-only
  behaviour (actual render order, race conditions, browser quirks) is inferred
  from source and marked `UNVERIFIED` where inference was required.
- **Seed data is fiction.** Record counts and values describe the demo seed, not
  production. Formulas are real; the numbers they run on are not.
- **Line numbers are pinned to this file version.** Any edit to
  `eyvar_ops_panel_v40_fixed.html` invalidates citations; re-run Step 0 and the
  review passes after changes.
