/**
 * Admin › Data & Compliance — the **data integrity pane** (P6-T4).
 *
 * Replaces the legacy `#stab-integrity` (`eyvar_ops_panel_v40_fixed.html:1750`),
 * which had zero coverage in this rebuild.
 *
 * ## The one rule the whole surface is built around
 *
 * **Every finding row names the check that produced it.** The `Found by` column
 * is not optional, not a tooltip, and not a filter you have to apply to see it:
 * it is on every row, always. A finding with no provenance is unactionable —
 * the operator cannot tell a real problem from a rule that has gone stale, and
 * so cannot decide whether to fix the record or delete the check. Legacy prints
 * `Trips: 42 vs 0` with no author, which is why nobody there ever retired a
 * check.
 *
 * ## Four states, twice
 *
 * There are two data surfaces here and each owes four states:
 *
 *   **the catalogue** — `listIntegrityChecks()`. Loading is a skeleton, error is
 *   a card-scoped retry, empty is a first-run empty (unreachable in practice
 *   with fifteen checks compiled in, and built anyway because the day someone
 *   makes the catalogue a server read is not the day to discover it).
 *
 *   **the findings** — the result of a run, and the interesting one:
 *     *not run*   → `first-run` empty. Names what the pane is FOR, and its
 *                   action starts the run. This is not "no findings".
 *     *running*   → a progress state on the button and an `aria-busy` region,
 *                   because a scan over every collection is not instant.
 *     *clean*     → `cleared` (**R8**). *Every check passed* — a SUCCESS, with
 *                   the record count behind it so `0` means something. It is
 *                   emphatically not `first-run`: records exist, the checks ran,
 *                   and there is nothing for the operator to create.
 *     *findings*  → the table.
 *
 * ## Running is an explicit act
 *
 * Nothing scans on mount. Legacy re-runs `integrityScan()` on every navigation
 * to `settings` (`:8819`), which is exactly why no result there can be dated —
 * `Last run` would always read "just now" and would always be true and useless.
 * Here `Last run` is empty until an operator chooses to run, and `Not run yet`
 * and `Passed` are different words for different facts.
 *
 * ## A check reports; it does not repair
 *
 * There is no fix button and no bulk resolve. Legacy's equivalent —
 * `rebuildAllHistory()` (`:18605`) — *generates* trip and payment records so a
 * stored total stops disagreeing, has **no permission gate** (`16b` §12 item 1)
 * and prices the fabricated fares off a rate card that does not exist (§12 items
 * 2 and 3). Repair proposals are in the handoff, unbuilt.
 *
 * ## Two legacy defects closed on the way past
 *
 *   `16b` §12 item 9 — *the 40-row cap has no "show all"*, so beyond 40 rows the
 *   only way to see the rest was the CSV export. Here the cap is explicit, the
 *   total is stated, and `Show all findings` shows all of them.
 *
 *   `16b` §12 item 10 — *no sorting*, so a red row could sit below 39 amber
 *   ones. Ordering is the client's (`sortFindings`): severity, then check, then
 *   record, and every consumer gets it.
 *
 * Rules applied
 *   R7 / R17   `critical` and `warning` share ONE warning tone and are told
 *              apart by the LABEL. There is no red badge and no sixth tone.
 *   R5a        the only red is `RowCriticalMarker` on a critical finding's
 *              leading edge — a marker, not a badge, outside the content box.
 *   §11.2      `Run` is disabled in place with its reason, never hidden.
 *   §11.1/R8   three empties, and the `cleared` one reads as success.
 *   §9.1       logical utilities only; nothing here has a physical direction.
 *   §7.2       every control is a real `<button>` or `<a>` and keeps its ring.
 *   §8.3       money in a finding is formatted by `formatLocalisedText`, which
 *              is the only formatter — the templates carry integer halalas.
 */

import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { RefreshCw, ShieldCheck } from 'lucide-react'

