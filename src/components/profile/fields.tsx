/**
 * The three shapes every profile card is built from — a field list, a compact
 * row list, and the rail-card-sized ledger §6.2 asks for by name.
 *
 * Rules applied
 *   §3.5        **an empty pair renders an explicit grey placeholder sentence,
 *               never blank.** `Field.value === null` is the pair that has no
 *               value, and it renders `Not recorded` in `--ev-text-2` rather
 *               than an empty cell. §7.2 repeats the rule for rail cards.
 *
 *               **AMENDED — absence is stated ONCE PER CARD, naming the
 *               fields, when three or more of them are absent together.** The
 *               ruling's purpose is that a reader must never meet a blank and
 *               have to guess whether it is missing data or a broken render;
 *               that is preserved exactly, and nothing is silently dropped. It
 *               is the REPETITION the ruling did not anticipate.
 *
 *               Measured on `SUB-2003`: the Subscriptions card rendered seven
 *               pairs of which five read `Not recorded`, so the card was
 *               mostly one sentence printed five times, and `Cycle` and
 *               `Legs used` — the two facts it exists to carry — were
 *               outnumbered five to two by their own absence. The owner's
 *               words for the surface were *"a lot of redundancy"*.
 *
 *               Below three, the pairs stay inline: one `Not recorded` beside
 *               a value is a fact about that field and reads as one. Three is
 *               where it stops being a fact and starts being a texture.
 *
 *               The absent fields are still NAMED, in reading order, in the
 *               same grey, in one line — so the reader still learns exactly
 *               which facts are missing, which is the whole of what §3.5 was
 *               protecting.
 *   §8.3.1      money goes through `Money`, so the ISO code trails, the
 *               negative is U+2212 and the run is bidi-isolated (**AC-73**).
 *   §8.3.1      `—` is reserved for not-applicable. A field whose value is
 *               genuinely absent says so in words; it does not borrow the dash.
 *   §6.2        the ledger card is **six rows, newest-first, balance column
 *               omitted** — §8.3.3's one permitted exception to the full
 *               ledger's shape — and it states its own truncation in words
 *               (§5.4: an end-of-list is never silent).
 *   R4          `tabular-nums` on every number, so the column of amounts lines
 *               up and does not shimmer between renders. The field list carries
 *               `data-numeric` for the same guarantee at the LIST level.
 *   §2.3 / H1   **the three emphasis tiers.** A label is META (12px,
 *               `--ev-text-2`, 400); a value is DATA (14px, `--ev-ink`, 400,
 *               tabular). The pair used to render at one size and separate on
 *               colour alone.
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
import { FactGrid } from '@/components/FactGrid'

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
 * How many absent fields a list tolerates inline before it groups them.
 *
 * Two is a pair of facts. Three is a pattern, and by five the card is a
 * paragraph of the same sentence — see §3.5's amendment above for the
 * `SUB-2003` measurement that set this.
 */
const GROUP_ABSENT_FROM = 3

/**
 * Split a field list into the pairs that carry a value and the labels that do
 * not, preserving declaration order in both.
 *
 * Returns the ORIGINAL list unsplit when there are too few absences to group,
 * so the common card — everything recorded, or one thing missing — renders
 * byte-identically to before this existed.
 */
export function splitAbsent(fields: readonly Field[]): {
  present: readonly Field[]
  absentLabels: readonly string[]
} {
  const absent = fields.filter((field) => field.value === null)
  if (absent.length < GROUP_ABSENT_FROM) return { present: fields, absentLabels: [] }
  return {
    present: fields.filter((field) => field.value !== null),
    absentLabels: absent.map((field) => field.label),
  }
}

/**
 * A definition list. `<dl>` and not a table: these are pairs, not a grid, and a
 * screen reader announces the association without a header row to invent.
 */
/**
 * **`layout` — the same pairs, laid out for the box they are in.**
 *
 * `'rows'` is the RAIL's form and the default: a compact column of
 * `label … value` lines, ~250px across in a 320px rail, which is where the pair
 * still reads as a pair. Twenty of them stay twenty lines tall.
 *
 * `'grid'` is for a pair list inside a CARD, where the row form breaks down.
 * The entity drawer runs 453px and the full profile page 702px, and at 702px a
 * `justify-between` row put the chevron of a section header 630px from its own
 * label — the same geometry, measured, that made `Refunds … 158.86 SAR` 879px
 * apart on Financials Overview. Past roughly 420px a label and its value stop
 * being one object. `'grid'` wraps the pairs into auto-fit columns instead, so
 * the drawer gets two and the page gets three, from one markup and with no
 * breakpoint.
 */
