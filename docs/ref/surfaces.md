# Which surface?

Condensed from `DESIGN.md` §5.0, which carries the evidence for each row.

| Situation | Use | Not |
|---|---|---|
| Action succeeded, nothing more to do | **Toast** | Banner — it would outlive the truth |
| Created, and there is an obvious next step | **Success banner** with the next step, **plus** the toast | Toast alone — the offer vanishes |
| Condition true until someone changes it | **Banner, undismissable** | Toast — the state outlives the session |
| Save blocked by validation | **Critical banner** naming count + fix, primary actions disabled | Toast, modal, or a red field with no page summary |
| One field is wrong | **Inline field error** | A page banner for a single field |
| Destructive / irreversible | **Modal**, primary restated as the verb | Toast-with-undo, popover, navigating away |
| Short focused form (≤6 fields) | **Modal** | Drawer, new page |
| Choosing which *kind* to create | **Picker modal** — rows, Cancel only, no primary | Dropdown, page of cards |
| A surface consulted *against* the page behind it | **Drawer**, no scrim | Modal — it hides the thing being worked on |
| Commands on an object | **Popover menu** | Modal, expanding the row |
| A setting changed repeatedly (sort, date range) | **Popover** that stays open | Modal |
| Naming an icon-only control | **Tooltip** | Popover, permanent label |
| Permissions, consent, long multi-section flow | **Full page** | Modal — consent must be readable and linkable |
| Progressive setup of an area | **Guide card + checklist** on the destination | Modal wizard, coach-marks |
| Page has unsaved edits | **Contextual save bar** | Toast; navigate-away modal as the *only* guard |

## The rule underneath

**R10 — one event, one surface, decided by lifetime.** Transient → toast. Standing
condition → banner. Pair them only when the action completed *and* left a standing
condition. Never two page-level banners; merge into one with a count.

## Toast shape

One line, names the object exactly, ≤60 characters (R9). Rounded rectangle, not a stadium
pill (R15). No action link inside it. No emoji. No period.

## Modal shape

Question title naming object + count ("Archive 3 products?") · body saying what *survives*
· primary restating verb + object · red **only** if irreversible — archive and mark-as-paid
stay blue.
