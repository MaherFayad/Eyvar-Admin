/**
 * `ColumnFilterPopover` (D-14) — `01-table-controls.md` §6.1, §11.6–§11.8,
 * `DESIGN.md` §8.5.2.
 *
 * **Six kinds, closed. The column declares the kind; this renders the control.**
 * That is the literal content of *"no need to redo for everypage"* — a screen
 * never builds a filter again, and `filterRow` is gone from `DataTableProps`.
 *
 * This is the CONTENT only. Three triggers reach the same content — the header
 * menu's `Filter…`, the chip in the strip, and `Add filter` (**AC-102**) — and
 * each owns its own `Popover` shell, because each returns focus to a different
 * place.
 *
 * Rules applied
 *   §6.1        `text` and `number-range` apply on a **250 ms debounce**
 *               (`DEFAULT_DEBOUNCE_MS`); `select`, `multi-select` and `boolean`
 *               apply on change and leave the popover open. **Only `date-range`
 *               has `Cancel` / `Apply`** (**AC-98**), because a half-chosen
 *               range is not a filter.
 *   §6.1/AC-99  the debounce exists because `setFilter` resets the page and
 *               clears selection SYNCHRONOUSLY (**AC-25**): committing per
 *               keystroke would reset the page five times per word.
 *   §4.3        `boolean` is a RADIO GROUP, not a `Switch`. A filter has three
 *               states — any, yes, no — and a switch has two with no unset.
 *   §4.2/§8.3/AC-101
 *               a `money` range takes the `SAR` **in-field inline-start
 *               prefix** and converts major units to halalas before emitting,
 *               while the column it filters keeps `(SAR)` in its header and
 *               bare numbers in its cells. Prefix governs INPUT; suffix governs
 *               OUTPUT. Both are correct and they look different on purpose.
 *   §11.8/AC-100
 *               an inverted range never reaches `toFilterSpec`, which throws on
 *               one. `date-range` has an `Apply`, so §3.2 applies: **disable the
 *               primary, show no error**. `number-range` has no primary and no
 *               submit, so it emits nothing, leaves the previous value standing
 *               and shows an inline `--ev-red` hint (§4.4) — never a badge,
 *               never a banner, never a toast.
 *   §11.6/§11.7/R8
 *               an empty option list and a search that matches nothing are each
 *               ONE grey sentence. The no-match sentence does not quote the
 *               query: a Latin query inside an Arabic sentence is a bidi hazard
 *               for zero benefit.
 *   §7.2        every control is a real `<input>` / `<button>` with the default
 *               focus ring. The popover is NOT trapped (§7.3.3, non-scrimmed).
 *   §9.1        logical utilities only. Nothing here reads `dir`.
 */

import { Suspense, lazy, type ReactNode, useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { DEFAULT_DEBOUNCE_MS } from '@/hooks'
import {
  columnFilterIssue,
  isDeepEqual,
  parseMoneyInput,
  parseNumericInput,
  type ColumnFilterValue,
  type Language,
  type Translate,
} from '@/lib'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
/**
 * **Lazy, and it is worth a comment because it is half a chunk.**
 *
 * `react-day-picker` plus `date-fns` measured **72 KB raw / 20.5 KB gzip —
 * 51.9% of the `DataTable` chunk**, which loads at 35 call sites across 23
 * screens. Every one of those screens paid for a calendar; the handful with a
 * date filter paid for it again on open.
 *
 * `Suspense` sits inside the popover, so the rest of the filter — the presets,
 * the two inputs, the footer — paints immediately and only the grid waits.
 */
const Calendar = lazy(() =>
  import('@/components/ui/calendar').then((m) => ({ default: m.Calendar })),
)
import { Checkbox } from '@/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { halalasToMajorInput, type ColumnFilterSpec } from './columns'

/** §6.1 — more than eight options earns a search field (`command`). */
const SEARCHABLE_FROM = 8

export interface ColumnFilterControlProps {
  t: Translate
  language: Language
  /** The column's (or `extraFilters` entry's) declaration. */
  filter: ColumnFilterSpec
  /** The column header, or the extra filter's own label. Never concatenated. */
  label: string
  /** The live value, read out of `table.filters`. This component owns no state the table can see. */
  value: ColumnFilterValue
  /** `toFilterSpec` turns this into a `FilterSpec`, or `null`, which means `removeFilter`. */
  onCommit: (value: ColumnFilterValue) => void
  /** `date-range`'s `Cancel` / `Apply` close the popover; nothing else does. */
  onClose: () => void
  /** §6.1 — the clock the date presets are computed against. Presets are absent without one. */
  today?: string | null
}

export function ColumnFilterControl(props: ColumnFilterControlProps) {
  const { t, filter, label } = props
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground">
        {t('table.filter.title', { column: label })}
      </p>
      {filter.kind === 'text' && <TextFilter {...props} />}
      {filter.kind === 'select' && <SelectFilter {...props} />}
      {filter.kind === 'multi-select' && <MultiSelectFilter {...props} />}
      {filter.kind === 'number-range' && <NumberRangeFilter {...props} />}
      {filter.kind === 'date-range' && <DateRangeFilter {...props} />}
      {filter.kind === 'boolean' && <BooleanFilter {...props} />}
    </div>
  )
}

