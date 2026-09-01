/**
 * The reason-code registry — the closed vocabulary operators pick from when
 * they dispose of work.
 *
 * ## Retirement, which is the whole point of the pane
 *
 * A code is **never deleted and never renamed**. Every historical record —
 * a closed dispute, a refund, an audit line — points at the key as a string, so
 * a key that stops resolving turns a two-year-old decision into a raw
 * `TRP_GHOST_COMPLETE` on screen. Legacy states the rule in its own UI copy
 * (`:1793`) and then gives the operator nowhere to record the successor, so the
 * advice survived only as folklore.
 *
 * Here retirement does exactly one thing: **it removes the code from the
 * picker.** `listReasonCodeOptions(surface)` stops offering it;
 * `resolveReasonCode(key)` keeps answering, with both labels, forever. The
 * registry table below still shows it — sunk to the bottom, badged `Retired`,
 * with the date and the successor — because an operator looking for *the one we
 * stopped using* should find it where they left it.
 *
 * ## Four states, and two of them are empty
 *
 * `DataTable` owns all four. The two empties are genuinely different and the
 * copy says so: **no code matches these filters** is a filter problem the
 * operator can undo, and **no reason code is defined** is a first-run that
 * needs the first code written. `table.isFiltered` decides which, mechanically.
 *
 * Rules applied
 *   D8        three declared row actions, so the actions lane is a kebab. The
 *             count is of DECLARED actions — `Retire` and `Put back in use` are
 *             both declared on every row and one of them is always disabled
 *             with its reason (§11.2), so the lane never changes shape down the
 *             length of the table.
 *   §11.2     `Retire` on an already-retired code is disabled **in place, with
 *             the reason**, not hidden.
 *   R7        `In use` is `success`, `Retired` is `neutral`. A retired code is
 *             not a warning and it is certainly not red — nothing is wrong.
 *   §9.1      the Arabic label renders in an isolated RTL run so a mixed-script
 *             cell cannot reorder its neighbours.
 */

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import {
  createReasonCode,
  listReasonCodes,
  restoreReasonCode,
  retireReasonCode,
  saveReasonCode,
} from '@/data/clients'
import type { FilterSpec, Paginated } from '@/data/types/common'
import {
  REASON_SURFACES,
  SLA_TIER_KEYS,
  type CreateReasonCodeInput,
  type ReasonCode,
  type ReasonCodeState,
  type ReasonSurface,
  type SaveReasonCodeInput,
  type SlaTierKey,
} from '@/data/types/policy'
import { useAsync, useIndexTable } from '@/hooks'
import { formatCount, formatDate, type Language, type Translate } from '@/lib'
import { isApiError } from '@/data/types'
import { DataTable, type DataColumn, type RowAction } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Props {
  canWrite: boolean
  blockedReason: string | null
  t: Translate
  language: Language
}

type Editing = { mode: 'create' } | { mode: 'edit'; code: ReasonCode } | null

