import { useState } from 'react'
import { toast } from 'sonner'
import type { SubTabRoute } from '@/data/types'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Headphones, PhoneCall } from 'lucide-react'
import { CallConsoleModal } from './CallConsoleModal'

interface AgentStatus {
  id: string
  name: string
  role: string
  status: 'available' | 'on-call' | 'wrap-up' | 'offline'
  handledCallsToday: number
  avgHandleTime: string
  csatScore: number
}

interface CptMetric {
  code: string
  category: string
  volume: number
  cpt: number
  targetCpt: number
  slaRate: number
  owner: string
}

const INITIAL_AGENTS: AgentStatus[] = [
  {
    id: 'USR-3',
    name: 'Lina Al-Otaibi',
    role: 'Support Specialist',
    status: 'on-call',
    handledCallsToday: 24,
    avgHandleTime: '3m 42s',
    csatScore: 4.9,
  },
  {
    id: 'USR-4',
    name: 'Noura Al-Fahad',
    role: 'Support Specialist',
    status: 'available',
    handledCallsToday: 19,
    avgHandleTime: '4m 10s',
    csatScore: 4.8,
  },
  {
    id: 'USR-5',
    name: 'Yousef Al-Balawi',
    role: 'Ops & Escalations',
    status: 'available',
    handledCallsToday: 11,
    avgHandleTime: '5m 30s',
    csatScore: 5.0,
  },
]

const CPT_METRICS: CptMetric[] = [
  {
    code: 'fare_dispute',
    category: 'Billing',
    volume: 142,
    cpt: 12.4,
    targetCpt: 8.0,
    slaRate: 98.2,
    owner: 'Finance / Pricing Team',
  },
  {
    code: 'captain_absence',
    category: 'Assurance',
    volume: 68,
    cpt: 5.8,
    targetCpt: 3.5,
    slaRate: 99.4,
    owner: 'Fleet Operations',
  },
  {
    code: 'lost_item',
    category: 'Operations',
    volume: 34,
    cpt: 2.9,
    targetCpt: 3.0,
    slaRate: 96.5,
    owner: 'Customer Care',
  },
  {
    code: 'app_bug',
    category: 'Technical',
    volume: 21,
    cpt: 1.8,
    targetCpt: 2.0,
    slaRate: 94.0,
    owner: 'Product / Mobile Eng',
  },
]