/* ─────────────────────────── the debounce seam ─────────────────────────── */

/**
 * §6.1 — the control holds its own value and commits on a 250 ms trailing
 * debounce. `useIndexTable` debounces `query` but **not** `filters`.
 *
 * A pending change is flushed on unmount, so typing and immediately pressing
 * Escape still applies the filter the operator typed. Without that, the popover
 * would silently discard the last 250 ms of work.
 */
function useDebouncedCommit(
  value: ColumnFilterValue,
  onCommit: (value: ColumnFilterValue) => void,
): [ColumnFilterValue, (next: ColumnFilterValue) => void] {
  const [draft, setDraft] = useState(value)
  const pending = useRef<ColumnFilterValue | null>(null)
  const commit = useRef(onCommit)
  commit.current = onCommit

  useEffect(() => {
    if (isDeepEqual(draft, value)) {
      pending.current = null
      return
    }
    pending.current = draft
    const timer = setTimeout(() => {
      pending.current = null
      commit.current(draft)
    }, DEFAULT_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [draft, value])

  useEffect(
    () => () => {
      if (pending.current) commit.current(pending.current)
    },
    [],
  )

  return [draft, setDraft]
}

/* ───────────────────────────────── text ───────────────────────────────── */

function TextFilter({ t, label, value, onCommit }: ColumnFilterControlProps) {
  const [draft, setDraft] = useDebouncedCommit(value, onCommit)
  const text = draft.kind === 'text' ? draft.value : ''

  return (
    <InputGroup>
      <InputGroupAddon>
        <Search aria-hidden="true" className="size-3.5 text-muted-foreground" />
      </InputGroupAddon>
      <InputGroupInput
        autoFocus
        value={text}
        aria-label={t('table.filter.searchPlaceholder', { column: label })}
        placeholder={t('table.filter.searchPlaceholder', { column: label })}
        onChange={(event) => setDraft({ kind: 'text', value: event.target.value })}
      />
    </InputGroup>
  )
}

/* ──────────────────────────────── select ──────────────────────────────── */

/** §6.1 — `Any` first, and `Any` is what removes the chip. No second affordance. */
function SelectFilter({ t, filter, label, value, onCommit }: ColumnFilterControlProps) {
  const options = filter.options ?? []
  const selected = value.kind === 'select' ? value.value : null

  if (options.length === 0) return <NoOptions t={t} />

  return (
    <RadioGroup
      className="gap-1"
      aria-label={t('table.filter.title', { column: label })}
      value={selected ?? ''}
      onValueChange={(next) => onCommit({ kind: 'select', value: next === '' ? null : next })}
    >
      <OptionRow>
        <RadioGroupItem value="" />
        {t('table.filter.any')}
      </OptionRow>
      {options.map((option) => (
        <OptionRow key={option.value}>
          <RadioGroupItem value={option.value} />
          {option.label}
        </OptionRow>
      ))}
    </RadioGroup>
  )
}

/* ───────────────────────────── multi-select ───────────────────────────── */

/**
 * §6.1 — `in` **even for one selection**, so ticking a second box never changes
 * the query's *operator*. `toFilterSpec` owns that; this only ever hands it the
 * list.
 */
function MultiSelectFilter({ t, filter, label, value, onCommit }: ColumnFilterControlProps) {
  const options = filter.options ?? []
  const selected = value.kind === 'multi-select' ? value.values : []

  if (options.length === 0) return <NoOptions t={t} />

  function toggle(option: string) {
    const next = selected.includes(option)
      ? selected.filter((each) => each !== option)
      : [...selected, option]
    onCommit({ kind: 'multi-select', values: next })
  }

  if (options.length <= SEARCHABLE_FROM) {
    return (
      <div role="group" aria-label={t('table.filter.title', { column: label })} className="flex flex-col gap-1">
        {options.map((option) => (
          <OptionRow key={option.value}>
            <Checkbox
              checked={selected.includes(option.value)}
              onCheckedChange={() => toggle(option.value)}
              aria-label={option.label}
            />
            {option.label}
          </OptionRow>
        ))}
      </div>
    )
  }

  /* §6.1 — past eight options the list earns a search field. `CommandList`
     already bounds its own height and scrolls, so no second scroll container is
     introduced: two nested scrollports is worse than the one the spec's
     `scroll-area (> 12)` row was reaching for. */
  return (
    <Command className="-mx-1" label={t('table.filter.title', { column: label })}>
      <CommandInput placeholder={t('table.filter.optionSearch')} />
      <CommandList>
        {/* §11.7 — deliberately does NOT quote the query. */}
        <CommandEmpty className="py-3 text-start text-xs text-muted-foreground">
          {t('table.filter.noOptionsMatch')}
        </CommandEmpty>
        {options.map((option) => (
          <CommandItem key={option.value} value={option.label} onSelect={() => toggle(option.value)}>
            <Checkbox
              checked={selected.includes(option.value)}
              tabIndex={-1}
              aria-hidden="true"
              className="pointer-events-none"
            />
            {option.label}
          </CommandItem>
        ))}
      </CommandList>
    </Command>
  )
}

/* ───────────────────────────── number range ───────────────────────────── */

/**
 * §6.1 / §8.3.1 — the operator types major units; the wire carries integers.
 * Halalas for money, a plain count otherwise. `toFilterSpec` throws on a
 * decimal bound, and it is right to: a decimal means someone passed major units
 * one layer up, which is the `formatMoney(12.34)` bug.
 */
function NumberRangeFilter({ t, filter, label, value, onCommit }: ColumnFilterControlProps) {
  const money = (filter.unit ?? 'count') === 'money'
  const current = value.kind === 'number-range' ? value : null

  const render = (bound: number | null): string =>
    bound === null ? '' : money ? halalasToMajorInput(bound) : String(bound)

  const [fromText, setFromText] = useState(() => render(current?.min ?? null))
  const [toText, setToText] = useState(() => render(current?.max ?? null))

  const parse = (raw: string): number | null => {
    if (raw.trim() === '') return null
    if (money) return parseMoneyInput(raw)
    const parsed = parseNumericInput(raw)
    return parsed === null ? null : Math.round(parsed)
  }

  const unit = filter.unit ?? 'count'
  const min = parse(fromText)
  const max = parse(toText)
  const draft: ColumnFilterValue = { kind: 'number-range', min, max, unit }

  const inverted = columnFilterIssue(draft) === 'range-inverted'
  const [, setDraft] = useDebouncedCommit(value, onCommit)

  /* §11.8 — while inverted, NOTHING is emitted and the previous value stands.
     `between [500, 100]` silently matches nothing and reads to an operator as
     "no results", so the control must never produce it. Deps are the parsed
     bounds, not the draft object, so a re-render cannot re-arm the timer. */
  useEffect(() => {
    if (!inverted) setDraft({ kind: 'number-range', min, max, unit })
  }, [min, max, unit, inverted, setDraft])

  const field = (
    id: 'from' | 'to',
    text: string,
    set: (next: string) => void,
  ) => (
    <label className="flex items-center gap-2 text-sm">
      <span className="w-10 shrink-0 text-xs text-muted-foreground">
        {t(id === 'from' ? 'table.filter.from' : 'table.filter.to')}
      </span>
      {money ? (
        <InputGroup>
          {/* §4.2 — the currency prefix rule governs INPUTS. */}
          <InputGroupAddon>
            <span className="text-xs text-muted-foreground">SAR</span>
          </InputGroupAddon>
          <InputGroupInput
            inputMode="decimal"
            className="text-end tabular-nums"
            value={text}
            aria-label={`${label} ${t(id === 'from' ? 'table.filter.from' : 'table.filter.to')}`}
            onChange={(event) => set(event.target.value)}
          />
        </InputGroup>
      ) : (
        <Input
          inputMode="numeric"
          className="text-end tabular-nums"
          value={text}
          aria-label={`${label} ${t(id === 'from' ? 'table.filter.from' : 'table.filter.to')}`}
          onChange={(event) => set(event.target.value)}
        />
      )}
    </label>
  )

  return (
    <div className="flex flex-col gap-1.5">
      {field('from', fromText, setFromText)}
      {field('to', toText, setToText)}
      {/* §4.4 — an INLINE error. Imperative, names the fix (copy.md rule 4). */}
      {inverted && (
        <p role="alert" className="text-xs text-destructive">
          {t('table.filter.rangeError')}
        </p>
      )}
    </div>
  )
}

/* ────────────────────────────── date range ────────────────────────────── */

/** Calendar arithmetic on the day string itself: no zone, no `Intl`, no drift. */
function addDays(day: string, delta: number): string {
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1, date) + delta * 86_400_000)
  return shifted.toISOString().slice(0, 10)
}

