/**
 * **Management › Growth** — the board, and the four `?view=` index tables under
 * it (T7.1, owner decision O3, `design/management-growth-tables.md`).
 * The board is `MetricBoardScreen`'s, unchanged: this screen hands it a `below`
 * slot and owns only what hangs there. R4-6's shape, and the sibling
 * `ZonesScreen` took the same one for T7.3.
 */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  listGrowthBulkMessages,
  listGrowthIncentives,
  listGrowthPromos,
  listGrowthReferrals,
  setGrowthIncentiveActive,
  setGrowthPromoStatus,
} from '@/data/clients'
import type { Paginated, SubTabRoute } from '@/data/types'
/* The barrel is another owner's file this branch does not edit; `src/data/types/`
   is a sanctioned import root either way (`clients/index.ts` header). */
import type {
  GrowthBulkMessage,
  GrowthIncentive,
  GrowthPromo,
  GrowthReferral,
  MessageChannel,
  MessageSegment,
  PromoStatus,
  PromoTarget,
} from '@/data/types/growth'
import { useAsync, useIndexTable, useScreenViews, type ScreenViews } from '@/hooks'
import {
  formatCount,
  formatDate,
  formatMoney,
  formatPercent,
  formatRatio,
  type Language,
  type Translate,
} from '@/lib'
import { DataTable, type BulkAction, type DataColumn, type RowAction } from '@/components/DataTable'
import { ConfirmDialog, type ConfirmRequest } from '@/components/ConfirmDialog'
import { Money } from '@/components/Money'
import { StatusBadge } from '@/components/StatusBadge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useShell } from '@/shell/ShellContext'
import { withFallback } from '../../operations/localCopy'
import { MetricBoardScreen } from '../MetricBoardScreen'
import { GROWTH_EN } from './copy'
import { GrowthSheet } from './GrowthSheet'

/** The strip, `Board` first — the reference puts `All` first for the same reason. */
const GROWTH_VIEWS = [
  { id: 'board', titleKey: 'growth.view.board' },
  { id: 'promos', titleKey: 'growth.view.promos' },
  { id: 'referrals', titleKey: 'growth.view.referrals' },
  { id: 'incentives', titleKey: 'growth.view.incentives' },
  { id: 'messages', titleKey: 'growth.view.messages' },
] as const

/* R7 tone and copy key per campaign state, as one record over the union, so a
   fifth state is a compile error here and not an English value on an Arabic
   screen (X2). R5a: `exhausted` is neutral, never red. */
const PROMO_STATUS: Readonly<
  Record<PromoStatus, { tone: 'success' | 'warning' | 'neutral'; key: string }>
> = {
  active: { tone: 'success', key: 'growth.promo.status.active' },
  paused: { tone: 'warning', key: 'growth.promo.status.paused' },
  exhausted: { tone: 'neutral', key: 'growth.promo.status.exhausted' },
  expired: { tone: 'neutral', key: 'growth.promo.status.expired' },
}

const PROMO_STATUS_VALUES = Object.keys(PROMO_STATUS) as PromoStatus[]

const PROMO_TARGET: Readonly<Record<PromoTarget, string>> = {
  'new-riders': 'growth.promo.target.new-riders',
  'all-riders': 'growth.promo.target.all-riders',
  'lapsed-subscribers': 'growth.promo.target.lapsed-subscribers',
  'monthly-plan': 'growth.promo.target.monthly-plan',
  zone: 'growth.promo.target.zone',
}

const PROMO_TARGET_VALUES = Object.keys(PROMO_TARGET) as PromoTarget[]

const MESSAGE_SEGMENT: Readonly<Record<MessageSegment, string>> = {
  'drivers-in-zone': 'growth.message.segment.drivers-in-zone',
  'packages-expiring': 'growth.message.segment.packages-expiring',
  'exposed-subscriptions': 'growth.message.segment.exposed-subscriptions',
  'documents-expiring': 'growth.message.segment.documents-expiring',
  'active-subscribers': 'growth.message.segment.active-subscribers',
}

const MESSAGE_SEGMENT_VALUES = Object.keys(MESSAGE_SEGMENT) as MessageSegment[]

