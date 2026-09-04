/**
 * **What this rule has actually done** — `alerts.history`, rendered at last.
 *
 * `AlertFiring` was fully modelled (`types/report.ts`), seeded with two rows
 * including the deliberate `notificationId: null` case, and served by
 * `listAlertFirings` — which had **zero callers**. So an operator could not see
 * that `ALR-1` fired twice, and could not see that one of those two firings is
 * no longer in the notification centre. The whole resource was invisible.
 *
 * ## It is a LEDGER, and that is not a styling choice
 *
 * §8.3: a firing is append-only. It cannot be edited, re-ordered, re-sent or
 * un-fired, and nothing about it is selectable in bulk.
 * `useIndexTable({ mode: 'ledger' })` returns a `LedgerTable` with no `sort`,
 * no `setSortField`, no `selectedIds` and no `toggleRow` **at all**, so a sort
 * control or a checkbox here is a compile error rather than a review comment.
 * No `rowActions` are declared, for the same reason: there is no act to perform
 * on a past crossing.
 *
 * Order is the client's — newest first (`alerts.ts`) — and it is posting order,
 * not a sort the operator chose.
 *
 * ## `notificationId === null` is a state, not a failure
 *
 * It means the notification this firing produced has since been cleared from
 * the centre. The firing still happened; the value still crossed the line. So
 * both readings are plain factual words in ordinary ink — no badge, no tone, no
 * `warning`, and nothing that would read as *this one went wrong*. R7 puts a
 * terminal factual outcome in neutral and neither of these is even an outcome.
 *
 * Rules applied
 *   §8.3        ledger mode: append-only, no sort, no row actions, no selection.
 *   §5.4        the four states, in order, all four present, and **the two
 *               empties are now told apart above the table**. A search that
 *               matched none of this rule's firings is still the `no-match`
 *               sentence, DECLARED as `emptyKind="no-match"` and no longer
 *               inherited from `DataTable` collapsing every ledger into it. A
 *               rule that has never fired is the illustrated state §H asks for,
 *               rendered instead of the table — a departure from R8, argued at
 *               the branch rather than absorbed.
 *   §H / §1.5   that illustration is DRAWN at the size it is read at. It is not
 *               a 16px lucide glyph scaled up, which reads as a broken image —
 *               see `NoFiringsIllustration`.
 *   §A6         the header carries one lucide glyph, 16px, `currentColor`,
 *               `aria-hidden`, with the title's words carrying the name.
 *   R7          no tone is spent on either notification reading.
 *   §9.2        a rule NAME is user content: never translated, `<bdi>`-isolated.
 *   §7.2        focus is the dialog's; nothing here kills an outline.
 */

import { useMemo } from 'react'
import { HistoryIcon } from 'lucide-react'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import type { DataColumn } from '@/components/table/columns'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
/* Deep import, NOT the `@/components/metrics` barrel — the barrel pulls
   recharts, and no chart renders on this surface. Same reason `AlertsView`
   reaches past it. */
import { formatMetricValue } from '@/components/metrics/formatMetric'
import { useAsync, useIndexTable } from '@/hooks'
import { listAlertFirings } from '@/data/clients'
import type { AlertFiring, AlertRule } from '@/data/types'
import { formatDate, isolatedRunProps, type Language, type Translator } from '@/lib'

export interface AlertHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `null` while no rule has been chosen — the dialog holds nothing and fetches nothing. */
  rule: AlertRule | null
  t: Translator
  language: Language
}

/**
 * Every firing this rule has produced. Fetched whole and narrowed here, the way
 * `LedgerCard` narrows a posting list: the toolbar's search field is
 * unconditional in `DataTable`, so it is **wired** rather than left to look
 * operable and do nothing.
 */
