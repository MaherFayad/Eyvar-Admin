/**
 * `FilterChipRow` (D-03) — design spec §9.1 "Toolbar", §3.2.
 *
 * ```
 * │ [Status: Active ⌄][Tier: Gold ⌄][Add filter +]              Clear all  │ 36px
 * ```
 *
 * Rules applied
 *   §9.1       a row **beneath** the search field: one chip per active filter,
 *              each with a trailing chevron, ending `Add filter +`.
 *   §9.1       **`Clear all` appears only when at least one filter or query is
 *              active** — that is `table.isFiltered`, the same value that
 *              chooses `no-match` over `first-run` (**AC-37** / **AC-38**), so
 *              the control and the empty state can never disagree.
 *   §3.2       one chip per FIELD. Re-choosing a value replaces that chip
 *              rather than adding a second — `useFilters.setFilter` does it.
 *   §10.2      the chevron `⌄` is reserved for a control that opens a menu
 *              (§1.5). It is a MARK: it does not mirror in Arabic (§9.5).
 *   §7.2       every chip is a `<button>`; the default focus ring survives.
 *   R7         chips are neutral. No tone, no badge, no red.
 *   §9.4       a queue **scope** (`Past SLA only`) renders in this row as a
 *              dismissible chip. It is a VIEW, not a filter — it does not set
 *              `isFiltered` — so it carries its own `✕` and its own copy, and
 *              it is visibly distinguishable from a filter chip by the ✕.
 */

import type { ReactNode } from 'react'
import { ChevronDown, Plus, X } from 'lucide-react'
import type { FilterOperator, FilterSpec, FilterValue } from '@/data/types'
import type { Translate } from '@/lib'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export interface FilterOption {
  value: FilterValue
  label: string
}

export interface FilterField {
  /** The domain field the client declares as filterable. */
  field: string
  label: string
  /** Defaults to `eq`. The only operator any People filter needs today. */
  op?: FilterOperator
  options: readonly FilterOption[]
}

export interface FilterChipRowProps {
  t: Translate
  fields: readonly FilterField[]
  active: readonly FilterSpec[]
  onSetFilter: (spec: FilterSpec) => void
  onRemoveFilter: (field: string) => void
  onClearAll: () => void
  /** §9.1 — `Clear all` renders only when this is true. */
  isFiltered: boolean
  /** §9.4 — an optional queue scope chip, dismissible, never a filter. */
  scope?: { label: string; clearLabel: string; onClear: () => void } | null
}

export function FilterChipRow({
  t,
  fields,
  active,
  onSetFilter,
  onRemoveFilter,
  onClearAll,
  isFiltered,
  scope = null,
}: FilterChipRowProps) {
  return (
    <div className="flex h-9 items-center gap-1.5 border-b border-border px-3">
      {scope && (
        <span className="inline-flex h-6 items-center gap-1 rounded-lg border border-border bg-muted ps-2 pe-1 text-xs text-foreground">
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

      {fields.map((field) => {
        const applied = active.find((spec) => spec.field === field.field)
        if (!applied) return null
        const option = field.options.find((o) => o.value === applied.value)
        return (
          <FilterPopover
            key={field.field}
            t={t}
            field={field}
            applied={applied}
            onSetFilter={onSetFilter}
            onRemoveFilter={onRemoveFilter}
            trigger={
              <Button variant="secondary" size="xs" className="font-normal">
                {t('people.filter.chip', {
                  field: field.label,
                  value: option?.label ?? String(applied.value),
                })}
                <ChevronDown aria-hidden="true" />
              </Button>
            }
          />
        )
      })}

      <AddFilterPopover
        t={t}
        fields={fields}
        onSetFilter={onSetFilter}
        trigger={
          <Button variant="ghost" size="xs" className="font-normal text-muted-foreground">
            <Plus aria-hidden="true" />
            {t('people.filter.add')}
          </Button>
        }
      />

      {isFiltered && (
        <Button variant="ghost" size="xs" className="ms-auto" onClick={onClearAll}>
          {t('table.clearAll')}
        </Button>
      )}
    </div>
  )
}

/* ─────────────────── one field's values, as a popover ─────────────────── */

function FilterPopover({
  t,
  field,
  applied,
  onSetFilter,
  onRemoveFilter,
  trigger,
}: {
  t: Translate
  field: FilterField
  applied: FilterSpec | undefined
  onSetFilter: (spec: FilterSpec) => void
  onRemoveFilter: (field: string) => void
  trigger: ReactNode
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-56 gap-1">
        <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
        {/* `Any` removes the chip. It is the same control as every value, so
            clearing one filter never needs a second affordance. */}
        <Button
          variant="ghost"
          size="xs"
          className="justify-start font-normal"
          aria-pressed={applied === undefined}
          onClick={() => onRemoveFilter(field.field)}
        >
          {t('people.filter.any')}
        </Button>
        {field.options.map((option) => (
          <Button
            key={String(option.value)}
            variant="ghost"
            size="xs"
            className={
              applied?.value === option.value
                ? 'justify-start bg-accent font-semibold'
                : 'justify-start font-normal'
            }
            aria-pressed={applied?.value === option.value}
            onClick={() =>
              onSetFilter({ field: field.field, op: field.op ?? 'eq', value: option.value })
            }
          >
            {option.label}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

/** `Add filter +`, and the toolbar's filter icon. One popover, two triggers. */
export function AddFilterPopover({
  t,
  fields,
  onSetFilter,
  trigger,
}: {
  t: Translate
  fields: readonly FilterField[]
  onSetFilter: (spec: FilterSpec) => void
  trigger: ReactNode
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-56 gap-2">
        <p className="text-xs font-medium text-foreground">{t('people.filter.add')}</p>
        {fields.map((field) => (
          <div key={field.field} className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
            <div className="flex flex-wrap gap-1">
              {field.options.map((option) => (
                <Button
                  key={String(option.value)}
                  variant="secondary"
                  size="xs"
                  className="font-normal"
                  onClick={() =>
                    onSetFilter({ field: field.field, op: field.op ?? 'eq', value: option.value })
                  }
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  )
}
