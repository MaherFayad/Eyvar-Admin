/**
 * The three shapes every profile card is built from — a field list, a compact
 * row list, and the rail-card-sized ledger §6.2 asks for by name.
 *
 * Rules applied
 *   §3.5        **an empty pair renders an explicit grey placeholder sentence,
 *               never blank.** `Field.value === null` is the pair that has no
 *               value, and it renders `Not recorded` in `--ev-text-2` rather
 *               than an empty cell. §7.2 repeats the rule for rail cards.
 *   §8.3.1      money goes through `Money`, so the ISO code trails, the
 *               negative is U+2212 and the run is bidi-isolated (**AC-73**).
 *   §8.3.1      `—` is reserved for not-applicable. A field whose value is
 *               genuinely absent says so in words; it does not borrow the dash.
 *   §6.2        the ledger card is **six rows, newest-first, balance column
 *               omitted** — §8.3.3's one permitted exception to the full
 *               ledger's shape — and it states its own truncation in words
 *               (§5.4: an end-of-list is never silent).
 *   R4          `tabular-nums` on every number, so the column of amounts lines
 *               up and does not shimmer between renders.
 *   §9.1        logical utilities only. The label/value pair mirrors under
 *               `dir="rtl"` because it is a logical flex row, not a float.
 *   §12.1       a badge is never interactive and always carries a word (§7.5).
 */

import type { ReactNode } from 'react'
import { Money } from '@/components/Money'
import { StatusBadge } from '@/components/StatusBadge'
import type { BadgeTone, Halalas, Ledger, LedgerPosting } from '@/data/types'
import { formatDate, formatLocalisedText, type Language, type Translate } from '@/lib'
import { cn } from '@/lib/utils'

/* ────────────────────────────── field list ────────────────────────────── */

export interface Field {
  label: string
  /**
   * `null` is **the empty pair** and renders §3.5's placeholder sentence. It is
   * not the same as the string `'—'`, which a caller uses for a value that is
   * genuinely not applicable to this record.
   */
  value: ReactNode | null
}

/**
 * A definition list. `<dl>` and not a table: these are pairs, not a grid, and a
 * screen reader announces the association without a header row to invent.
 */