import {
  listIntegrityChecks,
  runIntegrityChecks,
  sortFindings,
} from '@/data/clients'
import type {
  IntegrityCheck,
  IntegrityCheckGroup,
  IntegrityCheckId,
  IntegrityEntityType,
  IntegrityFinding,
  IntegrityGrouping,
  IntegrityRun,
} from '@/data/types/integrity'
import {
  INTEGRITY_CHECK_GROUPS,
  INTEGRITY_LINKABLE_ENTITY_TYPES,
  INTEGRITY_SEVERITY_TONE,
} from '@/data/types/integrity'
import { formatCount, formatDate, formatLocalisedText } from '@/lib'
import { useAnnounce, useAsync } from '@/hooks'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { RowCriticalMarker, StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useShell } from '@/shell/ShellContext'
import { withOverlay } from '@/shell/routeState'
import { BlockedButton } from './BlockedButton'
import { withFallback } from '../../operations/localCopy'
import { ADMIN_DATA_EN } from './copy'

/**
 * How many findings render before the operator asks for the rest.
 *
 * 50 rather than legacy's 40, and — the part that matters — with a control that
 * shows **all** of them (`16b` §12 item 9). A cap with no escape is a cap that
 * sends the operator to a CSV to read their own console.
 */
const FIRST_PAGE = 50

/** The order the entity groups appear in when the table is grouped by record. */
const ENTITY_ORDER: readonly IntegrityEntityType[] = [
  'rider',
  'driver',
  'trip',
  'subscription',
  'ticket',
  'corporate-account',
  'payout',
  'escrow-hold',
  'deduction',
  'ledger-posting',
  'journal-entry',
]

type RunPhase = { kind: 'idle' } | { kind: 'running'; only: IntegrityCheckId | null } | { kind: 'failed'; error: Error }

