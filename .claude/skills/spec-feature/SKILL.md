---
name: spec-feature
description: Turn an Eyvar Admin module doc into a build-ready feature spec with numbered acceptance criteria. Use when starting a new feature or screen, when a request needs scoping, or when "done" is undefined. Produces docs/05-restructure/specs/<module>-<feature>.md.
---

# Write a feature spec

## 1. Gather

Read, in this order:

1. `docs/00-index/TEAM-BRIEF.md`
2. The module doc: `docs/01-modules/<nn><x>-<module>.md`
3. The page rows for this module in `docs/00-index/GROUND-TRUTH-INVENTORY.md`
4. The legacy implementation — grep `eyvar_ops_panel_v40_fixed.html` for the page id
   (`p-<page>`), then read its render function and handlers
5. `MODALS.json` if the feature opens any modal

## 2. Find the pattern

Look up the page in `DESIGN.md` §6.4 and record which pattern row it maps to. If it maps
to none, stop and escalate — that is a gap in `DESIGN.md`, not something to improvise
around.

## 3. Write

Create `docs/05-restructure/specs/<module>-<feature>.md`:

```markdown
# <Feature>

**Module:** <module doc> · **Pages:** `p-<id>` · **Pattern:** DESIGN.md §6.4 → <row>
**Status:** draft

## Problem
<One paragraph: what the operator cannot do today.>

## Scope
In:
1. ...
Out:
- <thing> — <why>

## Data
| Field | Type | Source | Derived? | Notes |

## States
| State | Trigger | What the operator sees |
| Content | | |
| Empty | | |
| Loading | | |
| Error | | |
| <domain state> | | |

## Acceptance criteria
1. <Independently checkable statement.>

## Permissions
<Who sees, who acts. Cross-ref 00c-identity-permissions-and-audit.md>

## Open questions
| # | Question | Who answers | What is blocked |

## Legacy behaviour observed
| Behaviour | Evidence | Carry across? |
```

## 4. Check before handing off

- [ ] Every acceptance criterion passes or fails without asking the author what it meant
- [ ] No criterion requires reading source code to verify
- [ ] All four base states named, plus every domain state
- [ ] Every field has a type and a source; derived fields marked (they become §8.2, not
      editable inputs)
- [ ] Every operator-facing string can be translated cleanly — no concatenation, no
      interpolated fragments (§9.6)
- [ ] Suspected legacy defects recorded as such, not spec'd as correct
- [ ] Open questions each name a blocker, or the list is empty

## Common failures

- **Criteria that describe the UI instead of the outcome.** "Shows a table of drivers" →
  "A driver whose licence expires within 30 days appears in the default view with the
  `Expiring` badge."
- **Forgetting the third and fourth states.** Loading and error are where operators spend
  their frustrating minutes, and specs that omit them produce screens that omit them.
- **Silently fixing the legacy app.** If today's behaviour looks wrong, that is a finding
  with a line number, not a quiet correction.

## Reference

Check the small file, not the 5,692-line document:
`docs/ref/patterns.md` · `docs/ref/states.md` · `docs/ref/modules.md`

Index: `docs/ref/README.md`. Open a `DESIGN.md` section only for the
reasoning or the evidence behind a rule.
