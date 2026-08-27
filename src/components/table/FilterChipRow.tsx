/**
 * `FilterChipRow` (D-03, extended) — `01-table-controls.md` §6.3, §10.1,
 * `DESIGN.md` §3.2 and §8.5.2.
 *
 * **`DataTable` renders this now, not the page.** `filterRow?: ReactNode` is
 * gone from `DataTableProps` (**AC-103**): the strip is generated from
 * `table.filters` plus the column declarations plus `extraFilters`, so a screen
 * never constructs a chip again. That is the literal content of *"no need to
 * redo for everypage"*.
 *
 * **The strip's anatomy is `03-navattic-language.md` §4.4** (fix-list item 11),
 * the second element in the product with no Shopify equivalent:
 *
 * ```
 *  ┌──────────────────────────────────────────────────────────────────┐  --ev-bg2, r8
 *  │ 8                                                                │  the table's width
 *  │   ┌────────────────────────┐ ┌───────────────┐                   │
 *  │ 8 │ Status: Active      ✕  │ │ + Add filter  │   ✕ Clear      8  │  chips --ev-control-h
 *  │   └────────────────────────┘ └───────────────┘                   │
 *  │ 8                                                                │
 *  └──────────────────────────────────────────────────────────────────┘
 * ```
 *
 * | | Value |
 * |---|---|
 * | strip ground | `--ev-bg2` through `bg-muted` |
 * | strip radius / padding | 8px / 8px all round |
 * | chip | **white fill**, 1px `--ev-hairline`, r8 — the chip interior is not tinted |
 * | `Add filter` | a chip-shaped outline button with a leading `+` |
 * | `Clear` | **bare text, no chip** — `--ev-text-2`, leading `✕` |
 *
 * **`Clear` being unchipped is the strip's grammar**, and it is the one rule
 * here that is easy to get wrong: chips are *state*, `Add filter` is *a control
 * shaped like state*, `Clear` is *an action on the set*. Giving it a chip makes
 * it look like a filter that is on.
 *
 * Rules applied
 *   §6.3/AC-93  a column filter **is** a filter: one `FilterSpec` in
 *               `table.filters`, keyed on the column's field.
 *               `useFilters.setFilter` replaces by field, so one column can
 *               never hold two chips, and `isFiltered` is already true —
 *               **AC-37 / AC-38 are unchanged.**
 *   §6.3/AC-95  the chip carries the **same** `{label}: {value}` string the
 *               header shows, from one function (`summariseColumnFilter`), so
 *               the two readouts cannot diverge. **The header may truncate; the
 *               chip may not** — the strip is the complete readout.
 *   §6.3        R10 is **not** in play. R10 governs event feedback surfaces —
 *               transient versus standing. A chip and a header label are two
 *               readouts of ONE persistent state, like a nav count badge and a
 *               page heading. Nobody may cite R10 against this.
 *   §3.2/AC-102 `Add filter +` and the header reach the **same** popover for a
 *               given column. One control per kind, three triggers.
 *   §9.1        `Clear all` renders only when `table.isFiltered` — the same
 *               value that chooses `no-match` over `first-run`, so the control
 *               and the empty state can never disagree.
 *   §10.2       the `⌄` is reserved for a control that opens a menu (§1.5). It
 *               is a MARK: it does not mirror in Arabic (§9.5).
 *   §9.4        a queue **scope** (`Past SLA only`) renders here as a
 *               dismissible chip. It is a VIEW, not a filter — it does not set
 *               `isFiltered` — so it carries its own `✕` and its own copy.
 *   §7.2/R7     every chip is a `<button>` with the default focus ring. Chips
 *               are neutral: no tone, no badge, no red.
 */

import { useState, type ReactNode } from 'react'
import { ChevronDown, Plus, X } from 'lucide-react'
import type { FilterSpec } from '@/data/types'
import type { ColumnFilterValue, Language, Translate } from '@/lib'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ColumnFilterControl } from './ColumnFilterControl'
import {
  columnFilterValueOf,
  emptyColumnFilterValue,
  filteredLabelParts,
  summariseColumnFilter,
  type FilterEntry,
} from './columns'

export interface FilterChipRowProps {
  t: Translate
  language: Language
  entries: readonly FilterEntry[]
  active: readonly FilterSpec[]
  onCommit: (field: string, value: ColumnFilterValue) => void
  onRemove: (field: string) => void
  onClearAll: () => void
  /** §9.1 — `Clear all` renders only when this is true. */
  isFiltered: boolean
  /** §9.4 — an optional queue scope chip, dismissible, never a filter. */
  scope?: { label: string; clearLabel: string; onClear: () => void } | null
  today?: string | null
}