const MESSAGE_CHANNEL: Readonly<Record<MessageChannel, string>> = {
  push: 'growth.message.channel.push',
  sms: 'growth.message.channel.sms',
  'in-app': 'growth.message.channel.in-app',
}

const MESSAGE_CHANNEL_VALUES = Object.keys(MESSAGE_CHANNEL) as MessageChannel[]

/* The 80-99 band. Below it the number stands alone; at 100 the row's own badge
   already says `Budget spent`, so the second carrier is not repeated. */
const NEARLY_SPENT_PERCENT = 80

export function GrowthScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  /* AC-74 — the copy is this screen's own; `withFallback` resolves a key the
     shell dictionary has not registered. Memoised: an unmemoised wrapper is a
     new function every render and several reads carry `t` in `deps`. */
  const t = useMemo(() => withFallback(shell.language.t, GROWTH_EN), [shell.language.t])
  const { language } = shell.language
  const views = useScreenViews(GROWTH_VIEWS, 'board', t)
  const canWrite = shell.permissions.permissions.includes('manage_plans')

  return (
    <MetricBoardScreen
      row={row}
      below={
        <section className="flex flex-col gap-4 pt-8">
          {views.activeTab === 'board' ? (
            <GrowthViewStrip views={views} label={t('growth.view.label')} />
          ) : views.activeTab === 'promos' ? (
            <PromosView views={views} canWrite={canWrite} t={t} language={language} />
          ) : views.activeTab === 'referrals' ? (
            <ReferralsView views={views} t={t} language={language} />
          ) : views.activeTab === 'incentives' ? (
            <IncentivesView views={views} canWrite={canWrite} t={t} language={language} />
          ) : (
            <MessagesView views={views} t={t} language={language} />
          )}
        </section>
      }
    />
  )
}

/**
 * The strip standing alone, which is the board view's whole second half.
 * Same anatomy as the one `IndexToolbar` draws, so an operator switching from a
 * list back to the board does not watch the control change shape under them.
 */
