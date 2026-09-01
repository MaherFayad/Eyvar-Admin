/**
 * Admin › Data & Compliance — the dataset export.
 *
 * ## What was here, and why it counted as a defect
 *
 * `handleTriggerExport` was `setTimeout(1200)` followed by
 * `toast('Export archive generated: trips_30d.csv')` — a toast naming a file
 * that was never built and never downloaded. That is worse than a missing
 * feature: the operator now believes an export exists, and the failure only
 * surfaces when they go looking for the file, by which time nobody connects it
 * to this button.
 *
 * ## Why it routes through the report export rather than a second CSV writer
 *
 * `exportReport` (`clients/reports.ts:367`) and `reportToCsv` (`:314`) already
 * exist, and between them they carry three things a hand-rolled dump here would
 * have had to re-derive and would eventually have got wrong:
 *
 *   **The audit entry.** *"An export of operational data that leaves no trace is
 *   a compliance problem, not a feature"* — the endpoint exists so the entry has
 *   somewhere to be written. This card is on the **compliance** page; an
 *   unlogged export from it would be the joke writing itself.
 *
 *   **§10.2's one deliberate break of the halalas rule.** Money in a CSV is
 *   decimal SAR with an explicit currency column, because the consumer is a
 *   human in a spreadsheet and `29505` in a revenue column is a defect they will
 *   not catch. That conversion happens once, in the data layer, with the reason
 *   attached. A second export path is a second place for someone to "fix" it
 *   back to halalas.
 *
 *   **AC-890.** A series the operator's role cannot read is **omitted and
 *   named** in the header block, so a redacted export cannot pass for a complete
 *   one. This card reports the count rather than swallowing it.
 *
 * Serialisation and download are `screens/reports/csv.ts` — `reportCsvToText`
 * and `downloadCsv`, imported and called, not copied. That file belongs to
 * another owner and is not edited here.
 *
 * ## What the card can honestly offer
 *
 * The reporting layer has seventeen measures and none of them counts a ticket,
 * so `Tickets and disputes` is **offered, disabled, and told why** rather than
 * removed — §11.2, and removing it would hide the gap from the person who could
 * close it. Same for the two file formats that do not exist: `reportToCsv`
 * produces a CSV, so JSON Lines and Parquet are disabled in place with the
 * reason instead of being silently produced as CSV under another extension.
 *
 * Rules applied
 *   §11.2      unavailable options are disabled in place with the reason.
 *   §11.3      the in-flight button carries a progress state, not a spinner
 *              standing in for the whole card.
 *   R3         `Export dataset` is SECONDARY. The screen's one primary is the
 *              integrity run.
 *   §9.1       logical utilities only.
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { Download, FileSpreadsheet, RefreshCw } from 'lucide-react'

import { exportReport } from '@/data/clients'
import type { ReportGrain, ReportPreset, ReportQuery } from '@/data/types'
import { reportCsvToText, downloadCsv } from '@/screens/reports/csv'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useShell } from '@/shell/ShellContext'
import { BlockedButton } from './BlockedButton'

/**
 * Dataset → the measures the reporting layer actually holds for it.
 *
 * `measures: null` is a dataset the semantic layer cannot answer. It stays on
 * the list, disabled, with its reason — the gap is a fact about the product and
 * hiding it does not close it.
 */
const DATASETS: ReadonlyArray<{ id: string; measures: readonly string[] | null }> = [
  { id: 'trips', measures: ['trips.completed', 'trips.fareCollected'] },
  { id: 'subscriptions', measures: ['subscriptions.started', 'subscriptions.cancelled'] },
  { id: 'captains', measures: ['captains.joined'] },
  { id: 'riders', measures: ['riders.joined', 'riders.activated'] },
  { id: 'revenue', measures: ['revenue.total', 'revenue.subscription'] },
  { id: 'support', measures: null },
]

const FORMATS: ReadonlyArray<{ id: string; available: boolean }> = [
  { id: 'csv', available: true },
  { id: 'jsonl', available: false },
  { id: 'parquet', available: false },
]

const RANGES: readonly ReportPreset[] = ['last-7d', 'last-30d', 'last-90d', 'last-365d']
const GRAINS: readonly ReportGrain[] = ['day', 'week', 'month']

export function ExportCard() {
  const { t } = useShell().language

  const [dataset, setDataset] = useState('trips')
  const [format, setFormat] = useState('csv')
  const [range, setRange] = useState<ReportPreset>('last-30d')
  const [grain, setGrain] = useState<ReportGrain>('day')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const selected = DATASETS.find((d) => d.id === dataset)
  const measures = selected?.measures ?? null

  const handleExport = async () => {
    if (measures === null) return
    setBusy(true)
    setFailed(false)
    try {
      const query: ReportQuery = {
        measures: measures.map((key) => ({ key })),
        groupBy: null,
        filters: [],
        window: { kind: 'preset', preset: range },
        grain,
        periodComparison: 'none',
        chartType: 'table',
      }
      const name = t(`adminData.export.dataset.${dataset}`)
      const csv = await exportReport(query, { reportName: name })
      const filename = `eyvar_${dataset}_${range}.csv`
      downloadCsv(filename, reportCsvToText(csv))
      toast.success(t('adminData.export.toast', { filename }))
      if (csv.header.omittedSeries.length > 0) {
        /* AC-890 — a redacted export must not read as a complete one. */
        toast.message(t('adminData.export.omitted', { count: csv.header.omittedSeries.length }))
      }
    } catch {
      setFailed(true)
      toast.error(t('adminData.export.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          {t('adminData.export.title')}
        </CardTitle>
        <CardDescription className="max-w-2xl text-xs">{t('adminData.export.desc')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-4 text-xs">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Field label={t('adminData.export.dataset')}>
            <Select value={dataset} onValueChange={setDataset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATASETS.map((d) => (
                  <SelectItem key={d.id} value={d.id} disabled={d.measures === null}>
                    {t(`adminData.export.dataset.${d.id}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {measures === null && (
              <p className="text-2xs text-muted-foreground">
                {t('adminData.export.dataset.support.blocked')}
              </p>
            )}
          </Field>

          <Field label={t('adminData.export.format')}>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORMATS.map((f) => (
                  <SelectItem key={f.id} value={f.id} disabled={!f.available}>
                    {t(`adminData.export.format.${f.id}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-2xs text-muted-foreground">{t('adminData.export.format.blocked')}</p>
          </Field>

          <Field label={t('adminData.export.range')}>
            <Select value={range} onValueChange={(v) => setRange(v as ReportPreset)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`adminData.export.range.${r}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label={t('adminData.export.grain')}>
            <Select value={grain} onValueChange={(v) => setGrain(v as ReportGrain)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GRAINS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {t(`adminData.export.grain.${g}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        {/* §11.2 — the failure is a sentence naming the next move, not a red
            banner and not a silent toast that has already gone. */}
        {failed && <p className="text-2xs text-muted-foreground">{t('adminData.export.error')}</p>}

        <div className="flex justify-end pt-1">
          <BlockedButton
            label={t('adminData.export.action')}
            reason={measures === null ? t('adminData.export.dataset.support.blocked') : null}
            disabled={busy}
            onClick={() => void handleExport()}
          >
            {busy ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                {t('adminData.export.running')}
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                {t('adminData.export.action')}
              </>
            )}
          </BlockedButton>
        </div>
      </CardContent>
    </Card>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="block font-medium text-foreground">{label}</span>
      {children}
    </label>
  )
}
