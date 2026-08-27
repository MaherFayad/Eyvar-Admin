/**
 * Table — restyled for Eyvar. Do not use the stock shadcn version.
 *
 * This is the primitive only. `DataTable` (D-01) composes it, and the
 * load-bearing rule is design spec §9.4: **the MODE — `index | ledger | queue`
 * — decides which furniture renders, not the route.** A route may mount more
 * than one mode over its lifetime; it may never mount two at once. That is
 * what makes Operations › People — an index table AND a work queue AND a
 * two-column detail on one route — buildable.
 *
 * **The mode is NOT a prop you invent.** It is `table.mode`, from
 * `useIndexTable` (utilities-engineer, 0.5). That hook returns a DISCRIMINATED
 * UNION, so `if (table.mode === 'ledger')` narrows selection and sort away and
 * TypeScript will not let you render a checkbox or a sort header in that
 * branch — AC-48 is enforced by the compiler. Adding a second `mode` prop here
 * would create a weaker parallel source of truth and undo that guarantee.
 * `src/hooks/useIndexTable.types.ts` breaks the build if anyone loosens it.
 *
 * Rules applied
 *   §3.1        the table always lives INSIDE a card, never as a bare
 *               `<table>`. One card holds the view tabs, the filter row, the
 *               header row, the rows and the bulk action bar.
 *   §9.1 / D18  header row 32px, 12px/500 `--ev-text-2` ON THE CARD SURFACE.
 *               NO filled grey band, NO uppercase, NO letter-spacing — §9.4
 *               forbids both on anything that can render Arabic, and D18
 *               records the legacy 8 selectors that do it. `bg-muted/50` is
 *               removed from the header and the footer.
 *   §1.2        row height is `--ev-row-h` (32px, 36px in Arabic) for text and
 *               `--ev-row-h-media` (44px / 48px) with a thumbnail or a second
 *               identity line. Uniform WITHIN a table.
 *   §9.1        cell padding 8px block / 12px inline — on the 4px grid.
 *   §9.1        row hover fills `--ev-bg2`. THE WHOLE ROW IS NOT A CLICK
 *               TARGET — only the identity link is; a whole-row target
 *               collides with the checkbox and the kebab. No pointer cursor
 *               and no `onClick` belong on `<tr>`.
 *   §7.3 / AC-68 / D19
 *               `focus-within` mirrors `hover` on the row, so a row action is
 *               never hover-only. This closes D19 (an opacity-zero reveal until `:hover`
 *               with no `:focus-within`).
 *   §9.1 / AC-45
 *               HEADERS ARE NOT INTERACTIVE ANYWHERE IN THE PRODUCT. The
 *               caret is an indicator; the control is the sort popover. So
 *               `<th>` carries no button, no cursor and no hover state — which
 *               makes AC-45 and AC-48 checkable with one rule.
 *   §9.2        a LEDGER structurally cannot render a checkbox column, a row
 *               kebab, a bulk bar or a sort caret (AC-48) — `LedgerTable` omits
 *               `selectedIds`, `toggleRow`, `sort` and `setSortField`
 *               entirely, so binding one does not compile. Nothing in this
 *               file offers them either.
 *   §9.3        a QUEUE gets a checkbox column ONLY with a literal
 *               `bulkClaim: true`, because a checkbox exists only where every
 *               bulk action offered is a claim or assign action.
 *   §9.2 / U-4  MONEY IN AN RTL BOUNDARY CONTEXT NEEDS `<bdi>` OR `dir="ltr"`
 *               ON THE CELL. `formatMoney` deliberately does not embed
 *               U+2068/U+2069 in the string — that poisons copy-paste, CSV
 *               export and every test assertion — so the isolation is the
 *               MARKUP's job. `Money` (V-02) carries it; a hand-rolled money
 *               cell must too.
 *   R4 / §9.2   numeric, currency and count cells use `text-end` — NEVER
 *               the physical right-hand alignment utility — with `tabular-nums`.
 *               `tabular-nums` is applied
 *               to every table by `globals.css`. In Arabic the COLUMN mirrors
 *               and the NUMERAL RUN does not (AC-73).
 *   §7.4        every `<th>` needs a `scope`; the caller supplies it.
 *
 * Removed on arrival: `bg-muted/50` on header and footer, `whitespace-nowrap`
 * on `<td>` (a secondary identity line must be able to grow the row; §9.1 says
 * it never truncates), `mt-4` on the caption.
 */
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * More than ~6 columns means a column-visibility control in the toolbar AND
 * horizontal scroll — never shrinking a column below legibility (§9.1).
 */
