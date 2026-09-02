/**
 * The SLA editor — tier defaults, then the queue × tier grid.
 *
 * ## The one rule the markup enforces
 *
 * **An inherited target is not an input.** It renders as the number it inherits
 * plus the tier it inherits from, beside an `Override` button. An overridden
 * target renders as a number field plus `Revert to inherited`.
 *
 * That is the whole F-014 fix, expressed in JSX rather than in a convention:
 * legacy pre-filled every target field with the *effective* value and read them
 * all back on save (`:15083` → `:15104`), so a save with no edit flattened
 * inheritance for all 40 codes. Here there is no field holding an inherited
 * number for a save to read, so nothing can be read back that nobody typed.
 *
 * The two states are also **visibly** different — a badge, a different control,
 * and different copy — because the operator has to be able to see which of the
 * two a cell is in before deciding whether changing a tier default will reach
 * it. §11.2's principle, applied to a value rather than to a control.
 *
 * Rules applied
 *   R3        no primary button anywhere here. The screen's one primary is the
 *             save bar's `Save`, and `Override` / `Revert` edit the draft.
 *   §11.2     `Revert to inherited` is rendered disabled with a stated reason
 *             when the cell is already inherited — never hidden, so the control
 *             does not appear and disappear as an operator edits.
 *   §7.2      every control is a real `<button>` / `<input>` with a visible
 *             focus ring; nothing here is a `<div onClick>`.
 *   §9.1      minutes are numeric and sit inline-END with their header.
 *   R7        `Inherited` and `Overridden` are `neutral` and `info` — the two
 *             tones that carry "this is how it is" and "somebody changed this".
 *             Neither is red; nothing here is a breach.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { StatusBadge } from '@/components/StatusBadge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCount, type Language, type Translate } from '@/lib'
import { SLA_TIER_KEYS, type SlaTierKey, type WorkQueueId } from '@/data/types/policy'
import {
  SLA_TARGET_FIELDS,
  overrideSlaTarget,
  overrideTally,
  parseWholeNumber,
  revertSlaTarget,
  setBreachPolicy,
  setSlaTarget,
  setSlaThreshold,
  setTierDefault,
  slaCellView,
  type PolicyDraft,
  type SlaTargetField,
} from './policyDraft'

interface SlaProps {
  draft: PolicyDraft
  onChange: (next: PolicyDraft) => void
  canWrite: boolean
  blockedReason: string | null
  t: Translate
  language: Language
}

/** `firstResponseMinutes` → the copy key its a11y sentences interpolate. */
const FIELD_LABEL_KEY: Record<SlaTargetField, string> = {
  firstResponseMinutes: 'policy.sla.field.firstResponse',
  resolutionMinutes: 'policy.sla.field.resolution',
}

/* ═══════════════════ the four tier defaults ═══════════════════ */

