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
 *               collides with the checkbox and the kebab. No `cursor-pointer`
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
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b [&_tr]:border-border", className)}
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
        "border-t border-border font-semibold [&>tr]:last:border-b-0",
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
        "border-b border-border transition-colors",
        // AC-68 / D19 — focus-within mirrors hover, always and everywhere.
        "hover:bg-accent focus-within:bg-accent",
        "data-[state=selected]:bg-accent",
        className
      )}
      {...props}
    />
  )
}

/** Header cell — 32px, 12px/500 `--ev-text-2`, not interactive (AC-45). */
function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-row px-3 text-start align-middle",
        "text-xs font-medium whitespace-nowrap text-muted-foreground",
        "[&:has([role=checkbox])]:w-10 [&:has([role=checkbox])]:px-3",
        className
      )}
      {...props}
    />
  )
}

/** Body cell — 32px minimum, 8px block / 12px inline padding. */
function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "h-row px-3 py-2 align-middle",
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
