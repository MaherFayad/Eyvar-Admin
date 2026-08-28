import { useState } from 'react'
import { toast } from 'sonner'
import type { SubTabRoute } from '@/data/types'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, CheckCircle2, MessageSquare, Send, Server } from 'lucide-react'
import { PushComposerModal } from './PushComposerModal'

interface NotificationTemplate {
  id: string
  code: string
  name: string
  channel: 'SMS' | 'Push' | 'WhatsApp'
  recipient: 'Driver' | 'Rider' | 'Both'
  sampleText: string
  status: 'active' | 'draft'
}

const TEMPLATES: NotificationTemplate[] = [
  {
    id: 'TMP-01',
    code: 'driver_assigned',
    name: 'Captain Assigned Notice',
    channel: 'Push',
    recipient: 'Rider',
    sampleText: 'Captain {driver_name} has accepted your trip ({vehicle_model} · {plate}).',
    status: 'active',
  },
  {
    id: 'TMP-02',
    code: 'subscription_reminder',
    name: 'Monthly Subscription Renewal',
    channel: 'WhatsApp',
    recipient: 'Rider',
    sampleText: 'Your monthly package {plan_name} renews on {date}. Unused trips: {trips_left}.',
    status: 'active',
  },
  {
    id: 'TMP-03',
    code: 'payout_processed',
    name: 'Weekly Earnings Payout Processed',
    channel: 'SMS',
    recipient: 'Driver',
    sampleText: 'Your weekly payout of SAR {amount} has been transferred to your IBAN {iban}.',
    status: 'active',
  },
  {
    id: 'TMP-04',
    code: 'sos_alert',
    name: 'Emergency SOS Broadcast',
    channel: 'SMS',
    recipient: 'Both',
    sampleText: 'Emergency trigger on trip {trip_id}. Ops safety desk has been alerted.',
    status: 'active',
  },
]

export function AdminCommunicationsScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const { t, dir } = shell.language

  const [composerOpen, setComposerOpen] = useState(false)
  const [broadcasts, setBroadcasts] = useState([
    {
      id: 'BRD-101',
      title: 'Surge Alert: KAFD Riyadh Area',
      audience: 'Captains Online',
      sentAt: '2026-06-25 08:30',
      deliveredCount: 84,
      openRate: '92%',
    },
    {
      id: 'BRD-102',
      title: 'App Maintenance Scheduled',
      audience: 'All Registered Users',
      sentAt: '2026-06-20 23:00',
      deliveredCount: 4200,
      openRate: '88%',
    },
  ])

  const canWrite = shell.permissions.permissions.includes('manage_settings')

  const handleBroadcastSend = (title: string, _body: string, audience: string, _deepLink: string) => {
    setBroadcasts((prev) => [
      {
        id: `BRD-${Date.now()}`,
        title,
        audience,
        sentAt: 'Just now',
        deliveredCount: 142,
        openRate: '—',
      },
      ...prev,
    ])
    toast.success(t('admin.toast.broadcastSent', { defaultValue: 'Push broadcast sent to {audience}', audience }))
  }

  return (
    <SingleColumnPage
      header={
        <PageHeader
          title={t(row.titleKey)}
          meta={t('admin.comm.meta', { defaultValue: 'SMS & WhatsApp gateway health, notification templates, and broadcast push' })}
          primaryAction={
            canWrite
              ? {
                  label: t('admin.push.composeButton', { defaultValue: '+ New Push Broadcast' }),
                  onClick: () => setComposerOpen(true),
                }
              : undefined
          }
          t={t}
          dir={dir}
        />
      }
    >
      <div className="flex flex-col gap-6 max-w-5xl">
        {/* 1. Gateway Status & Provider Health */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5 text-muted-foreground" />
                Unifonic SMS Gateway
              </span>
              <StatusBadge tone="success">Operational</StatusBadge>
            </CardHeader>
            <CardContent className="p-3 pt-1 text-xs space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Latency:</span>
                <span className="font-semibold text-foreground">180ms</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery Rate (24h):</span>
                <span className="font-semibold text-emerald-600">99.8%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                WhatsApp Cloud API
              </span>
              <StatusBadge tone="success">Operational</StatusBadge>
            </CardHeader>
            <CardContent className="p-3 pt-1 text-xs space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Quality Rating:</span>
                <span className="font-semibold text-emerald-600">High (Green)</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Monthly Quota:</span>
                <span className="font-semibold text-foreground">12.4k / 50k</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                Firebase FCM / APNs
              </span>
              <StatusBadge tone="success">Operational</StatusBadge>
            </CardHeader>
            <CardContent className="p-3 pt-1 text-xs space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Active Tokens:</span>
                <span className="font-semibold text-foreground">4,812</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Push Success:</span>
                <span className="font-semibold text-emerald-600">99.9%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 2. Notification Templates Catalog */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              {t('admin.templates.title', { defaultValue: 'System Notification Templates' })}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('admin.templates.desc', { defaultValue: 'Transactional messaging triggered by lifecycle trip and subscription events.' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border text-xs">
              {TEMPLATES.map((tmpl) => (
                <div key={tmpl.id} className="p-3 flex items-start justify-between hover:bg-muted/20">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{tmpl.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">({tmpl.code})</span>
                      <StatusBadge tone={tmpl.channel === 'WhatsApp' ? 'success' : tmpl.channel === 'SMS' ? 'info' : 'new'}>
                        {tmpl.channel}
                      </StatusBadge>
                    </div>
                    <p className="text-[11px] text-muted-foreground italic font-mono bg-muted/40 p-2 rounded border border-border">
                      "{tmpl.sampleText}"
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">To: {tmpl.recipient}</span>
                    {canWrite && (
                      <Button variant="secondary" size="xs">
                        {t('action.edit', { defaultValue: 'Edit Template' })}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 3. Broadcast History */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Send className="h-4 w-4 text-muted-foreground" />
              {t('admin.broadcasts.title', { defaultValue: 'Recent Push Broadcasts' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border text-xs">
              {broadcasts.map((b) => (
                <div key={b.id} className="p-3 flex items-center justify-between hover:bg-muted/20">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{b.title}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{b.id}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">Target: {b.audience} · Sent: {b.sentAt}</span>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className="font-medium text-foreground block">{b.deliveredCount} delivered</span>
                      <span className="text-[10px] text-muted-foreground">Open Rate: {b.openRate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <PushComposerModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSend={handleBroadcastSend}
        t={t}
      />
    </SingleColumnPage>
  )
}
