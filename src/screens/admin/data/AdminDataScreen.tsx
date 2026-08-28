import { useState } from 'react'
import { toast } from 'sonner'
import type { SubTabRoute } from '@/data/types'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Database, Download, FileSpreadsheet, Lock, RefreshCw, ShieldAlert } from 'lucide-react'

export function AdminDataScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const { t, dir } = shell.language

  const [exportDataset, setExportDataset] = useState('trips')
  const [exportFormat, setExportFormat] = useState('csv')
  const [dateRange, setDateRange] = useState('30d')
  const [busyExport, setBusyExport] = useState(false)

  const [retentionPeriod, setRetentionPeriod] = useState('730')
  const [telemetryRetention, setTelemetryRetention] = useState('90')

  const canWrite = shell.permissions.permissions.includes('manage_settings')

  const handleTriggerExport = () => {
    setBusyExport(true)
    setTimeout(() => {
      setBusyExport(false)
      toast.success(t('admin.toast.exportReady', { defaultValue: 'Export archive generated: {dataset}_{range}.{format}', dataset: exportDataset, range: dateRange, format: exportFormat }))
    }, 1200)
  }

  const handleSaveRetention = () => {
    toast.success(t('admin.toast.retentionSaved', { defaultValue: 'Data retention schedules updated' }))
  }

  return (
    <SingleColumnPage
      header={
        <PageHeader
          title={t(row.titleKey)}
          meta={t('admin.data.meta', { defaultValue: 'Data exports, PDPL compliance, retention schedules, and database backups' })}
          t={t}
          dir={dir}
        />
      }
    >
      <div className="flex flex-col gap-6 max-w-4xl">
        {/* 1. Bulk Data Export Utility */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              {t('admin.export.title', { defaultValue: 'Dataset Export & Analytics Dumps' })}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('admin.export.desc', { defaultValue: 'Export sanitized operational, financial, and telemetry records for external analysis.' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <span className="font-medium text-foreground block">{t('admin.exportDataset', { defaultValue: 'Dataset' })}</span>
                <Select value={exportDataset} onValueChange={setExportDataset}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trips">Trips & Telemetry</SelectItem>
                    <SelectItem value="subscriptions">Subscriptions & Packages</SelectItem>
                    <SelectItem value="drivers">Captains & Performance</SelectItem>
                    <SelectItem value="ledger">Ledger Postings & Cash</SelectItem>
                    <SelectItem value="support">Tickets & Disputes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <span className="font-medium text-foreground block">{t('admin.exportFormat', { defaultValue: 'File Format' })}</span>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV (Comma-Separated)</SelectItem>
                    <SelectItem value="json">JSON Lines (.jsonl)</SelectItem>
                    <SelectItem value="parquet">Apache Parquet (.parquet)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <span className="font-medium text-foreground block">{t('admin.exportRange', { defaultValue: 'Time Horizon' })}</span>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                    <SelectItem value="all">All Time (Full Ledger)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                size="xs"
                onClick={handleTriggerExport}
                disabled={busyExport}
                className="gap-1.5"
              >
                {busyExport ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    {t('admin.exporting', { defaultValue: 'Generating Dump...' })}
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    {t('admin.startExport', { defaultValue: 'Export Dataset' })}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 2. PDPL & Data Retention Policy */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              {t('admin.retention.title', { defaultValue: 'Saudi PDPL & Data Retention Schedules' })}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('admin.retention.desc', { defaultValue: 'Automated data minimization rules and right-to-be-forgotten anonymization.' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="font-medium text-foreground block">{t('admin.generalRetention', { defaultValue: 'General Audit Retention (Days)' })}</span>
                <Select value={retentionPeriod} onValueChange={setRetentionPeriod} disabled={!canWrite}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="365">365 Days (1 Year)</SelectItem>
                    <SelectItem value="730">730 Days (2 Years - Statutory)</SelectItem>
                    <SelectItem value="1825">1,825 Days (5 Years - ZATCA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <span className="font-medium text-foreground block">{t('admin.gpsRetention', { defaultValue: 'High-Frequency GPS Retention (Days)' })}</span>
                <Select value={telemetryRetention} onValueChange={setTelemetryRetention} disabled={!canWrite}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 Days</SelectItem>
                    <SelectItem value="90">90 Days (Standard SLA)</SelectItem>
                    <SelectItem value="180">180 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {canWrite && (
              <div className="flex justify-end pt-2">
                <Button size="xs" variant="secondary" onClick={handleSaveRetention}>
                  {t('action.save', { defaultValue: 'Save Retention Policy' })}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Snapshot Backups & Infrastructure Health */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              {t('admin.backup.title', { defaultValue: 'Automated Database Backups' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border text-xs">
              <div className="p-3 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">PostgreSQL Daily Snapshot</span>
                    <StatusBadge tone="success">Completed</StatusBadge>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Snapshot ID: snap-20260625-0300 · Size: 4.8 GB</span>
                </div>
                <span className="text-[11px] text-muted-foreground">Today 03:00 UTC+3</span>
              </div>

              <div className="p-3 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">WAL Archive Stream</span>
                    <StatusBadge tone="success">Streaming (RPO &lt; 1m)</StatusBadge>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Continuous replication to Riyadh region secondary bucket</span>
                </div>
                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SingleColumnPage>
  )
}
