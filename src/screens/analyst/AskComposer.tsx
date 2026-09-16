/**
 * The ask composer (AC-1255): an inline card, never a dialog (owner's
 * no-dialog ruling). `Kind` is a segmented control since it changes the
 * output schema (R15's exception); `Ask` is the view's one primary (R3).
 */

import { useState } from 'react'
import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAsync } from '@/hooks'
import { listFirings, listPages, listReports } from '@/data/clients'
import type { AgentJobContext, AgentJobKind, AgentRunner } from '@/data/types/agent'
import type { ReportPreset } from '@/data/types/report'
import { formatDate, type Language, type Translator } from '@/lib'

export interface AskComposerAttachment {
  context: AgentJobContext
  label: string
}

export interface AskComposerProps {
  /** `null` while `agent.status` has not answered yet — the composer stays enabled until it is told otherwise (§5.4's own "a missing fact is honest"). */
  runner: AgentRunner | null
  submitting: boolean
  onAsk: (input: { kind: AgentJobKind; question: string; contextObjects: AgentJobContext[] }) => void
  /** AC-1262 — seeded once from an entry point (builder overflow, page header, alert row); still removable, like any other chip. */
  initialAttachment?: AskComposerAttachment | null
  t: Translator
  language: Language
}

/* Four, not five — `triage-alert` has no composer entry (§4): it is reached
   only from "Explain this firing", never typed by hand. */
const KINDS: readonly AgentJobKind[] = ['ask', 'case-study', 'build-page', 'weekly-review']

const KIND_KEY: Record<AgentJobKind, string> = {
  ask: 'an.kind.ask',
  'case-study': 'an.kind.caseStudy',
  'build-page': 'an.kind.buildPage',
  'triage-alert': 'an.kind.triageAlert',
  'weekly-review': 'an.kind.weeklyReview',
}

/* The date-range attachment offers three presets rather than free-typed
   dates — `ReportWindow`'s `preset` variant is a real, valid window and
   needs no date-parsing UI; a fixed range is a follow-up if an operator
   asks for one. */
const WINDOW_PRESETS: readonly ReportPreset[] = ['last-7d', 'last-30d', 'this-quarter']

type Attached = AskComposerAttachment

/** One line per attachable kind, read only from what the operator already picked. */
function chipLabel(attached: Attached): string {
  return attached.label
}

export function AskComposer({
  runner,
  submitting,
  onAsk,
  initialAttachment = null,
  t,
  language,
}: AskComposerProps) {
  const [question, setQuestion] = useState('')
  const [kind, setKind] = useState<AgentJobKind>('ask')
  /* Lazy initial state — read once, on this mount, the same "one-shot" rule
     `readAnalystEntryContext` documents; a later prop change does not re-seed. */
  const [attached, setAttached] = useState<Attached[]>(() => (initialAttachment ? [initialAttachment] : []))
  const [attachOpen, setAttachOpen] = useState(false)

  const offline = runner !== null && !runner.online
  const limited = runner !== null && runner.online && runner.limitedUntil !== null
  const disabledReason = offline
    ? t('an.compose.disabled.offline')
    : limited
      ? t('an.compose.disabled.limited', {
          time: formatDate(runner!.limitedUntil as string, { style: 'time', language }),
        })
      : null
  const canAsk = disabledReason === null && question.trim() !== '' && !submitting

  const submit = () => {
    if (!canAsk) return
    onAsk({ kind, question: question.trim(), contextObjects: attached.map((a) => a.context) })
    setQuestion('')
    setAttached([])
  }

  const attach = (next: Attached) => {
    setAttached((current) => [...current, next])
    setAttachOpen(false)
  }

  const removeAttached = (index: number) => {
    setAttached((current) => current.filter((_, i) => i !== index))
  }

  const picks = useAsync(
    async (signal) => {
      const [reports, pages, firings] = await Promise.all([
        listReports({ pageSize: 8 }, signal),
        listPages({ pageSize: 8 }, signal),
        listFirings({ pageSize: 8 }, signal),
      ])
      return { reports: reports.items, pages: pages.items, firings: firings.items }
    },
    { deps: [attachOpen], enabled: attachOpen, cacheKey: 'analyst.attach' },
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('an.compose.heading')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={t('an.compose.question.placeholder')}
          aria-label={t('an.compose.question.label')}
        />

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{t('an.compose.kind')}</span>
          <Tabs value={kind} onValueChange={(value) => setKind(value as AgentJobKind)}>
            <TabsList variant="segmented">
              {KINDS.map((each) => (
                <TabsTrigger key={each} value={each}>
                  {t(KIND_KEY[each])}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {attached.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {attached.map((each, index) => (
              <span
                key={`${each.context.kind}-${index}`}
                className="inline-flex items-center gap-1 rounded-control border border-border bg-muted py-0.5 ps-2 pe-1 text-xs"
              >
                <bdi>{chipLabel(each)}</bdi>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="size-5"
                  aria-label={t('an.compose.attach.remove', { name: chipLabel(each) })}
                  onClick={() => removeAttached(index)}
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
                {t('an.compose.attach')}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-0">
              <Command>
                <CommandList>
                  <CommandEmpty>{t('an.compose.attach.empty')}</CommandEmpty>
                  <CommandGroup heading={t('an.compose.attach.window')}>
                    {WINDOW_PRESETS.map((preset) => (
                      <CommandItem
                        key={preset}
                        onSelect={() =>
                          attach({
                            context: { kind: 'window', window: { kind: 'preset', preset } },
                            label: t(`rb.preset.${preset}`),
                          })
                        }
                      >
                        {t(`rb.preset.${preset}`)}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  {picks.data && picks.data.reports.length > 0 && (
                    <CommandGroup heading={t('an.compose.attach.report')}>
                      {picks.data.reports.map((report) => (
                        <CommandItem
                          key={report.id}
                          value={report.name}
                          onSelect={() =>
                            attach({ context: { kind: 'report', id: report.id }, label: report.name })
                          }
                        >
                          <bdi>{report.name}</bdi>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {picks.data && picks.data.pages.length > 0 && (
                    <CommandGroup heading={t('an.compose.attach.page')}>
                      {picks.data.pages.map((page) => (
                        <CommandItem
                          key={page.id}
                          value={page.title}
                          onSelect={() => attach({ context: { kind: 'page', id: page.id }, label: page.title })}
                        >
                          <bdi>{page.title}</bdi>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {picks.data && picks.data.firings.length > 0 && (
                    <CommandGroup heading={t('an.compose.attach.firing')}>
                      {picks.data.firings.map((firing) => {
                        const label = formatDate(firing.firedAt, { style: 'day-month-time', language })
                        return (
                          <CommandItem
                            key={firing.id}
                            value={label}
                            onSelect={() => attach({ context: { kind: 'firing', id: firing.id }, label })}
                          >
                            {label}
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Button type="button" onClick={submit} disabled={!canAsk}>
            {t('an.compose.action.ask')}
          </Button>
        </div>

        {disabledReason !== null && <p className="text-xs text-muted-foreground">{disabledReason}</p>}
      </CardContent>
    </Card>
  )
}