export function IntegrityPane() {
  const shell = useShell()
  /* AC-74 — the copy lives in `./copy.ts` and travels in this screen's
     own chunk. `withFallback` resolves a key the shell dictionary does
     not carry, so nothing here needs registering there. */
  const t = useMemo(
    /* **Memoised, and it is load-bearing.** `withFallback` returns a NEW
       function on every call, and several screens carry `t` in a `deps`
       array — so an unmemoised wrapper re-ran the fetch, which re-rendered,
       which rebuilt the wrapper. Two suites hung outright. */
    () => withFallback(shell.language.t, ADMIN_DATA_EN),
    [shell.language.t],
  )
  const { language } = shell.language
  const location = useLocation()
  const announce = useAnnounce()

  /* The catalogue read. `manage_settings` is the gate the legacy pane's only
     other write already used; the run itself changes nothing, but a scan over
     every collection in the product is not a read every role should be able to
     start. See the handoff — nothing can currently fail this. */
  const canRun = shell.permissions.permissions.includes('manage_settings')
  const blockedReason = canRun ? null : t('adminData.integrity.blocked.permission')

  /* A static catalogue of check definitions; the fetcher takes only a signal.
     After a run the pane prefers `run.checks`, so a warm entry can never
     shadow a result the operator just produced. */
  const catalogue = useAsync<IntegrityCheck[]>((signal) => listIntegrityChecks(signal), {
    deps: [],
    cacheKey: 'integrity.checks',
  })

  const [run, setRun] = useState<IntegrityRun | null>(null)
  const [phase, setPhase] = useState<RunPhase>({ kind: 'idle' })
  const [grouping, setGrouping] = useState<IntegrityGrouping>('check')
  const [visible, setVisible] = useState(FIRST_PAGE)

  /* After a run, the run's own catalogue is the fresher one — it carries the
     last-run stamp and the counts. Before one, the read's. */
  const checks = run?.checks ?? catalogue.data ?? []

  const start = async (only: IntegrityCheckId | null) => {
    setPhase({ kind: 'running', only })
    try {
      const result = await runIntegrityChecks(only === null ? {} : { checkIds: [only] })
      setRun((previous) => {
        if (previous === null) return result
        /* A single check re-run replaces only its own rows. Keeping the old
           ones would show a finding that no longer exists beside a count that
           says it does — which is the class of defect this pane reports. */
        const covered = new Set(result.checkIds)
        const kept = previous.findings.filter((f) => !covered.has(f.checkId))
        return { ...result, findings: sortFindings([...kept, ...result.findings]) }
      })
      setVisible(FIRST_PAGE)
      setPhase({ kind: 'idle' })
      announce(
        result.findings.length === 0
          ? t('adminData.integrity.clear.heading')
          : t('adminData.integrity.findingCount', { count: formatCount(result.findings.length, language) }),
      )
    } catch (error) {
      setPhase({ kind: 'failed', error: error instanceof Error ? error : new Error(String(error)) })
    }
  }

  /* Totals come from the CHECKS, not from the last run's envelope: after a
     single-check re-run the envelope describes one check and the pane is
     describing all fifteen. */
  const ranChecks = checks.filter((c) => c.lastRunAt !== null)
  const totalFindings = ranChecks.reduce((sum, c) => sum + (c.findingCount ?? 0), 0)
  const totalScanned = ranChecks.reduce((sum, c) => sum + (c.recordsScanned ?? 0), 0)

  const findings = run?.findings ?? []
  const groups = useMemo(() => groupFindings(findings, grouping, checks), [findings, grouping, checks])

  return (
    <Card>
      <CardHeader className="gap-2 border-b border-border pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              {t('adminData.integrity.title')}
            </CardTitle>
            <CardDescription className="max-w-2xl text-xs">
              {t('adminData.integrity.desc')}
            </CardDescription>
          </div>
          {/* R3 — this is the ONE primary on the screen. The export and the
              retention save are both secondary; a data-integrity scan is the
              act this page exists for. */}
          <BlockedButton
            label={t('adminData.integrity.run')}
            variant="default"
            reason={blockedReason}
            disabled={phase.kind === 'running'}
            onClick={() => void start(null)}
          >
            {phase.kind === 'running' && phase.only === null ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                {t('adminData.integrity.running')}
              </>
            ) : (
              t(run === null ? 'adminData.integrity.run' : 'adminData.integrity.rerun')
            )}
          </BlockedButton>
        </div>

        {ranChecks.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {t(
              totalFindings === 0
                ? 'adminData.integrity.runSummary.clean'
                : 'adminData.integrity.runSummary',
              {
                run: run?.id ?? '',
                records: formatCount(totalScanned, language),
                checks: formatCount(ranChecks.length, language),
                findings: formatCount(totalFindings, language),
              },
            )}
          </p>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {catalogue.status === 'loading' && (
          <LoadingSkeleton pattern="P4" rows={6} label={t('adminData.integrity.loading')} />
        )}

        {catalogue.status === 'error' && (
          <ErrorState
            scope="card"
            card={false}
            message={t('adminData.integrity.error.message')}
            action={{ label: t('adminData.integrity.error.retry'), onClick: catalogue.refetch }}
          />
        )}

        {catalogue.status === 'empty' && (
          <EmptyState
            kind="first-run"
            card={false}
            illustration={null}
            heading={t('adminData.integrity.empty.heading')}
            body={t('adminData.integrity.empty.body')}
            actions={[{ label: t('adminData.integrity.empty.action'), onClick: () => void start(null), primary: true }]}
          />
        )}

        {catalogue.status === 'content' && (
          <>
            <CheckList
              checks={checks}
              phase={phase}
              blockedReason={blockedReason}
              onRun={(id) => void start(id)}
            />
            <FindingsSection
              run={run}
              phase={phase}
              groups={groups}
              grouping={grouping}
              onGrouping={setGrouping}
              visible={visible}
              onShowAll={() => setVisible(Number.MAX_SAFE_INTEGER)}
              totalFindings={totalFindings}
              totalScanned={totalScanned}
              onRun={() => void start(null)}
              location={location}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}

/* ─────────────────────────── the check list ──────────────────────────── */

function CheckList({
  checks,
  phase,
  blockedReason,
  onRun,
}: {
  checks: readonly IntegrityCheck[]
  phase: RunPhase
  blockedReason: string | null
  onRun: (id: IntegrityCheckId) => void
}) {
  const { t, language } = useShell().language

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('adminData.integrity.col.check')}</TableHead>
          <TableHead className="w-32">{t('adminData.integrity.col.lastRun')}</TableHead>
          <TableHead className="w-28">{t('adminData.integrity.col.findings')}</TableHead>
          <TableHead className="w-28">{t('adminData.integrity.col.severity')}</TableHead>
          <TableHead className="w-40 text-end">{t('adminData.integrity.col.action')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {INTEGRITY_CHECK_GROUPS.flatMap((group) => {
          const rows = checks.filter((c) => c.group === group)
          if (rows.length === 0) return []
          return [
            <TableRow key={`group-${group}`} className="bg-muted/40 hover:bg-muted/40">
              <TableCell colSpan={5} className="py-1.5 text-xs font-semibold text-muted-foreground">
                {t(groupKey(group))}
              </TableCell>
            </TableRow>,
            ...rows.map((check) => (
              <TableRow key={check.id}>
                <TableCell className="align-top">
                  <span className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-foreground">{t(check.titleKey)}</span>
                    <span className="max-w-xl text-xs text-muted-foreground">{t(check.descriptionKey)}</span>
                  </span>
                </TableCell>
                <TableCell className="align-top text-xs text-muted-foreground">
                  {check.lastRunAt === null ? (
                    t('adminData.integrity.neverRun')
                  ) : (
                    <span className="flex flex-col gap-0.5">
                      <bdi>{formatDate(check.lastRunAt, { style: 'day-month-time', language })}</bdi>
                      <span>
                        {t('adminData.integrity.scanned', {
                          count: formatCount(check.recordsScanned ?? 0, language),
                        })}
                      </span>
                    </span>
                  )}
                </TableCell>
                <TableCell className="align-top text-xs">
                  {check.findingCount === null ? (
                    <span className="text-muted-foreground">{t('adminData.integrity.neverRun')}</span>
                  ) : check.findingCount === 0 ? (
                    <StatusBadge tone="success">{t('adminData.integrity.clean')}</StatusBadge>
                  ) : (
                    <bdi className="font-medium text-foreground">
                      {t('adminData.integrity.findingCount', {
                        count: formatCount(check.findingCount, language),
                      })}
                    </bdi>
                  )}
                </TableCell>
                <TableCell className="align-top">
                  <StatusBadge tone={INTEGRITY_SEVERITY_TONE[check.severity]}>
                    {t(`adminData.integrity.severity.${check.severity}`)}
                  </StatusBadge>
                </TableCell>
                <TableCell className="align-top text-end">
                  <span className="flex justify-end">
                    <BlockedButton
                      label={t('adminData.integrity.runOne.a11y', { check: t(check.titleKey) })}
                      reason={blockedReason}
                      disabled={phase.kind === 'running'}
                      onClick={() => onRun(check.id)}
                    >
                      {phase.kind === 'running' && phase.only === check.id
                        ? t('adminData.integrity.runningOne')
                        : t('adminData.integrity.runOne')}
                    </BlockedButton>
                  </span>
                </TableCell>
              </TableRow>
            )),
          ]
        })}
      </TableBody>
    </Table>
  )
}

/* ───────────────────────────── the findings ──────────────────────────── */

interface FindingGroup {
  key: string
  rows: IntegrityFinding[]
}

function FindingsSection({
  run,
  phase,
  groups,
  grouping,
  onGrouping,
  visible,
  onShowAll,
  totalFindings,
  totalScanned,
  onRun,
  location,
}: {
  run: IntegrityRun | null
  phase: RunPhase
  groups: readonly FindingGroup[]
  grouping: IntegrityGrouping
  onGrouping: (next: IntegrityGrouping) => void
  visible: number
  onShowAll: () => void
  totalFindings: number
  totalScanned: number
  onRun: () => void
  location: { pathname: string; search: string }
}) {
  const { t, language } = useShell().language

  /* ── error: the run itself did not finish ── */
  if (phase.kind === 'failed') {
    return (
      <div className="border-t border-border">
        <ErrorState
          scope="card"
          card={false}
          message={t('adminData.integrity.error.message')}
          action={{ label: t('adminData.integrity.error.retry'), onClick: onRun }}
        />
      </div>
    )
  }

  /* ── loading: a full scan is in flight and there is nothing to show yet ── */
  if (phase.kind === 'running' && phase.only === null && run === null) {
    return (
      <div className="border-t border-border" aria-busy="true">
        <LoadingSkeleton pattern="P1" rows={5} label={t('adminData.integrity.scanning')} />
      </div>
    )
  }

  /* ── first-run: the checks exist, nobody has run them ── */
  if (run === null) {
    return (
      <div className="border-t border-border">
        <EmptyState
          kind="first-run"
          card={false}
          heading={t('adminData.integrity.empty.heading')}
          body={t('adminData.integrity.empty.body')}
          actions={[{ label: t('adminData.integrity.empty.action'), onClick: onRun, primary: true }]}
        />
      </div>
    )
  }

  /* ── cleared (R8): a success, and it says so ── */
  if (totalFindings === 0) {
    return (
      <div className="border-t border-border">
        <EmptyState
          kind="cleared"
          card={false}
          heading={t('adminData.integrity.clear.heading')}
          body={t('adminData.integrity.clear.body', { records: formatCount(totalScanned, language) })}
        />
      </div>
    )
  }

  /* ── content ── */
  const flat = groups.flatMap((g) => g.rows)
  const shown = Math.min(visible, flat.length)
  let budget = shown

  return (
    <div className="border-t border-border">
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
        <h3 className="text-xs font-semibold text-foreground">
          {t('adminData.integrity.findings.title')}
        </h3>
        <span className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground" id="integrity-grouping-label">
            {t('adminData.integrity.groupBy')}
          </span>
          <ToggleGroup
            type="single"
            size="sm"
            value={grouping}
            aria-labelledby="integrity-grouping-label"
            onValueChange={(next) => {
              if (next === 'check' || next === 'entity') onGrouping(next)
            }}
          >
            <ToggleGroupItem value="check">{t('adminData.integrity.groupBy.check')}</ToggleGroupItem>
            <ToggleGroupItem value="entity">{t('adminData.integrity.groupBy.entity')}</ToggleGroupItem>
          </ToggleGroup>
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('adminData.integrity.findings.col.record')}</TableHead>
            {/* THE RULE. Never hidden, never a tooltip, never behind a filter. */}
            <TableHead className="w-56">{t('adminData.integrity.findings.col.check')}</TableHead>
            <TableHead>{t('adminData.integrity.findings.col.problem')}</TableHead>
            <TableHead className="w-32 text-end">{t('adminData.integrity.findings.col.open')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.flatMap((group) => {
            if (budget <= 0) return []
            const rows = group.rows.slice(0, budget)
            budget -= rows.length
            return [
              <TableRow key={`g-${group.key}`} className="bg-muted/40 hover:bg-muted/40">
                <TableCell colSpan={4} className="py-1.5 text-xs font-semibold text-muted-foreground">
                  {t(
                    grouping === 'check'
                      ? 'adminData.integrity.groupHeading.check'
                      : 'adminData.integrity.groupHeading.entity',
                    grouping === 'check'
                      ? {
                          check: t(`integrity.check.${group.key}.title`),
                          count: formatCount(group.rows.length, language),
                        }
                      : {
                          entity: t(`adminData.integrity.entity.${group.key}`),
                          count: formatCount(group.rows.length, language),
                        },
                  )}
                </TableCell>
              </TableRow>,
              ...rows.map((f) => (
                <FindingRow key={f.id} finding={f} location={location} />
              )),
            ]
          })}
        </TableBody>
      </Table>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2.5">
        <span className="text-xs text-muted-foreground">
          {t('adminData.integrity.findings.showing', {
            shown: formatCount(shown, language),
            total: formatCount(flat.length, language),
          })}
        </span>
        {shown < flat.length && (
          <Button size="xs" variant="secondary" onClick={onShowAll}>
            {t('adminData.integrity.findings.showAll')}
          </Button>
        )}
      </div>
    </div>
  )
}

function FindingRow({
  finding,
  location,
}: {
  finding: IntegrityFinding
  location: { pathname: string; search: string }
}) {
  const { t } = useShell().language
  const linkable = INTEGRITY_LINKABLE_ENTITY_TYPES.includes(finding.entityType)
  const critical = finding.severity === 'critical'

  return (
    <TableRow className={critical ? 'relative' : undefined}>
      <TableCell className="align-top">
        {/* R5a use #3 — a marker on the leading edge, not a badge and not a
            fill. At most one red carrier per row. */}
        {critical && <RowCriticalMarker />}
        <span className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-foreground">
            <bdi>{finding.entityLabel}</bdi>
          </span>
          <span className="text-xs text-muted-foreground">
            <bdi>{finding.entityId}</bdi>
            {' · '}
            {t('adminData.integrity.findings.field', { field: finding.field })}
          </span>
        </span>
      </TableCell>

      {/* Provenance. The reason this pane exists. */}
      <TableCell className="align-top">
        <span className="flex flex-col gap-1">
          <span className="text-xs text-foreground">{t(`integrity.check.${finding.checkId}.title`)}</span>
          <span>
            <StatusBadge tone={INTEGRITY_SEVERITY_TONE[finding.severity]}>
              {t(`adminData.integrity.severity.${finding.severity}`)}
            </StatusBadge>
          </span>
        </span>
      </TableCell>

      <TableCell className="align-top text-xs text-foreground">
        <span className="flex flex-col gap-0.5">
          {/* §8.3 — the sentence carries integer halalas as named params and
              `formatLocalisedText` is the only thing that turns one into money.
              No language option: AC-73 fixes money to one character order in
              both languages, so `formatMoney` deliberately does not take one. */}
          <span>{formatLocalisedText(finding.detail, t)}</span>
          {finding.counterpartId !== null && (
            <span className="text-muted-foreground">
              {t('adminData.integrity.findings.counterpart', { id: finding.counterpartId })}
            </span>
          )}
        </span>
      </TableCell>

      <TableCell className="align-top text-end">
        {linkable ? (
          <Link
            to={`${location.pathname}${withOverlay(location.search, 'entity', finding.entityId)}`}
            aria-label={t('adminData.integrity.findings.open.a11y', { record: finding.entityId })}
            /* §7.2 — the SAME ring declaration `ui/button.tsx:44` uses, so a
               link and a button focus identically. Scale utilities only: the
               3px arbitrary value that shipped here first is exactly the class
               of drift `/token-audit` exists to catch. */
            className="rounded-xs text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            {t('adminData.integrity.findings.open')}
          </Link>
        ) : (
          /* §8.3.1 — stated in words, never an em dash on a state that has a
             cause. The record is real; nothing in the product opens it yet. */
          <span className="text-xs text-muted-foreground">
            {t('adminData.integrity.findings.unopenable')}
          </span>
        )}
      </TableCell>
    </TableRow>
  )
}

/* ───────────────────────────── grouping ──────────────────────────────── */

function groupKey(group: IntegrityCheckGroup): string {
  return `adminData.integrity.group.${group}`
}

/**
 * Buckets the findings, in a **declared** order rather than insertion order —
 * `16b` §12 item 10 is legacy grouping by `Object.keys`, which is why a red row
 * could sit below thirty-nine amber ones there.
 *
 * Deliberately translation-free: it takes no `t`, so it can be memoised on the
 * data alone and the headings are resolved at render, where the language lives.
 */
function groupFindings(
  findings: readonly IntegrityFinding[],
  grouping: IntegrityGrouping,
  checks: readonly IntegrityCheck[],
): FindingGroup[] {
  const buckets = new Map<string, IntegrityFinding[]>()
  const order: string[] = grouping === 'check' ? checks.map((c) => c.id) : [...ENTITY_ORDER]

  for (const f of findings) {
    const key: string = grouping === 'check' ? f.checkId : f.entityType
    const bucket = buckets.get(key)
    if (bucket) bucket.push(f)
    else buckets.set(key, [f])
  }

  return order
    .filter((key) => buckets.has(key))
    .map((key) => ({ key, rows: buckets.get(key) ?? [] }))
}