export function ContactCentreScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const { t, dir } = shell.language

  const [agents] = useState<AgentStatus[]>(INITIAL_AGENTS)
  const [consoleOpen, setConsoleOpen] = useState(false)
  const [loggedCalls, setLoggedCalls] = useState([
    {
      id: 'CALL-101',
      caller: 'Mohammed Al-Ghamdi',
      reasonCode: 'fare_dispute',
      duration: '4m 12s',
      agent: 'Lina Al-Otaibi',
      time: '10 mins ago',
    },
    {
      id: 'CALL-102',
      caller: 'Sara Al-Otaibi',
      reasonCode: 'lost_item',
      duration: '2m 50s',
      agent: 'Noura Al-Fahad',
      time: '28 mins ago',
    },
  ])

  const canWrite = shell.permissions.permissions.includes('contact_users')

  const handleCallComplete = (callerName: string, reasonCode: string, _notes: string, durationSeconds: number) => {
    const m = Math.floor(durationSeconds / 60)
    const s = durationSeconds % 60
    const durationStr = `${m}m ${s}s`
    setLoggedCalls((prev) => [
      {
        id: `CALL-${Date.now()}`,
        caller: callerName,
        reasonCode,
        duration: durationStr,
        agent: shell.session?.name ?? 'Sarah Al-Rashid',
        time: 'Just now',
      },
      ...prev,
    ])
    toast.success(t('contacts.toast.callSaved', { defaultValue: 'Support call logged for {caller}', caller: callerName }))
  }

  return (
    <SingleColumnPage
      header={
        <PageHeader
          title={t(row.titleKey)}
          meta={t('contacts.pageMeta', { defaultValue: 'Support Team Operations & CPT Analytics' })}
          primaryAction={
            canWrite
              ? {
                  label: t('contacts.launchConsole', { defaultValue: '+ Launch Call Console' }),
                  onClick: () => setConsoleOpen(true),
                }
              : undefined
          }
          t={t}
          dir={dir}
        />
      }
    >
      <div className="flex flex-col gap-6">
        {/* 1. Support Team Active Roster */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Headphones className="h-4 w-4 text-muted-foreground" />
                  {t('contacts.teamRoster', { defaultValue: 'Support Agents on Duty' })}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t('contacts.teamRosterDesc', { defaultValue: 'Active call center agent status and workload.' })}
                </CardDescription>
              </div>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900">
                {agents.filter((a) => a.status !== 'offline').length} {t('contacts.agentsActive', { defaultValue: 'Online' })}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border text-xs">
              {agents.map((agent) => (
                <div key={agent.id} className="flex items-center justify-between p-3 hover:bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                      {agent.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-semibold text-foreground block">{agent.name}</span>
                      <span className="text-[11px] text-muted-foreground">{agent.role}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="font-medium text-foreground block">{agent.handledCallsToday} calls</span>
                      <span className="text-[11px] text-muted-foreground">Avg: {agent.avgHandleTime}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-foreground block">★ {agent.csatScore.toFixed(1)}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-medium">CSAT</span>
                    </div>
                    <StatusBadge
                      tone={agent.status === 'on-call' ? 'warning' : agent.status === 'available' ? 'success' : 'neutral'}
                    >
                      {agent.status === 'on-call' ? 'On Call' : agent.status === 'available' ? 'Available' : 'Wrap-up'}
                    </StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 2. CPT (Calls Per Thousand) Root Cause Analysis */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              {t('contacts.cptTable', { defaultValue: 'CPT (Calls Per Thousand) Root Cause Taxonomy' })}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('contacts.cptTableDesc', { defaultValue: 'Call rate drivers by reason code compared to benchmark target.' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b border-border text-[11px] font-medium text-muted-foreground">
                  <tr>
                    <th className="p-3">Reason Code</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-right">Volume</th>
                    <th className="p-3 text-right">Current CPT</th>
                    <th className="p-3 text-right">Target CPT</th>
                    <th className="p-3 text-right">SLA %</th>
                    <th className="p-3">Root Cause Owner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {CPT_METRICS.map((cpt) => {
                    const isOverTarget = cpt.cpt > cpt.targetCpt
                    return (
                      <tr key={cpt.code} className="hover:bg-muted/20">
                        <td className="p-3 font-mono font-medium text-foreground">{cpt.code}</td>
                        <td className="p-3 text-foreground">{cpt.category}</td>
                        <td className="p-3 text-right tabular-nums text-foreground">{cpt.volume}</td>
                        <td className="p-3 text-right tabular-nums font-semibold text-foreground">
                          <span className={isOverTarget ? 'text-amber-600 font-bold' : 'text-foreground'}>
                            {cpt.cpt.toFixed(1)}
                          </span>
                        </td>
                        <td className="p-3 text-right tabular-nums text-muted-foreground">{cpt.targetCpt.toFixed(1)}</td>
                        <td className="p-3 text-right tabular-nums text-emerald-600 font-medium">{cpt.slaRate}%</td>
                        <td className="p-3 text-muted-foreground">{cpt.owner}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 3. Recent Call Logs Feed */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-muted-foreground" />
              {t('contacts.recentCalls', { defaultValue: 'Recent Support Contacts Log' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border text-xs">
            {loggedCalls.map((call) => (
              <div key={call.id} className="p-3 flex items-center justify-between hover:bg-muted/20">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{call.caller}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{call.reasonCode}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Handled by {call.agent} · Duration: {call.duration}</span>
                </div>
                <span className="text-[11px] text-muted-foreground">{call.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <CallConsoleModal
        open={consoleOpen}
        onClose={() => setConsoleOpen(false)}
        onComplete={handleCallComplete}
        t={t}
      />
    </SingleColumnPage>
  )
}