export function FieldList({
  fields,
  t,
  layout = 'rows',
}: {
  fields: readonly Field[]
  t: Translate
  layout?: 'rows' | 'grid'
}) {
  const { present, absentLabels } = splitAbsent(fields)

  if (layout === 'grid') {
    return (
      <div className="flex flex-col gap-2">
      <FactGrid
        facts={present.map((field) => ({
          label: field.label,
          /* The null placeholder and the `<bdi>` isolate are the two things
             this file owns and neither is duplicated in `FactGrid` — the
             mapping applies both, so a grid-laid field behaves exactly as a
             row-laid one. See the long note on the row branch for why the
             isolate cannot move to the call sites. */
          value:
            field.value === null ? (
              <span className="font-normal text-muted-foreground">
                {t('profile.field.absent')}
              </span>
            ) : (
              <bdi>{field.value}</bdi>
            ),
        }))}
      />
      <AbsentLine labels={absentLabels} t={t} />
      </div>
    )
  }

  return (
    /* **§2.3 / H1 — the properties rail is where the three tiers are most
       legible, and it had none.** Both sides rendered at `--text-sm`, separated
       by colour alone, so a twenty-row rail was twenty pairs of equal weight
       and the eye had nothing to run down. The rail now reads label-META over
       value-DATA: **12px grey label, 14px ink value.** Size and colour move in
       the same direction, which is H3's law.

       `data-numeric` — the `globals.css` numeric defence that had zero
       consumers, on the hook it names for *"a number outside a table"*. A rail
       is a column of amounts, dates and counts read down; pinning the figures
       on the list means `MoneyValue` and `NumberValue` are a convenience rather
       than the only thing standing between the rail and a shimmer.

       `items-baseline` and not `items-start`: two different sizes in one row
       align on the text baseline, not on the top of two different line boxes.
       Without it the 12px label sits 2px proud of its own value. */
    <dl data-numeric className="flex flex-col gap-1.5 text-sm">
      {present.map((field) => (
        <div key={field.label} className="flex items-baseline justify-between gap-3">
          <dt className="shrink-0 text-xs text-muted-foreground">{field.label}</dt>
          <dd className="min-w-0 text-end text-foreground">
            {field.value === null ? (
              /* §3.5 — never blank. */
              <span className="text-muted-foreground">{t('profile.field.absent')}</span>
            ) : (
              /**
               * **`<bdi>` — AC-73, and the rail was failing it on four kinds of
               * value at once.** Caught by eye at 1512 under `dir="rtl"` on
               * `/entity/DRV-0101`, which is how this class of defect is always
               * caught: no source audit can see it, because every one of these
               * strings is correct and it is the paragraph around them that is
               * reordering the run.
               *
               *   `4 of 5`            rendered `of 5 4`
               *   `25 Jun 07:00`      rendered `Jun 07:00 25`
               *   `+966 53 001 0101`  rendered `0101 001 53 966+`
               *   `1 Feb`             rendered `Feb 1`
               *
               * All four are the same mechanism: a LATIN run whose internal
               * separators — a space, a `+`, a `:`, the word `of` — are
               * bidi-NEUTRAL, so the UBA resolves them against the paragraph
               * and walks the pieces right to left. A phone number that reads
               * backwards is not a mirrored layout, it is a wrong number.
               *
               * **It belongs here and not at the call sites.** `money.ts` sets
               * the precedent in terms — isolation is the COMPONENT's job,
               * deliberately, so that embedding U+2068/U+2069 in the string
               * does not poison copy-paste and test assertions. One `<bdi>` on
               * the value slot fixes every rail in the product; forty call
               * sites would each have to remember.
               *
               * **Inline, and that is load-bearing.** `<bdi>` derives its own
               * `direction` from its content, so a STRETCHED one aligns its
               * text to ITS start rather than the row's end — the defect
               * `MetricTile` records from its own tile value. `<bdi>` is inline
               * by default and `<dd>` keeps `text-end`, so the box positions
               * the run and the isolate only scopes it. An Arabic value still
               * lays out RTL: `<bdi>` takes its direction from the first STRONG
               * character, not from its parent.
               */
              <bdi>{field.value}</bdi>
            )}
          </dd>
        </div>
      ))}
      {absentLabels.length > 0 && (
        /* Inside the `<dl>` so the association survives: it is still a
           statement about these pairs, and a screen reader reaching it has
           just been read the ones that do have values. */
        <div className="pt-0.5">
          <AbsentLine labels={absentLabels} t={t} />
        </div>
      )}
    </dl>
  )
}

/**
 * §3.5 as amended — **one line, naming every field this record has no value
 * for.**
 *
 * ## What it replaces
 *
 * Five pairs each reading `Not recorded`, which is what `SUB-2003`'s
 * Subscriptions card was: seven fields, five of them absent, so the card said
 * the same thing five times and the two facts it exists to carry were
 * outnumbered by their own absence.
 *
 * ## Why naming them matters, and why this is not a deletion
 *
 * §3.5's rule is that a reader must never meet a blank and have to work out
 * whether it is missing data or a broken render. That is met here and met
 * better: a blank would say nothing, five repetitions say one thing five
 * times, and this says exactly which facts are missing, once, in the order
 * they were declared.
 *
 * The labels are joined with `·` rather than `,` because several of them are
 * already phrases containing a comma's worth of pause — `Cancellation reason`,
 * `Renewal likelihood` — and a comma list of noun phrases reads as one long
 * noun phrase. The separator is decorative and is hidden from a screen reader,
 * which gets the labels as text.
 *
 * **Not a `<details>` and not a toggle.** The point is to spend one line
 * instead of five, and a control that has to be operated to learn what is
 * missing costs a click to recover information the reader had before this
 * change. It is shorter, not hidden.
 */
function AbsentLine({ labels, t }: { labels: readonly string[]; t: Translate }) {
  if (labels.length === 0) return null
  return (
    <p className="text-xs text-muted-foreground">
      <span className="font-medium">{t('profile.field.absentMany')}</span>{' '}
      {labels.map((label, index) => (
        <span key={label}>
          {index > 0 && <span aria-hidden="true"> · </span>}
          {label}
        </span>
      ))}
    </p>
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
