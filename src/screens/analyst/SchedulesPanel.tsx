/**
 * The Schedules tab (§8, AC-1266/AC-1267): a small list (one team's weekly
 * reviews), so a composer card plus a plain list rather than a `DataTable`.
 * `Switch` fits §4.3's "instant-effect settings only". Four states per block.
 */

import { useState } from 'react'
import { XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { useAsync } from '@/hooks'
import { createAgentSchedule, listAgentSchedules, listReports, updateAgentSchedule } from '@/data/clients'
import type { AgentSchedule } from '@/data/types/agent'
import type { Language, Translator } from '@/lib'
import { withIsolatedParam } from './bidiSentence'

export interface SchedulesPanelProps {
  currentUserId: string
  t: Translator
  language: Language
}

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const

/** `minute hour * * dow` -> `{ hour, minute, dow }`, or `null` for anything this tab did not itself write (a hand-edited or daily cron) — the raw string is then the honest fallback rather than a guessed sentence. */
function parseWeeklyCron(cron: string): { hour: number; minute: number; dow: number } | null {
  const fields = cron.trim().split(/\s+/)
  if (fields.length !== 5) return null
  const [minute, hour, dom, month, dow] = fields
  if (dom !== '*' || month !== '*' || dow === '*') return null
  const m = Number(minute)
  const h = Number(hour)
  const d = Number(dow)
  if (!Number.isInteger(m) || !Number.isInteger(h) || !Number.isInteger(d) || d < 0 || d > 6) return null
  return { hour: h, minute: m, dow: d }
}

function timeLabel(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

/** One sentence per cadence shape (§8), never the raw cron string — an operator reads neither cron syntax nor a `dow` digit. */
function describeCron(cron: string, t: Translator): string {
  const weekly = parseWeeklyCron(cron)
  if (weekly) return t('an.schedules.cadence.weekly', { day: t(`an.day.${weekly.dow}`), time: timeLabel(weekly.hour, weekly.minute) })
  return cron
}

interface AttachedReport {
  id: string
  name: string
}

function ScheduleComposer({
  onCreated,
  t,
}: {
  onCreated: () => void
  t: Translator
}) {
  const [day, setDay] = useState('0')
  const [time, setTime] = useState('06:00')
  const [attached, setAttached] = useState<AttachedReport[]>([])
  const [attachOpen, setAttachOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const picks = useAsync(async (signal) => (await listReports({ pageSize: 8 }, signal)).items, {
    deps: [attachOpen],
    enabled: attachOpen,
    cacheKey: 'analyst.schedules.attach',
  })

  const canSubmit = /^\d{2}:\d{2}$/.test(time) && !submitting

  const submit = async () => {
    if (!canSubmit) return
    const [hh, mm] = time.split(':')
    setSubmitting(true)
    try {
      await createAgentSchedule({ cron: `${Number(mm)} ${Number(hh)} * * ${day}`, reportIds: attached.map((a) => a.id), pageId: null })
      toast.success(t('an.schedules.new.toast'))
      setAttached([])
      onCreated()
    } catch {
      toast.error(t('an.schedules.new.error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('an.schedules.new.heading')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{t('an.schedules.new.day')}</span>
          <Tabs value={day} onValueChange={setDay}>
            <TabsList variant="segmented">
              {DAYS.map((d) => (
                <TabsTrigger key={d} value={String(d)}>
                  {t(`an.day.${d}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="an-schedule-time" className="text-xs text-muted-foreground">
            {t('an.schedules.new.time')}
          </label>
          <Input id="an-schedule-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} className="w-32" />
        </div>

        {attached.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {attached.map((report) => (
              <span
                key={report.id}
                className="inline-flex items-center gap-1 rounded-control border border-border bg-muted py-0.5 ps-2 pe-1 text-xs"
              >
                <bdi>{report.name}</bdi>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="size-5"
                  aria-label={t('an.compose.attach.remove', { name: report.name })}
                  onClick={() => setAttached((current) => current.filter((r) => r.id !== report.id))}
                >
                  <XIcon aria-hidden="true" className="size-3" />
                </Button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <Popover open={attachOpen} onOpenChange={setAttachOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="secondary" size="xs">
                {t('an.schedules.new.attach')}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-0">
              <Command>
                <CommandList>
                  <CommandEmpty>{t('an.compose.attach.empty')}</CommandEmpty>
                  <CommandGroup heading={t('an.compose.attach.report')}>
                    {(picks.data ?? [])
                      .filter((report) => !attached.some((a) => a.id === report.id))
                      .map((report) => (
                        <CommandItem
                          key={report.id}
                          value={report.name}
                          onSelect={() => {
                            setAttached((current) => [...current, { id: report.id, name: report.name }])
                            setAttachOpen(false)
                          }}
                        >
                          <bdi>{report.name}</bdi>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Button type="button" onClick={() => void submit()} disabled={!canSubmit}>
            {t('an.schedules.new.action')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ScheduleRow({
  schedule,
  currentUserId,
  onToggled,
  t,
}: {
  schedule: AgentSchedule
  currentUserId: string
  onToggled: () => void
  t: Translator
}) {
  const [pending, setPending] = useState(false)

  const toggle = async (checked: boolean) => {
    setPending(true)
    try {
      await updateAgentSchedule(schedule.id, { enabled: checked })
      toast.success(t(checked ? 'an.schedules.action.enable.toast' : 'an.schedules.action.disable.toast'))
      onToggled()
    } catch {
      toast.error(t('an.schedules.action.toggle.failed'))
    } finally {
      setPending(false)
    }
  }

  /* AR2 — a translated "you" is a word, not content, and needs no isolation;
     the raw owner id does, so only that branch goes through `withIsolatedParam`. */
  const isYou = schedule.ownerId === currentUserId
  const ownerLine = isYou
    ? t('an.schedules.owner', { who: t('an.index.owner.you') })
    : withIsolatedParam(t, 'an.schedules.owner', { who: schedule.ownerId }, 'who')

  return (
    <li className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm text-foreground">{describeCron(schedule.cron, t)}</span>
        <span className="text-xs text-muted-foreground">
          {t.plural('an.schedules.col.reports', { count: schedule.reportIds.length })} · {ownerLine}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs text-muted-foreground">{t(schedule.enabled ? 'an.schedules.enabled' : 'an.schedules.disabled')}</span>
        <Switch
          checked={schedule.enabled}
          disabled={pending}
          onCheckedChange={(checked) => void toggle(checked)}
          aria-label={t(schedule.enabled ? 'an.schedules.action.disable' : 'an.schedules.action.enable')}
        />
      </div>
    </li>
  )
}

export function SchedulesPanel({ currentUserId, t }: SchedulesPanelProps) {
  const schedules = useAsync((signal) => listAgentSchedules(signal), { cacheKey: 'agent.schedules.list' })

  return (
    <div className="flex flex-col gap-3">
      <ScheduleComposer onCreated={schedules.refetch} t={t} />

      {schedules.status === 'loading' && <LoadingSkeleton pattern="P1" rows={3} label={t('an.schedules.loading')} />}

      {schedules.status === 'error' && (
        <ErrorState scope="card" message={t('an.schedules.error')} action={{ label: t('an.index.error.retry'), onClick: schedules.refetch }} />
      )}

      {schedules.status === 'empty' && (
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-8 text-center">
            <p className="text-sm font-medium text-foreground">{t('an.schedules.empty.heading')}</p>
            <p className="max-w-md text-sm text-muted-foreground">{t('an.schedules.empty.body')}</p>
          </CardContent>
        </Card>
      )}

      {schedules.status === 'content' && (
        <Card>
          <ul>
            {(schedules.data ?? []).map((schedule) => (
              <ScheduleRow key={schedule.id} schedule={schedule} currentUserId={currentUserId} onToggled={schedules.refetch} t={t} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