function toLocalDate(day: string | null): Date | undefined {
  if (day === null) return undefined
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number)
  return new Date(year, month - 1, date)
}

function toIsoDay(date: Date | undefined): string | null {
  if (!date) return null
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/**
 * §6.1 — the one filter with `Cancel` / `Apply`, because a half-chosen range is
 * not a filter. `00-shell.md` §13.1's existing ruling, adopted, not re-decided.
 *
 * A preset applies on click and closes. A custom range needs `Apply`, and
 * `Apply` is DISABLED while the range is inverted (§3.2: validate by disabling
 * the primary, not by erroring after submit) — **AC-100**.
 *
 * The closing day is not dropped: `toFilterSpec` converts the upper bound to
 * `23:59:59.999+03:00` itself, so nothing here re-does the instant conversion.
 */
function DateRangeFilter({ t, value, onCommit, onClose, today }: ColumnFilterControlProps) {
  const current = value.kind === 'date-range' ? value : { from: null, to: null }
  const [from, setFrom] = useState<string | null>(current.from)
  const [to, setTo] = useState<string | null>(current.to)

  const draft: ColumnFilterValue = { kind: 'date-range', from, to }
  const inverted = columnFilterIssue(draft) === 'range-inverted'

  function applyPreset(days: number) {
    if (today == null) return
    onCommit({ kind: 'date-range', from: addDays(today, -(days - 1)), to: today })
    onClose()
  }

  return (
    <div className="flex flex-col gap-2">
      {today != null && (
        <div className="flex flex-col gap-1">
          {[7, 30, 90].map((days) => (
            <Button
              key={days}
              variant="ghost"
              size="xs"
              className="justify-start font-normal"
              onClick={() => applyPreset(days)}
            >
              {t('table.filter.lastDays', { days: String(days) })}
            </Button>
          ))}
        </div>
      )}
      <Separator />
      <Suspense
        fallback={
          /* The grid's own footprint, so the popover does not resize under the
             pointer when the chunk lands. Two months at the calendar's height. */
          <div className="h-62 w-full" aria-hidden />
        }
      >
        <Calendar
          mode="range"
          numberOfMonths={2}
          defaultMonth={toLocalDate(from) ?? toLocalDate(today ?? null)}
          selected={{ from: toLocalDate(from), to: toLocalDate(to) }}
          onSelect={(range) => {
            setFrom(toIsoDay(range?.from))
            setTo(toIsoDay(range?.to))
          }}
        />
      </Suspense>
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="xs" onClick={onClose}>
          {t('table.filter.cancel')}
        </Button>
        <Button
          variant="default"
          size="xs"
          disabled={inverted}
          onClick={() => {
            onCommit(draft)
            onClose()
          }}
        >
          {t('table.filter.apply')}
        </Button>
      </div>
    </div>
  )
}

/* ──────────────────────────────── boolean ──────────────────────────────── */

/** §4.3 — three states, so a radio group. `null` is "not set"; `false` is a filter. */
function BooleanFilter({ t, filter, label, value, onCommit }: ColumnFilterControlProps) {
  const selected = value.kind === 'boolean' ? value.value : null
  const asString = selected === null ? '' : selected ? 'true' : 'false'

  return (
    <RadioGroup
      className="gap-1"
      aria-label={t('table.filter.title', { column: label })}
      value={asString}
      onValueChange={(next) =>
        onCommit({ kind: 'boolean', value: next === '' ? null : next === 'true' })
      }
    >
      <OptionRow>
        <RadioGroupItem value="" />
        {t('table.filter.any')}
      </OptionRow>
      <OptionRow>
        <RadioGroupItem value="true" />
        {filter.trueLabel ?? t('table.filter.yes')}
      </OptionRow>
      <OptionRow>
        <RadioGroupItem value="false" />
        {filter.falseLabel ?? t('table.filter.no')}
      </OptionRow>
      <span className="sr-only">{label}</span>
    </RadioGroup>
  )
}

/* ──────────────────────────────── shared ──────────────────────────────── */

function OptionRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <label className={cn('flex items-center gap-2 rounded-lg px-1 py-0.5 text-sm hover:bg-accent', className)}>
      {children}
    </label>
  )
}

/** §11.6 / R8 — one grey sentence. Never an illustration inside a popover. */
function NoOptions({ t }: { t: Translate }) {
  return <p className="text-xs text-muted-foreground">{t('table.filter.noOptions')}</p>
}