export function SlaTierDefaultsCard({ draft, onChange, canWrite, blockedReason, t }: SlaProps) {
  return (
    <Card>
      <CardHeader className="border-b border-border pb-3">
        <CardTitle>{t('policy.sla.tiers.title')}</CardTitle>
        <CardDescription className="text-xs">{t('policy.sla.tiers.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
              <tr>
                <th scope="col" className="p-3 text-start">{t('policy.sla.col.tier')}</th>
                <th scope="col" className="p-3 text-end">{t('policy.sla.col.firstResponse')}</th>
                <th scope="col" className="p-3 text-end">{t('policy.sla.col.resolution')}</th>
                <th scope="col" className="p-3 text-start">{t('policy.sla.col.coverage')}</th>
                <th scope="col" className="p-3 text-start">{t('policy.sla.col.pause')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {draft.sla.tiers.map((tier) => (
                <tr key={tier.key}>
                  <th scope="row" className="p-3 text-start font-medium text-foreground">
                    <span className="font-semibold">{tier.key}</span>{' '}
                    <span className="text-muted-foreground">{t(tier.labelKey)}</span>
                  </th>
                  <td className="p-3 text-end">
                    <MinutesField
                      id={`tier-${tier.key}-first`}
                      label={`${tier.key} · ${t('policy.sla.col.firstResponse')}`}
                      value={tier.firstResponseMinutes}
                      disabled={!canWrite}
                      onCommit={(next) =>
                        onChange(setTierDefault(draft, tier.key, { firstResponseMinutes: next ?? 0 }))
                      }
                    />
                  </td>
                  <td className="p-3 text-end">
                    <MinutesField
                      id={`tier-${tier.key}-resolution`}
                      label={`${tier.key} · ${t('policy.sla.col.resolution')}`}
                      value={tier.resolutionMinutes}
                      disabled={!canWrite}
                      onCommit={(next) =>
                        onChange(setTierDefault(draft, tier.key, { resolutionMinutes: next ?? 1 }))
                      }
                    />
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {t(`policy.sla.coverage.${tier.coverage}`)}
                  </td>
                  <td className="p-3">
                    <Switch
                      checked={tier.pausesOnCustomer}
                      disabled={!canWrite}
                      aria-label={t('policy.sla.pause.a11y', { tier: tier.key })}
                      onCheckedChange={(checked) =>
                        onChange(setTierDefault(draft, tier.key, { pausesOnCustomer: checked }))
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Two columns, unprefixed. This asked for them behind a deleted
            Tailwind breakpoint and therefore never got them — see the note on
            `IntegerField` in `OperationalCards`. */}
        <div className="grid grid-cols-2 gap-4 border-t border-border p-3 compact:grid-cols-1">
          <PercentField
            id="sla-at-risk"
            label={t('policy.sla.atRisk')}
            help={t('policy.sla.atRisk.help')}
            value={draft.sla.atRiskPercent}
            disabled={!canWrite}
            onCommit={(next) => onChange(setSlaThreshold(draft, 'atRiskPercent', next ?? 75))}
          />
          <PercentField
            id="sla-uncoded"
            label={t('policy.sla.uncodedCeiling')}
            help={t('policy.sla.uncodedCeiling.help')}
            value={draft.sla.uncodedCeilingPercent}
            disabled={!canWrite}
            onCommit={(next) => onChange(setSlaThreshold(draft, 'uncodedCeilingPercent', next ?? 3))}
          />
        </div>

        {blockedReason ? (
          <p className="border-t border-border p-3 text-xs text-muted-foreground">{blockedReason}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

/* ═══════════════════ the queue × tier grid ═══════════════════ */

export function SlaQueueGridCard({ draft, onChange, canWrite, blockedReason, t, language }: SlaProps) {
  const tally = overrideTally(draft)

  return (
    <Card>
      <CardHeader className="border-b border-border pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>{t('policy.sla.grid.title')}</CardTitle>
            <CardDescription className="text-xs">{t('policy.sla.grid.desc')}</CardDescription>
          </div>
          <StatusBadge tone="neutral">
            {t('policy.sla.overrides.count', {
              count: formatCount(tally.overridden, language),
              total: formatCount(tally.total, language),
            })}
          </StatusBadge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 p-3">
        {draft.sla.queues.map((queue) => (
          <section
            key={queue.queueId}
            aria-label={t(queue.labelKey)}
            className="rounded-md border border-border"
          >
            <h3 className="border-b border-border px-3 py-2 text-xs font-semibold text-foreground">
              {t(queue.labelKey)}
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
                  <tr>
                    <th scope="col" className="p-2 text-start">{t('policy.sla.col.tier')}</th>
                    <th scope="col" className="p-2 text-start">{t('policy.sla.col.firstResponse')}</th>
                    <th scope="col" className="p-2 text-start">{t('policy.sla.col.resolution')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {SLA_TIER_KEYS.map((tier) => (
                    <tr key={tier}>
                      <th scope="row" className="p-2 text-start font-medium text-foreground">
                        {tier}
                      </th>
                      {SLA_TARGET_FIELDS.map((field) => (
                        <td key={field} className="p-2 align-top">
                          <SlaTargetCell
                            draft={draft}
                            onChange={onChange}
                            queueId={queue.queueId}
                            tier={tier}
                            field={field}
                            canWrite={canWrite}
                            t={t}
                            language={language}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <fieldset className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border p-3">
              <legend className="sr-only">{t('policy.sla.breach.title')}</legend>
              <span className="text-xs font-medium text-muted-foreground">
                {t('policy.sla.breach.title')}
              </span>

              <label className="flex items-center gap-2 text-xs text-foreground">
                <Switch
                  checked={queue.breach.marksRow}
                  disabled={!canWrite}
                  aria-label={t('policy.sla.breach.marksRow.a11y', { queue: t(queue.labelKey) })}
                  onCheckedChange={(checked) =>
                    onChange(setBreachPolicy(draft, queue.queueId, { marksRow: checked }))
                  }
                />
                {t('policy.sla.breach.marksRow')}
              </label>

              <label className="flex items-center gap-2 text-xs text-foreground">
                <Switch
                  checked={queue.breach.reordersQueue}
                  disabled={!canWrite}
                  aria-label={t('policy.sla.breach.reordersQueue.a11y', { queue: t(queue.labelKey) })}
                  onCheckedChange={(checked) =>
                    onChange(setBreachPolicy(draft, queue.queueId, { reordersQueue: checked }))
                  }
                />
                {t('policy.sla.breach.reordersQueue')}
              </label>

              <div className="flex items-center gap-2">
                <Label htmlFor={`escalate-${queue.queueId}`} className="text-xs font-medium">
                  {t('policy.sla.breach.escalate')}
                </Label>
                <Select
                  value={queue.breach.escalateToRole ?? 'none'}
                  disabled={!canWrite}
                  onValueChange={(value) =>
                    onChange(
                      setBreachPolicy(draft, queue.queueId, {
                        escalateToRole: value === 'none' ? null : value,
                      }),
                    )
                  }
                >
                  <SelectTrigger id={`escalate-${queue.queueId}`} size="sm" className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('policy.sla.breach.escalate.none')}</SelectItem>
                    <SelectItem value="ops_supervisor">
                      {t('policy.sla.breach.escalate.ops_supervisor')}
                    </SelectItem>
                    <SelectItem value="finance_lead">
                      {t('policy.sla.breach.escalate.finance_lead')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </fieldset>
          </section>
        ))}

        {blockedReason ? (
          <p className="text-xs text-muted-foreground">{blockedReason}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

/* ─────────────────────── one cell ─────────────────────── */

interface CellProps {
  draft: PolicyDraft
  onChange: (next: PolicyDraft) => void
  queueId: WorkQueueId
  tier: SlaTierKey
  field: SlaTargetField
  canWrite: boolean
  t: Translate
  language: Language
}

/**
 * The two branches, and the asymmetry that matters: **only the `overridden`
 * branch renders an `<input>`.**
 *
 * `Revert to inherited` renders in both branches — disabled, with its reason,
 * when there is nothing to revert (§11.2). A control that vanishes when it
 * cannot be used teaches an operator that it does not exist.
 */
function SlaTargetCell({ draft, onChange, queueId, tier, field, canWrite, t, language }: CellProps) {
  const view = slaCellView(draft, queueId, tier, field)
  const fieldLabel = t(FIELD_LABEL_KEY[field])
  const queueLabel = t(
    draft.sla.queues.find((each) => each.queueId === queueId)?.labelKey ?? 'policy.sla.grid.title',
  )
  const inputId = `sla-${queueId}-${tier}-${field}`

  if (view.state === 'inherited') {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <StatusBadge tone="neutral">{t('policy.sla.state.inherited')}</StatusBadge>
        <p className="tabular-nums text-foreground">
          {t('policy.sla.inherited.value', {
            count: formatCount(view.effectiveMinutes, language),
            tier,
          })}
        </p>
        <Button
          size="xs"
          variant="ghost"
          disabled={!canWrite}
          aria-label={t('policy.sla.override.a11y', {
            field: fieldLabel,
            queue: queueLabel,
            tier,
          })}
          onClick={() => onChange(overrideSlaTarget(draft, queueId, tier, field))}
        >
          {t('policy.sla.override')}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <StatusBadge tone="info">{t('policy.sla.state.overridden')}</StatusBadge>
      <MinutesField
        id={inputId}
        label={`${queueLabel} · ${tier} · ${fieldLabel}`}
        value={view.effectiveMinutes}
        disabled={!canWrite}
        onCommit={(next) => onChange(setSlaTarget(draft, queueId, tier, field, next))}
      />
      <p className="text-xs text-muted-foreground">
        {t('policy.sla.inherited.value', {
          count: formatCount(view.tierMinutes, language),
          tier,
        })}
      </p>
      <Button
        size="xs"
        variant="ghost"
        disabled={!canWrite}
        aria-label={t('policy.sla.revert.a11y', { field: fieldLabel, queue: queueLabel, tier })}
        onClick={() => onChange(revertSlaTarget(draft, queueId, tier, field))}
      >
        {t('policy.sla.revert')}
      </Button>
    </div>
  )
}

/* ─────────────────── the two field shapes ─────────────────── */

interface NumberFieldProps {
  id: string
  label: string
  value: number
  disabled: boolean
  onCommit: (next: number | null) => void
}

/**
 * A whole number of minutes.
 *
 * `parseWholeNumber` returns `null` for a blank or malformed entry and the
 * caller decides what that means — **never `parseInt(v) || 0`**, which is
 * legacy's `gv()` (`:12984`) and would turn a cleared SLA field into
 * *breach on arrival*.
 */
function MinutesField({ id, label, value, disabled, onCommit }: NumberFieldProps) {
  return (
    <Input
      id={id}
      type="number"
      min={0}
      step={1}
      inputMode="numeric"
      aria-label={label}
      disabled={disabled}
      value={String(value)}
      className="w-24 text-end tabular-nums"
      onChange={(event) => onCommit(parseWholeNumber(event.target.value))}
    />
  )
}

function PercentField({
  id,
  label,
  help,
  value,
  disabled,
  onCommit,
}: NumberFieldProps & { help: string }) {
  return (
    <Field id={id} disabled={disabled}>
      <FieldLabel>{label}</FieldLabel>
      <FieldControl>
        <Input
          type="number"
          min={0}
          max={100}
          step={1}
          inputMode="numeric"
          value={String(value)}
          className="w-24 tabular-nums"
          onChange={(event) => onCommit(parseWholeNumber(event.target.value))}
        />
      </FieldControl>
      <FieldDescription>{help}</FieldDescription>
    </Field>
  )
}