export function FilterChipRow(props: FilterChipRowProps) {
  const { t, language, entries, active, onRemove, onClearAll, isFiltered, scope = null } = props

  return (
    <div className="flex min-h-12 shrink-0 flex-wrap items-center gap-2 rounded-xl bg-muted p-2">
      {scope && (
        <span className="inline-flex h-control items-center gap-1 rounded-lg border border-border-control bg-card ps-2 pe-1 text-sm text-foreground">
          {scope.label}
          <Button
            variant="ghost"
            size="icon-xs"
            className="size-4"
            aria-label={scope.clearLabel}
            onClick={scope.onClear}
          >
            <X aria-hidden="true" className="size-3" />
          </Button>
        </span>
      )}

      {entries.map((entry) => {
        const spec = active.find((each) => each.field === entry.field)
        if (!spec) return null
        const value = columnFilterValueOf(entry.filter, spec)
        const summary = summariseColumnFilter(t, entry.filter, value, language)
        if (summary === null) return null
        const parts = filteredLabelParts(t, entry.label, summary)

        return (
          <span
            key={entry.field}
            /* §4.4 — white fill on the tinted strip, 1px `--ev-hairline`, r8.
               The chip interior is deliberately NOT tinted: a tinted chip on a
               tinted strip has no edge and reads as a label, not a control. */
            className="inline-flex h-control items-center rounded-lg border border-border-control bg-card"
          >
            <FilterPopover
              {...props}
              entry={entry}
              trigger={
                <Button
                  variant="ghost"
                  size="xs"
                  className="h-control rounded-e-none border-0 font-normal"
                  /* §6.2 / AC-96 — the untruncated value is the accessible name
                     here, because the strip is the complete readout. */
                  aria-label={t('table.column.filtered', { label: entry.label, value: summary })}
                >
                  {/* AC-96 — the chip may NOT truncate: it is the complete
                      readout, and the header is the glanceable one. */}
                  <span className="whitespace-normal text-start">
                    {parts.before}
                    <bdi className="font-semibold">{parts.value}</bdi>
                    {parts.after}
                  </span>
                  <ChevronDown aria-hidden="true" />
                </Button>
              }
            />
            {/* §4.4 / §7.7 — the dismiss is a 24 × 24 hit area at the chip's
                trailing edge. Two targets in one chip is fine here and is not
                the header cell's problem: the chip is 32px tall and sits
                outside the table's density budget. */}
            <Button
              variant="ghost"
              size="icon-xs"
              className="size-6 rounded-s-none border-0"
              aria-label={t('table.filter.remove', { column: entry.label })}
              onClick={() => onRemove(entry.field)}
            >
              <X aria-hidden="true" className="size-3" />
            </Button>
          </span>
        )
      })}

      <AddFilterPopover {...props} />

      {/* §4.4 — **bare text, no chip.** `Clear` is an action on the set, not a
          piece of state, and a chip would say otherwise. */}
      {isFiltered && (
        <Button
          variant="ghost"
          size="xs"
          className="ms-auto font-normal text-muted-foreground"
          onClick={onClearAll}
        >
          <X aria-hidden="true" />
          {t('table.clear')}
        </Button>
      )}
    </div>
  )
}

/* ─────────────── one entry's control, behind its own popover ─────────────── */

function FilterPopover({
  t,
  language,
  entry,
  active,
  onCommit,
  trigger,
  today,
}: FilterChipRowProps & { entry: FilterEntry; trigger: ReactNode }) {
  const [open, setOpen] = useState(false)
  const spec = active.find((each) => each.field === entry.field)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-60">
        <ColumnFilterControl
          t={t}
          language={language}
          filter={entry.filter}
          label={entry.label}
          value={
            spec ? columnFilterValueOf(entry.filter, spec) : emptyColumnFilterValue(entry.filter)
          }
          onCommit={(value) => onCommit(entry.field, value)}
          onClose={() => setOpen(false)}
          today={today}
        />
      </PopoverContent>
    </Popover>
  )
}

/**
 * §6.3 — `Add filter +` lists every filterable column **plus** every
 * `extraFilters` entry, and choosing one opens **the same** control the header
 * opens. One list, then one control, inside one popover — two sequential
 * surfaces, never a nested one.
 */
export function AddFilterPopover(props: FilterChipRowProps & { trigger?: ReactNode }) {
  const { t, language, entries, active, onCommit, today, trigger } = props
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const entry = entries.find((each) => each.field === picked) ?? null

  function close() {
    setOpen(false)
    setPicked(null)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setPicked(null)
      }}
    >
      <PopoverTrigger asChild>
        {trigger ?? (
          /* §4.4 — chip-SHAPED: same height, same radius, same hairline as a
             real chip, because it is the control that makes one. */
          <Button variant="secondary" size="xs" className="h-control font-normal">
            <Plus aria-hidden="true" />
            {t('table.addFilter')}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60">
        {entry === null ? (
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-medium text-muted-foreground">{t('table.addFilter')}</p>
            {entries.length === 0 && (
              <p className="text-xs text-muted-foreground">{t('table.filter.noOptions')}</p>
            )}
            {entries.map((each) => (
              <Button
                key={each.field}
                variant="ghost"
                size="xs"
                className="justify-start font-normal"
                onClick={() => setPicked(each.field)}
              >
                {each.label}
              </Button>
            ))}
          </div>
        ) : (
          <ColumnFilterControl
            t={t}
            language={language}
            filter={entry.filter}
            label={entry.label}
            value={
              (() => {
                const spec = active.find((s) => s.field === entry.field)
                return spec
                  ? columnFilterValueOf(entry.filter, spec)
                  : emptyColumnFilterValue(entry.filter)
              })()
            }
            onCommit={(value) => onCommit(entry.field, value)}
            onClose={close}
            today={today}
          />
        )}
      </PopoverContent>
    </Popover>
  )
}
