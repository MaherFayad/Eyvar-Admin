# Motion

Source: `DESIGN.md` §7.6 + R18, and the motion block in `src/styles/globals.css` (~:737).
Untouched by D7.

## The ruling that surprises people

**There is no `--ev-duration-*` token set, and adding one is the defect.** `globals.css`
records it in the token file itself: Tailwind's own scale *is* the token set — `duration-200`
for a layer, `duration-100` for a popover — and a second source here would drift.

Only one motion token exists, because it feeds an `animation` shorthand and Tailwind's scale
cannot:

```css
--ev-live-loop: 1800ms;  /* LiveDot opacity loop, 1200–2500ms */
```

So a plan that proposes "six motion tokens" is proposing drift. Use the Tailwind scale, and
add a token only when a value must reach an `animation` shorthand.

## R18 — the ambient-loop ban

**A loop may only ever signal "this feed is live."** Nothing else in the shell animates
indefinitely. No pulsing badges, no breathing cards, no shimmer that outlives its load, no
attention-seeking idle state. An operator watches these screens for eight hours.

The one sanctioned loop is `@keyframes live-pulse` (`globals.css:1190`), and its opacity
**never drops below 0.4** — commented in place as the R18 floor.

## `prefers-reduced-motion` is already global

`globals.css:1238` collapses every animation and transition to 1ms on `*`, `*::before`,
`*::after`, and forces `scroll-behavior: auto`. **It is global so that a component cannot
forget it.**

Two consequences:

- You do not add a reduced-motion branch per component. It is handled.
- **Never build meaning that only motion carries.** Under the preference the motion is gone
  in 1ms; if the animation was the only thing saying "this row moved" or "this saved", the
  message is simply lost. Motion decorates a state change that is already legible.

## What may move at all

Motion is licensed by *purpose*, not taste. Each of these earns its animation by explaining
a change the operator did not cause or could otherwise miss:

| Licensed | Duration |
|---|---|
| A layer arriving or leaving — modal, drawer, sheet | `duration-200` |
| A popover, dropdown, tooltip, command list | `duration-100` |
| A row entering, leaving or reordering in a live queue | `duration-150` |
| The save bar committing | `duration-200` |
| The live-feed dot | `--ev-live-loop` |

Everything else is static. Hover and focus are colour changes, not movement — nothing
translates, scales or lifts on hover.

## Current usage

Eight `duration-100`, two `duration-200`, one `duration-150`, one `duration-300` across
`src/**/*.tsx`. The `duration-300` is the outlier — check it against the table above before
adding a second one.

## Reviewing motion

Load the screen, then load it again with reduced motion forced. If anything becomes
*unclear* rather than merely *plainer*, the motion was carrying meaning and the state needs
a static signal.
