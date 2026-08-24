# UX writing

Source: `DESIGN.md` §5.7. These are MUSTs.

## Rules

1. **Sentence case** everywhere — labels, titles, buttons, messages. Only proper nouns and
   product names capitalised mid-string.
2. **Buttons are verbs** (or verb + object). The only permitted non-verb labels: `Cancel`,
   `Close`, `Done`, `Save`, `Discard`.
3. **No exclamation marks, no emoji, no "successfully"** in system copy.
4. **Errors are imperatives that name the fix.** No "please", no "invalid", no "failed", no
   blame.
5. **Echo the object exactly** — the toast or banner names the same thing the button named.
6. **"you" and "your"** — address the operator directly.
7. **Constraints go in helper text under the field**, never in a tooltip.
8. **No period** ending a toast, tooltip, badge, or menu item. Banner and helper
   *sentences* do take one. (R6)
9. **Destructive confirmations say what will *not* change**, alongside what will.
10. **State end-of-list and no-data in words** rather than leaving a surface blank.
11. **"Learn more about `<noun>`"** for page-level help, only the noun linked; a bare
    "Learn more" appended inline elsewhere.

## Rewrites

| Don't | Do |
|---|---|
| `Driver Successfully Updated!` | `Driver updated` |
| `Invalid email` | `Enter a valid email address` |
| `Please try again later` | `Try again` |
| `Something went wrong` | `Couldn't load drivers. Try again.` |
| `Are you sure?` | `Archive 3 drivers?` |
| `OK` | `Archive drivers` |
| `Submit` | `Send invoice` |
| `No data` | `No drivers match these filters` |
| `⚠️ Wallet low` | `Wallet balance below minimum` |

## Toast, specifically (R9)

One line. Names the object exactly. ≤60 characters. No period, no emoji, no action link.
If the object name is long, truncate the **object** with an ellipsis — never the verb.

`Plan "Weekly — Riyadh North…" saved` · not · `Changes saved successfully!`

## Arabic (§9.6)

Sentence case does not exist in Arabic — rule 1 simply does not apply. Arabic comma `،` and
question mark `؟`. Button labels stay verb-first. Never build a string by concatenation:
it cannot be translated and it breaks under bidi.