export function ReasonCodesCard({ canWrite, blockedReason, t, language }: Props) {
  const table = useIndexTable<ReasonCode>({
    mode: 'queue',
    getRowId: (code) => code.key,
    /* Its own namespace in the URL: this table shares a route with four other
       panes, and an unnamespaced `?q=` would be read by whichever of them looked
       first. */
    urlKey: 'codes',
    pageSize: 50,
  })

  const [editing, setEditing] = useState<Editing>(null)
  const [retiring, setRetiring] = useState<ReasonCode | null>(null)

  /**
   * `DataTable`'s filter chips arrive as `FilterSpec[]`; `listReasonCodes` takes
   * two named parameters. The mapping is here, once, and it is **narrowing
   * only** — an unrecognised field is dropped rather than passed through, so a
   * filter the client cannot honour can never look like it was applied.
   */
  const query = useMemo(() => {
    const pick = (field: string): string | undefined => {
      const spec = table.params.filters?.find((each: FilterSpec) => each.field === field)
      return typeof spec?.value === 'string' ? spec.value : undefined
    }
    return {
      q: table.params.q,
      page: table.params.page,
      pageSize: table.params.pageSize,
      surface: pick('surface') as ReasonSurface | undefined,
      state: pick('state') as ReasonCodeState | undefined,
    }
  }, [table.params])

  const codes = useAsync<Paginated<ReasonCode>>((signal) => listReasonCodes({ ...query, signal }), {
    deps: [query],
  })

  const rows = codes.data?.items ?? []
  const active = rows.filter((code) => code.state === 'active').length

  const refresh = codes.refetch

  const surfaceLabel = useCallback(
    (surface: ReasonSurface) => t(`policy.reasons.surface.${surface}`),
    [t],
  )

  const columns = useMemo<DataColumn<ReasonCode>[]>(
    () => [
      {
        id: 'code',
        header: t('policy.reasons.col.code'),
        minWidth: 240,
        alwaysVisible: true,
        sortField: 'key',
        cell: (code) => (
          <span className="font-medium text-foreground">
            {code.reference ? `§${code.reference} · ` : ''}
            {code.labels.en}
          </span>
        ),
        secondaryLine: (code) => <span className="font-mono">{code.key}</span>,
      },
      {
        id: 'labelAr',
        header: t('policy.reasons.col.labelAr'),
        width: 180,
        cell: (code) => (
          /* Isolated, so an Arabic label beside a Latin key cannot reorder the
             cell's neighbours (§9.1). */
          <span className="font-arabic" dir="rtl" lang="ar">
            {code.labels.ar}
          </span>
        ),
      },
      {
        id: 'surfaces',
        header: t('policy.reasons.col.surfaces'),
        width: 220,
        cell: (code) => (
          <span className="text-muted-foreground">
            {code.surfaces.length > 2
              ? t('policy.reasons.surfaceCount', {
                  count: formatCount(code.surfaces.length, language),
                })
              : code.surfaces.map(surfaceLabel).join(' · ')}
          </span>
        ),
      },
      {
        id: 'tier',
        header: t('policy.reasons.col.tier'),
        width: 80,
        align: 'start',
        cell: (code) => <span className="tabular-nums">{code.tier}</span>,
      },
      {
        id: 'note',
        header: t('policy.reasons.col.note'),
        width: 110,
        cell: (code) => (
          <span className="text-muted-foreground">
            {code.requiresNote ? t('policy.reasons.note.required') : t('policy.reasons.note.optional')}
          </span>
        ),
      },
      {
        id: 'owner',
        header: t('policy.reasons.col.owner'),
        width: 150,
        cell: (code) => (
          <span className={code.ownerTeam ? 'text-foreground' : 'text-muted-foreground'}>
            {code.ownerTeam ?? t('policy.reasons.owner.unassigned')}
          </span>
        ),
      },
      {
        id: 'state',
        header: t('policy.reasons.col.state'),
        width: 190,
        cell: (code) =>
          code.state === 'active' ? (
            <StatusBadge tone="success">{t('policy.reasons.state.active')}</StatusBadge>
          ) : (
            <div className="flex flex-col items-start gap-1">
              <StatusBadge tone="neutral">{t('policy.reasons.state.retired')}</StatusBadge>
              {code.retiredAt ? (
                <span className="text-2xs text-muted-foreground">
                  {t('policy.reasons.retiredOn', {
                    date: formatDate(code.retiredAt, { style: 'day-month-year', language }),
                  })}
                </span>
              ) : null}
              {code.supersededByKey ? (
                <span className="text-2xs text-muted-foreground">
                  {t('policy.reasons.supersededBy', { code: code.supersededByKey })}
                </span>
              ) : null}
            </div>
          ),
      },
    ],
    [t, language, surfaceLabel],
  )

  /**
   * Three declared actions on every row, always. Two of them are mutually
   * exclusive and the inapplicable one renders disabled with its reason —
   * §11.2 — rather than disappearing, so the kebab holds the same three items
   * on every row of the table.
   */
  const rowActions = useMemo<RowAction<ReasonCode>[]>(
    () => [
      {
        label: t('policy.reasons.action.edit'),
        onSelect: (code) => setEditing({ mode: 'edit', code }),
        disabled: () => !canWrite,
        reason: () => blockedReason,
      },
      {
        label: t('policy.reasons.action.retire'),
        onSelect: (code) => setRetiring(code),
        disabled: (code) => !canWrite || code.state === 'retired',
        reason: () => (canWrite ? t('policy.reasons.retire.blocked.alreadyRetired') : blockedReason),
      },
      {
        label: t('policy.reasons.action.restore'),
        onSelect: (code) => {
          void restoreReasonCode(code.key)
            .then(() => {
              toast.success(t('policy.reasons.toast.restored', { code: code.key }))
              refresh()
            })
            .catch(() => toast.error(t('policy.save.failed')))
        },
        disabled: (code) => !canWrite || code.state === 'active',
        reason: () => (canWrite ? t('policy.reasons.restore.blocked.inUse') : blockedReason),
      },
    ],
    [t, canWrite, blockedReason, refresh],
  )

  return (
    <section aria-label={t('policy.reasons.title')} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t('policy.reasons.title')}</h2>
          <p className="max-w-2xl text-xs text-muted-foreground">{t('policy.reasons.desc')}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge tone="neutral">
            {t('policy.reasons.count', {
              active: formatCount(active, language),
              retired: formatCount(rows.length - active, language),
            })}
          </StatusBadge>
          <Button
            size="xs"
            variant="secondary"
            disabled={!canWrite}
            onClick={() => setEditing({ mode: 'create' })}
          >
            {t('policy.reasons.action.add')}
          </Button>
        </div>
      </div>

      <DataTable<ReasonCode>
        table={table}
        rows={rows}
        columns={columns}
        getRowId={(code) => code.key}
        status={codes.status}
        total={codes.data?.total ?? 0}
        t={t}
        language={language}
        tableId="admin-policy-reason-codes"
        searchPlaceholder={t('policy.reasons.search')}
        rowActions={rowActions}
        extraFilters={[
          {
            field: 'surface',
            label: t('policy.reasons.filter.surface'),
            kind: 'select',
            options: REASON_SURFACES.map((surface) => ({
              value: surface,
              label: surfaceLabel(surface),
            })),
          },
          {
            field: 'state',
            label: t('policy.reasons.filter.state'),
            kind: 'select',
            options: [
              { value: 'active', label: t('policy.reasons.state.active') },
              { value: 'retired', label: t('policy.reasons.state.retired') },
            ],
          },
        ]}
        firstRun={{
          heading: t('policy.reasons.empty.heading'),
          body: t('policy.reasons.empty.body'),
          actions: canWrite
            ? [{ label: t('policy.reasons.empty.action'), onClick: () => setEditing({ mode: 'create' }) }]
            : [],
        }}
        noMatch={{
          message: t('policy.reasons.noMatch'),
          action: { label: t('policy.reasons.noMatch.action'), onClick: () => table.clearAll() },
        }}
        error={{ message: t('policy.reasons.error'), onRetry: refresh }}
      />

      {editing ? (
        <ReasonCodeDialog
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
          t={t}
          surfaceLabel={surfaceLabel}
        />
      ) : null}

      {retiring ? (
        <RetireDialog
          code={retiring}
          candidates={rows.filter((each) => each.state === 'active' && each.key !== retiring.key)}
          onClose={() => setRetiring(null)}
          onRetired={refresh}
          t={t}
        />
      ) : null}
    </section>
  )
}