export function FieldList({ fields, t }: { fields: readonly Field[]; t: Translate }) {
  return (
    <dl className="flex flex-col gap-1.5 text-sm">
      {fields.map((field) => (
        <div key={field.label} className="flex items-start justify-between gap-3">
          <dt className="shrink-0 text-muted-foreground">{field.label}</dt>
          <dd className="min-w-0 text-end text-foreground">
            {field.value === null ? (
              /* §3.5 — never blank. */
              <span className="text-muted-foreground">{t('profile.field.absent')}</span>
            ) : (
              field.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** Money, at a field's inline-end. Kept here so no card writes `formatMoney`. */
export function MoneyValue({ amount }: { amount: Halalas | null }) {
  return <Money amount={amount} className="tabular-nums" />
}

/** A number that must not shimmer between renders (R4). */
export function NumberValue({ children }: { children: ReactNode }) {
  return <span className="tabular-nums">{children}</span>
}

/* ─────────────────────────────── row list ─────────────────────────────── */

export interface ListRow {
  id: string
  /** Line one — the identity of the row. */
  title: string
  /** Line two — muted metadata. `null` renders one line, no orphan separator. */
  meta: string | null
  /** Inline-end: an amount, a count, a badge. */
  trailing?: ReactNode
  /** A status word, never colour alone (§7.5). */
  badge?: { tone: BadgeTone; label: string } | null
}

/**
 * Six-ish rows of a related collection. The card is not a table: it has no
 * toolbar, no sort and no selection, and giving it any of those would make it a
 * second, worse index screen inside a 480px drawer.
 */
export function RowList({
  rows,
  total,
  t,
}: {
  rows: readonly ListRow[]
  /** The server's total, so truncation is stated rather than implied (§5.4). */
  total: number
  t: Translate
}) {
  return (
    <div className="flex flex-col">
      <ul className="flex list-none flex-col divide-y divide-border">
        {rows.map((row) => (
          <li key={row.id} className="flex items-start justify-between gap-3 py-1.5 first:pt-0">
            <div className="min-w-0">
              <p className="truncate text-sm text-foreground">{row.title}</p>
              {row.meta !== null && (
                <p className="truncate text-xs text-muted-foreground">{row.meta}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2 text-sm text-foreground">
              {row.badge && <StatusBadge tone={row.badge.tone}>{row.badge.label}</StatusBadge>}
              {row.trailing}
            </div>
          </li>
        ))}
      </ul>
      {total > rows.length && (
        /* §5.4 — the end of a truncated list is stated in words. */
        <p className="pt-2 text-xs text-muted-foreground">
          {t('profile.list.truncated', { shown: rows.length, total })}
        </p>
      )}
    </div>
  )
}

/* ────────────────────────── the mini ledger (§6.2) ────────────────────── */

/** §6.2 — *"a rail-card-sized ledger: six rows"*. The number is the spec's. */
export const MINI_LEDGER_ROWS = 6

/**
 * §6.2's money card: **six rows, newest-first, balance column omitted**.
 *
 * `buildLedger` returns postings **oldest-first** (AC-317), because that is what
 * a full ledger reads like. This card is the documented exception and reverses
 * them — the operator opening a profile wants the last thing that happened, not
 * the first. The reversal is here and not in the client, so the full ledger's
 * contract is untouched.
 *
 * The balance column is omitted by §6.2. The closing balance is **not** — it is
 * the one number the card exists to answer, so it sits above the rows as a
 * labelled line, with `pendingHalalas` on its own line beneath (AC-312: pending
 * is excluded from the balance and never folded into it).
 */
export function MiniLedger({
  ledger,
  t,
  language,
}: {
  ledger: Ledger
  t: Translate
  language: Language
}) {
  const newestFirst = [...ledger.postings].reverse().slice(0, MINI_LEDGER_ROWS)

  return (
    <div className="flex flex-col gap-2">
      <FieldList
        t={t}
        fields={[
          { label: t('profile.field.balance'), value: <MoneyValue amount={ledger.closingBalanceHalalas} /> },
          ...(ledger.pendingHalalas === 0
            ? []
            : [
                {
                  label: t('profile.field.pending'),
                  value: <MoneyValue amount={ledger.pendingHalalas} />,
                },
              ]),
        ]}
      />
      {newestFirst.length > 0 && (
        <ul className="flex list-none flex-col divide-y divide-border border-t border-border pt-1.5">
          {newestFirst.map((posting) => (
            <PostingRow key={posting.id} posting={posting} t={t} language={language} />
          ))}
        </ul>
      )}
      {ledger.totalPostings > newestFirst.length && (
        <p className="text-xs text-muted-foreground">
          {t('profile.ledger.truncated', {
            shown: newestFirst.length,
            total: ledger.totalPostings,
          })}
        </p>
      )}
    </div>
  )
}

function PostingRow({
  posting,
  t,
  language,
}: {
  posting: LedgerPosting
  t: Translate
  language: Language
}) {
  return (
    <li className="flex items-start justify-between gap-3 py-1.5">
      <div className="min-w-0">
        {/* §11 — the description is an i18n key plus params, never a sentence
            the data layer concatenated. `formatLocalisedText` formats the
            `*Halalas` params through `formatMoney` on the way. */}
        <p className="truncate text-sm text-foreground">
          {formatLocalisedText(posting.description, t)}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {formatDate(posting.postedAt, { style: 'day-month-time', language })}
          {posting.reference === null ? '' : ` · ${posting.reference}`}
        </p>
      </div>
      {/* §7.5 — the direction is carried by a WORD, not by a colour or a sign
          the operator has to know the convention for. The amount itself is
          always positive (AC-300); which way it moved is the label. */}
      <div className="flex shrink-0 flex-col items-end">
        <MoneyValue amount={posting.amountHalalas} />
        <span className="text-xs text-muted-foreground">
          {t(posting.direction === 'credit' ? 'profile.ledger.credit' : 'profile.ledger.debit')}
        </span>
      </div>
    </li>
  )
}

/* ─────────────────────────────── a flag row ───────────────────────────── */

/**
 * The standing conditions on a record — `Flagged for declines`, `Invoice
 * overdue`, `Rider app out of sync`.
 *
 * They are **words in a list**, not colour: §7.5 forbids carrying a condition by
 * colour alone, and R5a spends red on four things none of which is a flag.
 * Nothing renders when the list is empty, and the caller says so instead.
 */
export function FlagList({ flags, className }: { flags: readonly string[]; className?: string }) {
  if (flags.length === 0) return null
  return (
    <ul className={cn('flex list-none flex-col gap-1 text-sm text-foreground', className)}>
      {flags.map((flag) => (
        <li key={flag}>{flag}</li>
      ))}
    </ul>
  )
}