function GrowthViewStrip({ views, label }: { views: ScreenViews; label: string }) {
  return (
    <Tabs value={views.activeTab} onValueChange={views.selectTab} className="gap-0">
      <TabsList
        variant="segmented"
        aria-label={label}
        className="max-w-full justify-start overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {views.tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className="rounded-full border-transparent px-3 text-sm data-active:border-border-control data-active:bg-card"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

/* ── promos ────────────────────────────────────────────────────────────── */

function PromosView({
  views,
  canWrite,
  t,
  language,
}: {
  views: ScreenViews
  canWrite: boolean
  t: Translate
  language: Language
}) {
  const table = useIndexTable<GrowthPromo>({
    mode: 'index',
    getRowId: (p) => p.code,
    initialSort: { field: 'createdAt', dir: 'desc' },
  })

  const data = useAsync<Paginated<GrowthPromo>>(
    (signal) => listGrowthPromos(table.params, signal),
    { deps: [table.params], cacheKey: 'growth.promos' },
  )

  const [open, setOpen] = useState<GrowthPromo | null>(null)
  const [request, setRequest] = useState<ConfirmRequest | null>(null)
  const [busy, setBusy] = useState(false)

  const rows = data.data?.items ?? []
  const { refetch } = data

  const runStatus = async (codes: readonly string[], status: 'active' | 'paused', message: string) => {
    setBusy(true)
    try {
      for (const code of codes) await setGrowthPromoStatus(code, status)
      toast.success(message)
      table.clearSelection()
      refetch()
    } finally {
      setBusy(false)
      setRequest(null)
    }
  }

  const pausable = (promo: GrowthPromo) => promo.status === 'active'

  const rowActions: ReadonlyArray<RowAction<GrowthPromo>> = [
    {
      label: t('growth.promo.action.pause'),
      /* R5a is not in play: pausing is reversible from the same lane. The gate
         is the modal below, which states what a paused code still honours. */
      onSelect: (promo) =>
        setRequest({
          title: t('growth.promo.confirm.title', { code: promo.code }),
          body: t('growth.promo.confirm.body'),
          confirmLabel: t('growth.promo.confirm.action'),
          onConfirm: () =>
            void runStatus([promo.code], 'paused', t('growth.promo.toast.paused', { code: promo.code })),
        }),
      disabled: (promo) => !canWrite || !pausable(promo),
      /* AC-962 — a permission refusal outranks a domain one, and only the
         permission one is stated: the row's own badge already says a campaign
         is expired, and repeating it in the lane cost 37px of row pitch. */
      reason: () => (canWrite ? null : t('growth.promo.refuse.role')),
    },
    {
      label: t('growth.promo.action.resume'),
      onSelect: (promo) =>
        void runStatus([promo.code], 'active', t('growth.promo.toast.resumed', { code: promo.code })),
      disabled: (promo) => !canWrite || promo.status !== 'paused',
      reason: () => (canWrite ? null : t('growth.promo.refuse.role')),
    },
  ]

  /**
   * D21 — the bulk command is refused when ANY selected campaign is refused,
   * the refusal names the count, and there is no partial apply. The way out is
   * the bar's own `Select only the N eligible`, fed by `eligibleIds`.
   */
  const selected = rows.filter((p) => table.selectedIds.has(p.code))
  const eligible = selected.filter(pausable)
  const bulkActions: readonly BulkAction[] = [
    {
      label: t('growth.promo.bulk.pause'),
      disabled: !canWrite || eligible.length !== selected.length,
      reason: !canWrite
        ? t('growth.promo.refuse.role')
        : t('growth.promo.bulk.refuse', {
            count: formatCount(selected.length - eligible.length, language),
            total: formatCount(selected.length, language),
          }),
      eligibleIds: new Set(eligible.map((p) => p.code)),
      onClick: (ids) =>
        setRequest({
          title: t('growth.promo.bulk.confirm.title', { count: formatCount(ids.size, language) }),
          body: t('growth.promo.confirm.body'),
          confirmLabel: t('growth.promo.confirm.action'),
          onConfirm: () =>
            void runStatus(
              [...ids],
              'paused',
              t('growth.promo.toast.bulkPaused', { count: formatCount(ids.size, language) }),
            ),
        }),
    },
  ]

  const columns: ReadonlyArray<DataColumn<GrowthPromo>> = useMemo(
    () => [
      {
        id: 'code',
        sortField: 'code',
        emphasis: 'primary',
        header: t('growth.promo.column.code'),
        minWidth: 128,
        dataType: 'text',
        cell: (p) => (
          <span className="flex min-w-0 flex-col text-start">
            {/* A Latin token in an Arabic paragraph reorders without isolation. */}
            <bdi dir="ltr" className="truncate font-mono">
              {p.code}
            </bdi>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {t(PROMO_TARGET[p.target])}
            </span>
          </span>
        ),
      },
      {
        id: 'discountPercent',
        sortField: 'discountPercent',
        emphasis: 'data',
        header: t('growth.promo.column.discount'),
        width: 100,
        align: 'end',
        dataType: 'number',
        cell: (p) => <span className="tabular-nums">{formatPercent(p.discountPercent, language)}</span>,
      },
      {
        id: 'burnPercent',
        sortField: 'burnPercent',
        emphasis: 'data',
        header: t('growth.promo.column.burn'),
        width: 108,
        align: 'end',
        dataType: 'number',
        csv: (p) => p.burnPercent,
        /* §7.5 — the number leads and the word is the second carrier. Legacy
           paints a bar and prints nothing (`:13517`), which is colour alone. */
        cell: (p) => (
          <span className="flex flex-col items-end">
            <span className="tabular-nums">{formatPercent(p.burnPercent, language)}</span>
            {p.burnPercent >= NEARLY_SPENT_PERCENT && p.status !== 'exhausted' && (
              <span className="truncate text-xs font-medium text-warning-foreground">
                {t('growth.promo.nearlySpent')}
              </span>
            )}
          </span>
        ),
      },
      {
        id: 'newSubscriptions',
        sortField: 'newSubscriptions',
        emphasis: 'data',
        header: t('growth.promo.column.newSubs'),
        width: 92,
        align: 'end',
        dataType: 'number',
        cell: (p) => <span className="tabular-nums">{formatCount(p.newSubscriptions, language)}</span>,
      },
      {
        id: 'roi',
        sortField: 'roi',
        emphasis: 'data',
        header: t('growth.promo.column.roi'),
        width: 80,
        align: 'end',
        dataType: 'number',
        csv: (p) => p.roi,
        cell: (p) => <span className="tabular-nums">{formatRatio(p.roi, language)}</span>,
      },
      {
        id: 'expiresOn',
        sortField: 'expiresOn',
        header: t('growth.promo.column.expires'),
        width: 112,
        dataType: 'date',
        cell: (p) => <span className="block truncate">{formatDate(p.expiresOn, { language })}</span>,
      },
      {
        id: 'status',
        sortField: 'status',
        emphasis: 'data',
        header: t('growth.promo.column.status'),
        width: 98,
        dataType: 'enum',
        filter: {
          kind: 'select',
          field: 'status',
          options: PROMO_STATUS_VALUES.map((value) => ({ value, label: t(PROMO_STATUS[value].key) })),
        },
        cell: (p) => (
          <StatusBadge tone={PROMO_STATUS[p.status].tone}>{t(PROMO_STATUS[p.status].key)}</StatusBadge>
        ),
      },
      {
        id: 'uses',
        sortField: 'uses',
        emphasis: 'data',
        header: t('growth.promo.column.uses'),
        width: 76,
        align: 'end',
        dataType: 'number',
        defaultHidden: true,
        cell: (p) => <span className="tabular-nums">{formatCount(p.uses, language)}</span>,
      },
      {
        id: 'target',
        sortField: 'target',
        header: t('growth.promo.column.target'),
        width: 148,
        dataType: 'enum',
        defaultHidden: true,
        filter: {
          kind: 'select',
          field: 'target',
          options: PROMO_TARGET_VALUES.map((value) => ({ value, label: t(PROMO_TARGET[value]) })),
        },
        cell: (p) => <span className="block truncate">{t(PROMO_TARGET[p.target])}</span>,
      },
    ],
    [language, t],
  )

  return (
    <>
      <DataTable
        table={table}
        rows={rows}
        columns={columns}
        getRowId={(p) => p.code}
        status={data.status}
        total={data.data?.total ?? 0}
        t={t}
        language={language}
        tableId="management-growth-promos"
        tabs={views.tabs}
        activeTab={views.activeTab}
        onSelectTab={views.selectTab}
        searchPlaceholder={t('growth.promo.search')}
        skeletonPattern="P1"
        rowActions={rowActions}
        rowActionsWidth={152}
        bulkActions={bulkActions}
        onRowClick={setOpen}
        firstRun={{
          heading: t('growth.promo.empty.heading'),
          body: t('growth.promo.empty.body'),
          actions: [],
        }}
        noMatch={{ message: t('growth.promo.noMatch') }}
        error={{ message: t('growth.promo.error'), onRetry: data.refetch }}
      />
      <GrowthSheet
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open === null ? '' : t('growth.promo.sheet.title', { code: open.code })}
        facts={
          open === null
            ? []
            : [
                { label: t('growth.promo.column.target'), value: t(PROMO_TARGET[open.target]) },
                {
                  label: t('growth.promo.sheet.perUser'),
                  value: t('growth.promo.sheet.perUser.value', {
                    count: formatCount(open.perUserLimit, language),
                  }),
                },
                { label: t('growth.promo.column.uses'), value: formatCount(open.uses, language) },
                { label: t('growth.promo.sheet.spent'), value: <Money amount={open.spentHalalas} /> },
                { label: t('growth.promo.sheet.budget'), value: <Money amount={open.budgetHalalas} /> },
                {
                  label: t('growth.promo.column.expires'),
                  value: formatDate(open.expiresOn, { language }),
                },
                {
                  label: t('growth.promo.sheet.created'),
                  value: formatDate(open.createdAt, { language }),
                },
              ]
        }
      />
      <ConfirmDialog request={request} onClose={() => setRequest(null)} busy={busy} t={t} />
    </>
  )
}

/* ── referrals ─────────────────────────────────────────────────────────── */

function ReferralsView({
  views,
  t,
  language,
}: {
  views: ScreenViews
  t: Translate
  language: Language
}) {
  const table = useIndexTable<GrowthReferral>({
    mode: 'index',
    getRowId: (r) => r.id,
    initialSort: { field: 'creditedAt', dir: 'desc' },
  })

  const data = useAsync<Paginated<GrowthReferral>>(
    (signal) => listGrowthReferrals(table.params, signal),
    { deps: [table.params], cacheKey: 'growth.referrals' },
  )

  const columns: ReadonlyArray<DataColumn<GrowthReferral>> = useMemo(
    () => [
      {
        id: 'referrer',
        sortField: 'referrerName',
        emphasis: 'primary',
        header: t('growth.referral.column.referrer'),
        minWidth: 160,
        dataType: 'text',
        csv: (r) => r.referrerName,
        cell: (r) => <RiderLink id={r.referrerId} name={r.referrerName} />,
      },
      {
        id: 'referee',
        sortField: 'refereeName',
        header: t('growth.referral.column.referee'),
        width: 140,
        dataType: 'text',
        csv: (r) => r.refereeName,
        cell: (r) => <RiderLink id={r.refereeId} name={r.refereeName} />,
      },
      {
        id: 'referrerBonusHalalas',
        sortField: 'referrerBonusHalalas',
        emphasis: 'data',
        header: t('growth.referral.column.referrerBonus'),
        width: 112,
        align: 'end',
        dataType: 'money',
        csv: (r) => r.referrerBonusHalalas,
        cell: (r) => (
          <span className="tabular-nums">
            <Money amount={r.referrerBonusHalalas} />
          </span>
        ),
      },
      {
        id: 'refereeBonusHalalas',
        sortField: 'refereeBonusHalalas',
        emphasis: 'data',
        header: t('growth.referral.column.refereeBonus'),
        width: 112,
        align: 'end',
        dataType: 'money',
        csv: (r) => r.refereeBonusHalalas,
        cell: (r) => (
          <span className="tabular-nums">
            <Money amount={r.refereeBonusHalalas} />
          </span>
        ),
      },
      {
        id: 'creditedAt',
        sortField: 'creditedAt',
        header: t('growth.referral.column.credited'),
        width: 128,
        dataType: 'date',
        cell: (r) => <span className="block truncate">{formatDate(r.creditedAt, { language })}</span>,
      },
      {
        id: 'sharedDeviceFlag',
        header: t('growth.referral.column.signal'),
        width: 108,
        dataType: 'enum',
        csv: (r) => String(r.sharedDeviceFlag),
        filter: {
          kind: 'select',
          field: 'sharedDeviceFlag',
          options: [
            { value: 'true', label: t('growth.referral.flag.shared') },
            { value: 'false', label: t('growth.referral.flag.clear') },
          ],
        },
        /* O9 — blank for not-applicable. An unflagged referral has no signal,
           and a muted word here would be a fact nobody acts on. */
        cell: (r) =>
          r.sharedDeviceFlag ? (
            <StatusBadge tone="warning">{t('growth.referral.flag.shared')}</StatusBadge>
          ) : null,
      },
    ],
    [language, t],
  )

  return (
    <DataTable
      table={table}
      rows={data.data?.items ?? []}
      columns={columns}
      getRowId={(r) => r.id}
      status={data.status}
      total={data.data?.total ?? 0}
      t={t}
      language={language}
      tableId="management-growth-referrals"
      tabs={views.tabs}
      activeTab={views.activeTab}
      onSelectTab={views.selectTab}
      searchPlaceholder={t('growth.referral.search')}
      skeletonPattern="P1"
      firstRun={{
        heading: t('growth.referral.empty.heading'),
        body: t('growth.referral.empty.body'),
        actions: [],
      }}
      noMatch={{ message: t('growth.referral.noMatch') }}
      error={{ message: t('growth.referral.error'), onRetry: data.refetch }}
    />
  )
}

/* AC-G19 — the identity is a link: middle-clickable, its address copyable, and
   it keeps the product's own `:focus-visible` ring. */
function RiderLink({ id, name }: { id: string; name: string }) {
  return (
    <Link to={`/operations/people/riders/${id}`} className="group flex min-w-0 rounded-sm text-start">
      <bdi className="truncate group-hover:underline">{name}</bdi>
    </Link>
  )
}

/* ── incentives ────────────────────────────────────────────────────────── */

function IncentivesView({
  views,
  canWrite,
  t,
  language,
}: {
  views: ScreenViews
  canWrite: boolean
  t: Translate
  language: Language
}) {
  const table = useIndexTable<GrowthIncentive>({
    mode: 'index',
    getRowId: (i) => i.id,
    initialSort: { field: 'createdAt', dir: 'desc' },
  })

  const data = useAsync<Paginated<GrowthIncentive>>(
    (signal) => listGrowthIncentives(table.params, signal),
    { deps: [table.params], cacheKey: 'growth.incentives' },
  )

  const [open, setOpen] = useState<GrowthIncentive | null>(null)
  const [request, setRequest] = useState<ConfirmRequest | null>(null)
  const [busy, setBusy] = useState(false)
  const { refetch } = data

  const setActive = async (incentive: GrowthIncentive, active: boolean) => {
    setBusy(true)
    try {
      await setGrowthIncentiveActive(incentive.id, active)
      toast.success(
        t(active ? 'growth.incentive.toast.activated' : 'growth.incentive.toast.deactivated', {
          name: incentive.name,
        }),
      )
      refetch()
    } finally {
      setBusy(false)
      setRequest(null)
    }
  }

  const reward = (incentive: GrowthIncentive): string => {
    const { kind, amountHalalas, fromPercent, toPercent } = incentive.reward
    if (kind === 'commission-cut') {
      return t('growth.incentive.reward.commission-cut', {
        from: formatPercent(fromPercent ?? 0, language),
        to: formatPercent(toPercent ?? 0, language),
      })
    }
    return t(`growth.incentive.reward.${kind}`, {
      amount: formatMoney(amountHalalas ?? 0),
    })
  }

  const rowActions: ReadonlyArray<RowAction<GrowthIncentive>> = [
    {
      label: t('growth.incentive.action.deactivate'),
      onSelect: (incentive) =>
        setRequest({
          title: t('growth.incentive.confirm.title', { name: incentive.name }),
          body: t('growth.incentive.confirm.body'),
          confirmLabel: t('growth.incentive.confirm.action'),
          onConfirm: () => void setActive(incentive, false),
        }),
      disabled: (incentive) => !canWrite || !incentive.active,
      reason: () => (canWrite ? null : t('growth.incentive.refuse.role')),
    },
    {
      label: t('growth.incentive.action.activate'),
      onSelect: (incentive) => void setActive(incentive, true),
      disabled: (incentive) => !canWrite || incentive.active,
      reason: () => (canWrite ? null : t('growth.incentive.refuse.role')),
    },
  ]

  const columns: ReadonlyArray<DataColumn<GrowthIncentive>> = useMemo(
    () => [
      {
        id: 'name',
        sortField: 'name',
        emphasis: 'primary',
        header: t('growth.incentive.column.name'),
        minWidth: 200,
        dataType: 'text',
        /* The condition rides under the name, the way a promo's target does:
           measured at 1280, a `Condition` column of its own truncated every
           row's rule to four words and left the reward with 128px. */
        cell: (i) => (
          <span className="flex min-w-0 flex-col text-start">
            <bdi className="truncate">{i.name}</bdi>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {t(`growth.incentive.condition.${i.condition}`)}
            </span>
          </span>
        ),
      },
      {
        id: 'reward',
        header: t('growth.incentive.column.reward'),
        width: 176,
        dataType: 'text',
        csv: (i) => i.reward.kind,
        cell: (i) => <span className="block truncate">{reward(i)}</span>,
      },
      {
        id: 'earnedCount',
        sortField: 'earnedCount',
        emphasis: 'data',
        header: t('growth.incentive.column.earned'),
        width: 88,
        align: 'end',
        dataType: 'number',
        cell: (i) => <span className="tabular-nums">{formatCount(i.earnedCount, language)}</span>,
      },
      {
        id: 'totalPaidHalalas',
        sortField: 'totalPaidHalalas',
        emphasis: 'data',
        header: t('growth.incentive.column.paid'),
        width: 112,
        align: 'end',
        dataType: 'money',
        csv: (i) => i.totalPaidHalalas,
        cell: (i) => (
          <span className="tabular-nums">
            <Money amount={i.totalPaidHalalas} />
          </span>
        ),
      },
      {
        id: 'condition',
        sortField: 'condition',
        header: t('growth.incentive.column.condition'),
        width: 176,
        dataType: 'enum',
        defaultHidden: true,
        csv: (i) => i.condition,
        cell: (i) => (
          <span className="block truncate">{t(`growth.incentive.condition.${i.condition}`)}</span>
        ),
      },
      {
        id: 'active',
        sortField: 'active',
        emphasis: 'data',
        header: t('growth.incentive.column.status'),
        width: 88,
        dataType: 'enum',
        csv: (i) => String(i.active),
        filter: {
          kind: 'select',
          field: 'active',
          options: [
            { value: 'true', label: t('growth.incentive.status.active') },
            { value: 'false', label: t('growth.incentive.status.paused') },
          ],
        },
        cell: (i) => (
          <StatusBadge tone={i.active ? 'success' : 'warning'}>
            {t(i.active ? 'growth.incentive.status.active' : 'growth.incentive.status.paused')}
          </StatusBadge>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language, t],
  )

  return (
    <>
      <DataTable
        table={table}
        rows={data.data?.items ?? []}
        columns={columns}
        getRowId={(i) => i.id}
        status={data.status}
        total={data.data?.total ?? 0}
        t={t}
        language={language}
        tableId="management-growth-incentives"
        tabs={views.tabs}
        activeTab={views.activeTab}
        onSelectTab={views.selectTab}
        searchPlaceholder={t('growth.incentive.search')}
        skeletonPattern="P1"
        rowActions={rowActions}
        rowActionsWidth={152}
        onRowClick={setOpen}
        firstRun={{
          heading: t('growth.incentive.empty.heading'),
          body: t('growth.incentive.empty.body'),
          actions: [],
        }}
        noMatch={{ message: t('growth.incentive.noMatch') }}
        error={{ message: t('growth.incentive.error'), onRetry: data.refetch }}
      />
      <GrowthSheet
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open === null ? '' : t('growth.incentive.sheet.title', { name: open.name })}
        facts={
          open === null
            ? []
            : [
                {
                  label: t('growth.incentive.column.condition'),
                  value: t(`growth.incentive.condition.${open.condition}`),
                },
                { label: t('growth.incentive.column.reward'), value: reward(open) },
                {
                  label: t('growth.incentive.column.earned'),
                  value: t('growth.incentive.earned.value', {
                    count: formatCount(open.earnedCount, language),
                  }),
                },
                {
                  label: t('growth.incentive.column.paid'),
                  value: <Money amount={open.totalPaidHalalas} />,
                },
                {
                  label: t('growth.incentive.sheet.created'),
                  value: formatDate(open.createdAt, { language }),
                },
              ]
        }
      />
      <ConfirmDialog request={request} onClose={() => setRequest(null)} busy={busy} t={t} />
    </>
  )
}

/* ── bulk messages ─────────────────────────────────────────────────────── */

function MessagesView({
  views,
  t,
  language,
}: {
  views: ScreenViews
  t: Translate
  language: Language
}) {
  const table = useIndexTable<GrowthBulkMessage>({
    mode: 'index',
    getRowId: (m) => m.id,
    initialSort: { field: 'sentAt', dir: 'desc' },
  })

  const data = useAsync<Paginated<GrowthBulkMessage>>(
    (signal) => listGrowthBulkMessages(table.params, signal),
    { deps: [table.params], cacheKey: 'growth.messages' },
  )

  const [open, setOpen] = useState<GrowthBulkMessage | null>(null)

  const columns: ReadonlyArray<DataColumn<GrowthBulkMessage>> = useMemo(
    () => [
      {
        id: 'body',
        sortField: 'body',
        emphasis: 'primary',
        header: t('growth.message.column.body'),
        minWidth: 240,
        dataType: 'text',
        cell: (m) => <bdi className="block truncate">{m.body}</bdi>,
      },
      {
        id: 'segment',
        sortField: 'segment',
        header: t('growth.message.column.segment'),
        width: 168,
        dataType: 'enum',
        csv: (m) => m.segment,
        filter: {
          kind: 'select',
          field: 'segment',
          options: MESSAGE_SEGMENT_VALUES.map((value) => ({
            value,
            label: t(MESSAGE_SEGMENT[value]),
          })),
        },
        cell: (m) => <span className="block truncate">{t(MESSAGE_SEGMENT[m.segment])}</span>,
      },
      {
        id: 'channel',
        sortField: 'channel',
        header: t('growth.message.column.channel'),
        width: 96,
        dataType: 'enum',
        csv: (m) => m.channel,
        filter: {
          kind: 'select',
          field: 'channel',
          options: MESSAGE_CHANNEL_VALUES.map((value) => ({
            value,
            label: t(MESSAGE_CHANNEL[value]),
          })),
        },
        cell: (m) => <span className="block truncate">{t(MESSAGE_CHANNEL[m.channel])}</span>,
      },
      {
        id: 'recipientCount',
        sortField: 'recipientCount',
        emphasis: 'data',
        header: t('growth.message.column.recipients'),
        width: 100,
        align: 'end',
        dataType: 'number',
        cell: (m) => <span className="tabular-nums">{formatCount(m.recipientCount, language)}</span>,
      },
      {
        id: 'sentAt',
        sortField: 'sentAt',
        header: t('growth.message.column.sentAt'),
        width: 128,
        dataType: 'date',
        cell: (m) => <span className="block truncate">{formatDate(m.sentAt, { language })}</span>,
      },
      {
        id: 'sentByName',
        sortField: 'sentByName',
        header: t('growth.message.column.sentBy'),
        width: 128,
        dataType: 'text',
        cell: (m) => <bdi className="block truncate">{m.sentByName}</bdi>,
      },
    ],
    [language, t],
  )

  return (
    <>
      <DataTable
        table={table}
        rows={data.data?.items ?? []}
        columns={columns}
        getRowId={(m) => m.id}
        status={data.status}
        total={data.data?.total ?? 0}
        t={t}
        language={language}
        tableId="management-growth-messages"
        tabs={views.tabs}
        activeTab={views.activeTab}
        onSelectTab={views.selectTab}
        searchPlaceholder={t('growth.message.search')}
        skeletonPattern="P1"
        onRowClick={setOpen}
        firstRun={{
          heading: t('growth.message.empty.heading'),
          body: t('growth.message.empty.body'),
          actions: [],
        }}
        noMatch={{ message: t('growth.message.noMatch') }}
        error={{ message: t('growth.message.error'), onRetry: data.refetch }}
      />
      <GrowthSheet
        open={open !== null}
        onClose={() => setOpen(null)}
        title={
          open === null
            ? ''
            : t('growth.message.sheet.title', { segment: t(MESSAGE_SEGMENT[open.segment]) })
        }
        prose={open === null ? null : { label: t('growth.message.sheet.body'), value: open.body }}
        facts={
          open === null
            ? []
            : [
                { label: t('growth.message.column.channel'), value: t(MESSAGE_CHANNEL[open.channel]) },
                {
                  label: t('growth.message.sheet.recipients'),
                  value: t('growth.message.sheet.recipients.value', {
                    count: formatCount(open.recipientCount, language),
                  }),
                },
                {
                  label: t('growth.message.column.sentAt'),
                  value: formatDate(open.sentAt, { language }),
                },
                { label: t('growth.message.column.sentBy'), value: open.sentByName },
              ]
        }
      />
    </>
  )
}