/* ───────────────────── the code editor ───────────────────── */

interface DraftCode extends SaveReasonCodeInput {
  key: string
}

function ReasonCodeDialog({
  editing,
  onClose,
  onSaved,
  t,
  surfaceLabel,
}: {
  editing: NonNullable<Editing>
  onClose: () => void
  onSaved: () => void
  t: Translate
  surfaceLabel: (surface: ReasonSurface) => string
}) {
  const isCreate = editing.mode === 'create'
  const [draft, setDraft] = useState<DraftCode>(() =>
    editing.mode === 'edit'
      ? {
          key: editing.code.key,
          labels: { ...editing.code.labels },
          surfaces: [...editing.code.surfaces],
          requiresNote: editing.code.requiresNote,
          tier: editing.code.tier,
          ownerTeam: editing.code.ownerTeam,
          reference: editing.code.reference,
        }
      : {
          key: '',
          labels: { en: '', ar: '' },
          surfaces: [],
          requiresNote: false,
          tier: 'T3',
          ownerTeam: null,
          reference: null,
        },
  )
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  /* Both labels and at least one surface. The seam refuses the same three
     things with a 422; this is the same rule stated before the request so the
     control can be disabled in place rather than refusing after the click. */
  const canSubmit =
    draft.labels.en.trim().length > 0 &&
    draft.labels.ar.trim().length > 0 &&
    draft.surfaces.length > 0 &&
    (!isCreate || draft.key.trim().length >= 3)

  const submit = () => {
    setSaving(true)
    setFailure(null)
    const body: SaveReasonCodeInput = {
      labels: draft.labels,
      surfaces: draft.surfaces,
      requiresNote: draft.requiresNote,
      tier: draft.tier,
      ownerTeam: draft.ownerTeam,
      reference: draft.reference,
    }
    const run = isCreate
      ? createReasonCode({ ...body, key: draft.key } satisfies CreateReasonCodeInput)
      : saveReasonCode(draft.key, body)

    void run
      .then((saved: ReasonCode) => {
        toast.success(
          t(isCreate ? 'policy.reasons.toast.created' : 'policy.reasons.toast.saved', {
            code: saved.key,
          }),
        )
        onSaved()
        onClose()
      })
      .catch((error: unknown) => {
        setFailure(isApiError(error) ? error.message : t('policy.save.failed'))
      })
      .finally(() => setSaving(false))
  }

  return (
    <Dialog open onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isCreate ? t('policy.reasons.new.title') : t('policy.reasons.edit.title', { code: draft.key })}
          </DialogTitle>
          <DialogDescription>
            {isCreate ? t('policy.reasons.new.desc') : t('policy.reasons.edit.desc')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2 text-xs">
          {isCreate ? (
            <Field id="rc-key" label={t('policy.reasons.field.key')} help={t('policy.reasons.field.key.help')}>
              <Input
                id="rc-key"
                value={draft.key}
                className="font-mono"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, key: event.target.value.toUpperCase() }))
                }
              />
            </Field>
          ) : null}

          <Field id="rc-label-en" label={t('policy.reasons.field.labelEn')}>
            <Input
              id="rc-label-en"
              value={draft.labels.en}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  labels: { ...current.labels, en: event.target.value },
                }))
              }
            />
          </Field>

          <Field id="rc-label-ar" label={t('policy.reasons.field.labelAr')}>
            <Input
              id="rc-label-ar"
              value={draft.labels.ar}
              dir="rtl"
              lang="ar"
              className="font-arabic"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  labels: { ...current.labels, ar: event.target.value },
                }))
              }
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field id="rc-tier" label={t('policy.reasons.field.tier')}>
              <Select
                value={draft.tier}
                onValueChange={(value) =>
                  setDraft((current) => ({ ...current, tier: value as SlaTierKey }))
                }
              >
                <SelectTrigger id="rc-tier" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SLA_TIER_KEYS.map((tier) => (
                    <SelectItem key={tier} value={tier}>
                      {tier} · {t(`policy.sla.tier.${tier}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field id="rc-owner" label={t('policy.reasons.field.owner')}>
              <Input
                id="rc-owner"
                value={draft.ownerTeam ?? ''}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    ownerTeam: event.target.value.trim() === '' ? null : event.target.value,
                  }))
                }
              />
            </Field>

            <Field
              id="rc-reference"
              label={t('policy.reasons.field.reference')}
              help={t('policy.reasons.field.reference.help')}
            >
              <Input
                id="rc-reference"
                value={draft.reference ?? ''}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    reference: event.target.value.trim() === '' ? null : event.target.value,
                  }))
                }
              />
            </Field>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-xs font-medium text-foreground">
              {t('policy.reasons.field.surfaces')}
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {REASON_SURFACES.map((surface) => (
                <label key={surface} className="flex items-center gap-2 text-xs text-foreground">
                  <Checkbox
                    checked={draft.surfaces.includes(surface)}
                    onCheckedChange={(checked) =>
                      setDraft((current) => ({
                        ...current,
                        surfaces: checked
                          ? [...current.surfaces, surface]
                          : current.surfaces.filter((each) => each !== surface),
                      }))
                    }
                  />
                  {surfaceLabel(surface)}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex items-start gap-2 text-xs text-foreground">
            <Switch
              checked={draft.requiresNote}
              onCheckedChange={(checked) =>
                setDraft((current) => ({ ...current, requiresNote: checked }))
              }
            />
            <span>
              {t('policy.reasons.field.requiresNote')}
              <span className="block text-2xs text-muted-foreground">
                {t('policy.reasons.field.requiresNote.help')}
              </span>
            </span>
          </label>

          {failure ? (
            <p role="alert" className="text-2xs text-destructive">
              {failure}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {t('policy.action.cancel')}
          </Button>
          <Button variant="default" disabled={!canSubmit || saving} onClick={submit}>
            {isCreate ? t('policy.reasons.create') : t('policy.reasons.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ───────────────────── retirement ───────────────────── */

/**
 * The confirmation says what retirement **does not** do, because that is the
 * part an operator worries about: the code leaves the picker and every record
 * already coded with it keeps rendering its label, unchanged, in both
 * languages.
 */
function RetireDialog({
  code,
  candidates,
  onClose,
  onRetired,
  t,
}: {
  code: ReasonCode
  candidates: readonly ReasonCode[]
  onClose: () => void
  onRetired: () => void
  t: Translate
}) {
  const [successor, setSuccessor] = useState('none')
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  return (
    <Dialog open onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('policy.reasons.retire.title', { code: code.key })}</DialogTitle>
          <DialogDescription>{t('policy.reasons.retire.body')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5 py-2">
          <Label htmlFor="rc-successor" className="text-xs font-medium">
            {t('policy.reasons.retire.successor')}
          </Label>
          <Select value={successor} onValueChange={setSuccessor}>
            <SelectTrigger id="rc-successor" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('policy.reasons.retire.successor.none')}</SelectItem>
              {candidates.map((candidate) => (
                <SelectItem key={candidate.key} value={candidate.key}>
                  {candidate.labels.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {failure ? (
            <p role="alert" className="text-2xs text-destructive">
              {failure}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {t('policy.action.cancel')}
          </Button>
          <Button
            variant="default"
            disabled={saving}
            onClick={() => {
              setSaving(true)
              setFailure(null)
              void retireReasonCode(code.key, {
                supersededByKey: successor === 'none' ? null : successor,
              })
                .then(() => {
                  toast.success(t('policy.reasons.toast.retired', { code: code.key }))
                  onRetired()
                  onClose()
                })
                .catch((error: unknown) =>
                  setFailure(isApiError(error) ? error.message : t('policy.save.failed')),
                )
                .finally(() => setSaving(false))
            }}
          >
            {t('policy.reasons.retire.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  id,
  label,
  help,
  children,
}: {
  id: string
  label: string
  help?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
      </Label>
      {children}
      {help ? (
        <p className="text-2xs text-muted-foreground">{help}</p>
      ) : null}
    </div>
  )
}