export function AlertHistoryDialog({
  open,
  onOpenChange,
  rule,
  t,
  language,
}: AlertHistoryDialogProps) {
  const table = useIndexTable({ mode: 'ledger' })

  const history = useAsync<readonly AlertFiring[]>(
    async (signal) => {
      if (rule === null) return []
      /* Whole, not paged: the narrowing below is client-side, and a page of
         rows the search cannot see is a search that lies about its result. */
      return (await listAlertFirings(rule.id, { pageSize: 200 }, signal)).items
    },
    {
      /* The rule id is the only input. Deliberately NOT cached: `alerts.history`
         is one operation id serving one rule at a time, and a cache key with no
         rule in it would hand the second rule the first rule's firings. */
      deps: [rule?.id ?? null, open],
      isEmpty: (rows) => rows.length === 0,
      enabled: open && rule !== null,
    },
  )

  const needle = table.params.q?.trim().toLowerCase() ?? ''
  const rows = useMemo(() => {
    const all = history.data ?? []
    if (needle === '') return all
    /* The bucket the firing read, and the firing's own id. Both are things an
       operator can type; neither is a translated string, so this narrows the
       same way in both languages. */
    return all.filter(
      (firing) =>
        firing.bucketStart.toLowerCase().includes(needle) ||
        firing.id.toLowerCase().includes(needle),
    )
  }, [history.data, needle])

  const status = history.status === 'content' && rows.length === 0 ? 'empty' : history.status

  const columns: Array<DataColumn<AlertFiring>> = [
    {
      id: 'firedAt',
      emphasis: 'primary',
      header: t('rb.alert.history.col.firedAt'),
      minWidth: 180,
      dataType: 'date',
      cell: (firing) => (
        <bdi>{formatDate(firing.firedAt, { style: 'day-month-time', language })}</bdi>
      ),
    },
    {
      id: 'bucket',
      header: t('rb.alert.history.col.bucket'),
      width: 140,
      dataType: 'date',
      cell: (firing) => (
        <bdi>{formatDate(firing.bucketStart, { style: 'day-month', language })}</bdi>
      ),
    },
    {
      id: 'value',
      emphasis: 'data',
      header: t('rb.alert.history.col.value'),
      width: 130,
      align: 'end',
      dataType: 'number',
      /* The unit comes off the RULE, never off the firing: `AlertFiring.value`
         is a bare number in the series' wire unit, and money on the wire is
         halalas. Formatting it as a count would be off by a factor of a
         hundred in the direction nobody notices. */
      cell: (firing) => (
        <span className="tabular-nums">
          {formatMetricValue(firing.value, rule?.thresholdUnit ?? 'count', language)}
        </span>
      ),
    },
    {
      id: 'threshold',
      header: t('rb.alert.history.col.threshold'),
      width: 130,
      align: 'end',
      dataType: 'number',
      /* The threshold **as it was when the rule fired**, from the firing and not
         from the rule: editing a rule's threshold must not rewrite what a past
         crossing was measured against. */
      cell: (firing) => (
        <span className="tabular-nums">
          {formatMetricValue(firing.threshold, rule?.thresholdUnit ?? 'count', language)}
        </span>
      ),
    },
    {
      id: 'notification',
      header: t('rb.alert.history.col.notification'),
      width: 240,
      dataType: 'text',
      /* Two ordinary sentences in ordinary ink. `null` is *cleared*, which is a
         normal end for a notification and not a fault — a badge, a tone or a
         muted grey would all read as the second thing. */
      cell: (firing) => (
        <span>
          {firing.notificationId === null
            ? t('rb.alert.history.notification.cleared')
            : t('rb.alert.history.notification.present')}
        </span>
      ),
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex min-w-0 items-center gap-2">
            {/* The register the rest of the module now carries: one lucide
                glyph, 16px, `currentColor`, `aria-hidden`, with the words
                beside it carrying the name. A ledger's glyph is the ledger's —
                a clock turning back — not the bell that made the entries. */}
            <HistoryIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            {/* The rule's NAME is user content — never translated, and it must
                render right-to-left inside an English UI (AC-898). */}
            <span {...isolatedRunProps({ className: 'min-w-0' }).box}>
              <bdi {...isolatedRunProps().run}>
                {t('rb.alert.history.title', { name: rule?.name ?? '' })}
              </bdi>
            </span>
          </DialogTitle>
          {/* §8.3 in one sentence, said rather than merely enforced: the
              operator is told the list is append-only instead of inferring it
              from the absence of every control they expected. */}
          <DialogDescription>{t('rb.alert.history.description')}</DialogDescription>
        </DialogHeader>

        {/* **A rule that has never fired gets the illustrated state, and the
            table is not rendered at all** (§H).

            Amplitude's notifications page answers zero the same way: a bell
            line-illustration, one sentence, and no list chrome. This surface
            used to render the whole `DataTable` — a search field, a header row
            and a column layout control — over one grey line reading *"This rule
            has not fired."*, which is a toolbar for narrowing nothing.

            **This is a departure from R8 and it is named rather than absorbed.**
            R8 rules a section's zero-records state to one grey sentence with no
            illustration, and the previous author applied that reading here. The
            counter-argument is that this dialog IS the surface — it is the
            whole of what the operator opened, not a card inside a page — so
            §11.1's page-level first-run is the shape that fits, with `card`
            off because the dialog is already the frame. `actions: []` is
            deliberate and is the one thing §11.1 asks for that cannot be given:
            **nobody creates a firing**, and an action here would be an invitation
            to do something impossible.

            The FILTERED zero is untouched and stays `no-match` below — one grey
            sentence and a way back — because those two facts are different and
            §11.1's illustration on a search result would claim the rule has
            never fired when it has. */}
        {history.status === 'empty' ? (
          <EmptyState
            kind="first-run"
            card={false}
            illustration={<NoFiringsIllustration />}
            heading={t('rb.alert.history.empty.heading')}
            body={t('rb.alert.history.empty')}
            actions={[]}
          />
        ) : (
          <DataTable
            table={table}
            rows={rows}
            columns={columns}
            getRowId={(firing) => firing.id}
            status={status}
            total={rows.length}
            t={t}
            language={language}
            tableId="management-reports-alert-history"
            searchPlaceholder={t('rb.alert.history.search')}
            skeletonPattern="P1"
            /* **The only empty this table can still reach is the FILTERED one**,
             and `emptyKind` keeps it a `no-match`: one grey sentence and a way
             back, no illustration and no heading.

             `DataTable` used to collapse a LEDGER's unfiltered zero into
             `no-match` too; that collapse was the defect and **LR-1** narrowed
             §9.2's absolute, so the branch no longer keys off the mode. The
             unfiltered zero is now handled ABOVE this component, with the
             illustration §H asks for — which is why the `firstRun` below is
             genuinely unreachable rather than merely unlikely. It stays because
             the prop is required and the copy is honest. */
            emptyKind="no-match"
            firstRun={{
              heading: t('rb.alert.history.empty'),
              body: t('rb.alert.history.empty'),
              actions: [],
            }}
            /* Both empties, told apart by the call site — the component cannot.
             *This rule has not fired* and *your search matched none of its
             firings* are different facts, and the second one has a way back. */
            noMatch={
              needle === ''
                ? { message: t('rb.alert.history.empty') }
                : {
                    message: t('rb.alert.history.noMatch'),
                    action: {
                      label: t('rb.alert.history.noMatch.action'),
                      onClick: table.clearAll,
                    },
                  }
            }
            error={{
              message: t('rb.alert.history.error'),
              onRetry: history.refetch,
            }}
          />
        )}

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            {t('rb.alert.history.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * **A bell that has not rung — an ILLUSTRATION, and the distinction is the
 * whole point of §1.5.**
 *
 * §H's empty notifications page is a bell line-illustration. The tempting
 * shortcut is `<BellIcon className="size-36" />`, and it is forbidden: a 16px
 * glyph enlarged nine times keeps its 2px stroke, which at that size reads as a
 * hairline outline of nothing — an operator sees a broken image, not a picture.
 * §1.5 sizes the icon set at 16px for exactly this reason, and the rule is not
 * waived by the Amplitude pass.
 *
 * So this is drawn at the size it is read at, in the same register and the same
 * `viewBox` as `EmptyState`'s own `DefaultIllustration`: a quiet ground, one
 * subject, two resting rules. **Every fill is a token**, so it cannot introduce
 * a colour — `fill-info` on its own pale ground is the one place blue survives
 * in an illustration here, which is the ruling `DefaultIllustration` already
 * carries, and it is `--ev-blue-lt` rather than anything borrowed from
 * Amplitude.
 *
 * It does not mirror (§9.5): a bell is an object and has no reading direction.
 */
function NoFiringsIllustration() {
  return (
    <svg
      viewBox="0 0 160 96"
      className="w-full"
      aria-hidden="true"
      focusable="false"
      data-illustration="alert-history"
    >
      <rect x="16" y="8" width="128" height="80" rx="14" className="fill-muted" />
      {/* the bell: a handle, a shoulder, a flared body and a rim */}
      <path
        d="M80 22a4 4 0 0 1 4 4v2.6a20 20 0 0 1 16 19.6V58l5 8.4a2 2 0 0 1-1.7 3H56.7a2 2 0 0 1-1.7-3L60 58v-9.8a20 20 0 0 1 16-19.6V26a4 4 0 0 1 4-4z"
        className="fill-info"
      />
      {/* the clapper, at rest */}
      <path d="M72 73.4h16a8 8 0 0 1-16 0z" className="fill-info-foreground" />
      {/* two resting rules: the ledger either side of it, with nothing posted */}
      <rect x="30" y="76" width="24" height="4" rx="2" className="fill-muted-foreground" />
      <rect x="106" y="76" width="24" height="4" rx="2" className="fill-muted-foreground" />
    </svg>
  )
}
