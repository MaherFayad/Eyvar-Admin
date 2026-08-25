# Known state of the legacy app

Source: `DESIGN.md` §6.2 and §6.3. Line numbers are `eyvar_ops_panel_v40_fixed.html`.

Use this to tell a **known** divergence from a **new** one you just introduced.

## Sanctioned — do not "fix" these

| # | Deviation | Suspends |
|---|---|---|
| D-1 | Brand blue is the primary action colour | §1.1.4, §4.6 |
| D-2 | Higher density — 13px base, ~30px rows | §1.2, §1.3, §3.1 |
| D-3 | Light 50px top bar with `Title › Subtitle` | §2.1, §2.6, §2.3 |
| D-4 | **Two-level navigation** — 80px icon+label workspace rail (5 targets, Admin pinned bottom) + 224px sub-tab column, collapsible below 1344px. Replaces the hover-expanding rail entirely | §2.1 (six clauses) |
| D-5 | **Settings is a route, not an overlay** — Admin is a workspace; four panes moved to Financials | §2.4 (four clauses) |

D-2 licences **smaller**, not **off-grid**. Values stay on the 4px grid.

## Defects — 23 open (D3 reclassified as sanctioned **D-5**)

**Structure** — D1 `.page` is white like its cards, so canvas/surface collapses (`:70`) ·
D2 no save bar anywhere, `.form-footer` used once, `.settings-dirty-dot` is dead CSS
(`:279`, `:248`) · ~~D3 settings is a route~~ — **now sanctioned D-5**, not a defect · D4 global search is a
230px field, not centred (`:569`)

**Status & feedback** — D5 11 badge tones, target is 5 (`:118`) · D6 three parallel status
systems with identical colours (`:118`, `:131`, `:140`) · D7 the toast system exists (352
call sites, `:5236–5320`) but fails six conformance rules: light not dark, bottom-right not
centre, emoji, over length, injects a link, off-token · D8 banners are ~6 divergent inline
implementations · D9 ~25 inline empty states, no shared component · D10 a native `alert()`
serves as a confirmation (`:5233`) · D11 49 red badges in use, forbidden by R5a

**Token drift** — D12 36 off-token hexes including Google's blue · D13 15 font sizes ·
D14 13 radii · D15 off-grid spacing (18/14/11/9px) · D16 **no radius/spacing/shadow/
font-size/duration tokens exist at all** · D17 `.5px` hairlines, 262 of 316 inline in JS ·
D18 uppercase + letter-spacing in 8 selectors

**Accessibility** — D19 row actions hover-only, no `:focus-within` (`:153`) · D20 focus
killed in 11 places, 6 of them inline · D21 `--ghost` fails at 2.79:1 across 431 uses;
`.hint` at 2.32:1 · D22 labels are 11px `--muted`, reading as hints · D23 `.modal-close`
turns red on hover · D24 three ambient loops, none `prefers-reduced-motion` guarded

## Fix order

D1, D16, D20 first — cheap, and everything compounds on them. Then D5/D6 (collapse three
status systems into one). Then D7/D8 (make the shipped toast conform, extract one banner
component). D12–D15 and D17 are a mechanical sweep, best done once, **after** the token set
exists.

## Porting from the legacy app

Port **behaviour**, cite the line, rebuild the markup and CSS. The legacy file carries all
24 of these — copying its markup inherits them.