function Table({
  className,
  containerRef,
  containerClassName,
  ...props
}: React.ComponentProps<"table"> & {
  /**
   * §8.5 / §14.4 — the horizontal scroll container is the thing `DataTable` has
   * to measure (`scrollWidth > clientWidth` decides whether the pinned
   * boundary hairline renders) and the thing whose offset resets on a `dir`
   * change. Handing the ref out here keeps ONE scroll container per table; a
   * caller that wrapped its own would nest two scrollports.
   */
  containerRef?: React.Ref<HTMLDivElement>
  containerClassName?: string
}) {
  return (
    <div
      ref={containerRef}
      data-slot="table-container"
      /* `overscroll-behavior-inline: contain` (§14.4) so a trackpad flick at
         the end of a wide table does not trigger the browser's back-navigation
         gesture. Logical, so it needs no RTL branch. */
      className={cn(
        "relative w-full overflow-x-auto overscroll-x-contain",
        containerClassName
      )}
    >
      <table
        data-slot="table"
        className={cn(
          /* **`table-fixed` — `04-index-screen-redesign.md` §7.3 rule 1**, and
             it is the half of the width contract the browser enforces. With
             `auto` layout a column's declared width is a suggestion the engine
             may overrule to fit content, which is how a table whose declared
             widths sum to 910 still rendered 1248 wide and painted the pinned
             action lane over `Earned (SAR)` (craft-critique F1). Fixed layout
             takes the widths from the FIRST row — the header — and gives the
             residual to the one column that declares none: the identity. */
          "w-full table-fixed caption-bottom text-sm",
          /* 03-navattic-language.md §3.4 / §4.5, fix-list item 6 — **VERTICAL
             COLUMN RULES.** 1px `--ev-hairline2` between every pair of columns,
             header and body alike, running the full height of the table. This
             is a genuine divergence from Shopify, confirmed across every
             Navattic frame (`82923d3f` at y=250: rules at x ≈ 306, 429, 509,
             563, 653), and it is why `--ev-hairline2` flipped meaning: the
             internal rules are LIGHTER than the outer border (Y ≈ 237 vs
             221–230), not darker.

             Declared ONCE here rather than per cell: a rule between columns is
             a property of the grid, not of a cell, and `:not(:last-child)`
             keeps it off the trailing edge where the outer border already
             draws. `border-e` is logical, so it needs no RTL branch — in
             Arabic every rule moves to the other side of its cell by itself.

             **SCOPED TO `tbody` — `04-index-screen-redesign.md` §7.5, match
             audit N1, confidence `High`.** The reference's header deficit
             profile is FLAT at 8.15–8.35 across x 206–264: no spikes, so no
             vertical rules in the header strip. Ours drew them there, which
             turned the one band that should read as a label row into the
             densest part of the grid. One selector, one word. */
          "[&_tbody_tr>*:not(:last-child)]:border-e [&_tbody_tr>*:not(:last-child)]:border-(--ev-hairline2)",
          className
        )}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b [&_tr]:border-(--ev-hairline2)", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

/**
 * The ledger's `Opening balance` / `Closing balance` rows: bold on both sides,
 * on the card surface (§9.2). The closing balance equals the balance in the
 * card header (AC-49).
 */
function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t border-(--ev-hairline2) font-semibold [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        /* §4.5, item 6 — the row separator is the same INTERNAL rule as the
           vertical ones: `--ev-hairline2`, one step lighter than the table's
           outer border. Two weights of line, and the difference is what makes
           the grid read as a grid rather than as a stack of boxes. */
        "border-b border-(--ev-hairline2) transition-colors",
        // AC-68 / D19 — focus-within mirrors hover, always and everywhere.
        "hover:bg-accent focus-within:bg-accent",
        "data-[state=selected]:bg-accent",
        className
      )}
      {...props}
    />
  )
}

/**
 * Header cell — `--ev-row-h-head` (32px), 12px/500 `--ev-text-2`, on `--ev-bg2`.
 *
 * **The header row has its own height token now** (§4.5, fix-list items 6 and
 * 7): the data row rose to 40px and the header did not, so `--ev-row-h` can no
 * longer serve both. `--ev-row-h-head` is declared in `globals.css` rather than
 * smuggled in here as a literal (D15).
 *
 * D18 still holds and is what the tint does NOT change: sentence case, no
 * uppercase, no letter-spacing. §9.4 forbids both on anything that can render
 * Arabic. The ground is a tint, not a licence.
 *
 * AC-45's "not interactive" clause is superseded by **D-6**: a header cell now
 * contains exactly one interactive element — a menu trigger — or none. That
 * button is `ColumnHeaderCell`'s, and it owns the cell's inline padding, which
 * is why `p-0` arrives through `className` there rather than being defaulted
 * away here.
 */
function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        /* §7.5 — 36px (`--ev-row-h-head`, raised from 32), ground `--ev-bg2`,
           label at the ramp's own `text-sm` / 500 in `--ev-text-2`, raised from
           `text-xs`: the reference measures ~14 (audit G30'), i.e. a column
           header is the SAME optical size as the cell beneath it, where ours
           was two steps smaller than its own body. D-2 is retired, so this is
           not a density deviation.
           **`--ev-text-2` on `--ev-bg2` is 4.538 : 1 — the tightest pair in the
           product, clearing AA by 0.038, and ruling R22 PINS it.** Neither token
           moves without re-deriving this pair, and the derivation goes in the
           commit message. */
        "h-(--ev-row-h-head) bg-muted px-3 text-start align-middle",
        "text-sm font-medium whitespace-nowrap text-muted-foreground",
        "[&:has([role=checkbox])]:w-10 [&:has([role=checkbox])]:px-3",
        className
      )}
      {...props}
    />
  )
}

/**
 * Body cell — `--ev-row-h` (**40px** now), 12px inline / 8px block padding.
 *
 * **Fix-list item 7, and the reason `01-people.md`'s `[&_td]:py-1` bridge is
 * gone.** That override existed only because §7.7's 24px hit target, 8px of
 * block padding and a 32px row could not all be true at once — Q2's three-way
 * conflict, recorded as gap **G1**. At 40px the arithmetic closes exactly:
 * 24 + 8 + 8 = 40. The row height was the wrong number, not the rule, so the
 * bridge is deleted rather than re-tuned.
 */
function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "h-row px-3 py-2 align-middle",
        /* §4.5 — an ordinary cell is `--ev-text-2`, not ink. Measured on the
           reference at `#6b7280`; ink is reserved for the identity column,
           which `DataTable` gives back explicitly. A table where every value is
           ink has no hierarchy and reads as a wall. */
        "text-muted-foreground",
        "[&:has([role=checkbox])]:w-10",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("py-2 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
