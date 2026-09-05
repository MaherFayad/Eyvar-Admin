/**
 * Canned responses for a composer (SUPPORT-UX-PLAN.md §7.3, S-9). The store is
 * Admin › Communications; only active templates declared for this surface are
 * offered, the ones hinted for the record's reason code first. Inserting fills
 * the field and sends nothing (§8.6.4).
 */

import { useState, type ReactNode } from 'react'
import { listMessagingTemplates } from '@/data/clients'
import type { MessagingTemplate, MessagingTemplateSurface } from '@/data/types/email'
import { useAsync } from '@/hooks'
import type { Translate } from '@/lib'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface TemplatePickerProps {
  surface: MessagingTemplateSurface
  reasonCode: string | null
  disabled?: boolean
  onInsert: (text: string) => void
  t: Translate
  /** The inbox composer's toolbar wants a ghost trigger (design 12 §5); the ticket form keeps secondary. */
  variant?: 'secondary' | 'ghost'
  /** Leads the label; the inbox passes `FileTextIcon`. */
  icon?: ReactNode
}

export function TemplatePicker({
  surface,
  reasonCode,
  disabled = false,
  onInsert,
  t,
  variant = 'secondary',
  icon = null,
}: TemplatePickerProps) {
  const [open, setOpen] = useState(false)
  const templates = useAsync<MessagingTemplate[]>(
    async (signal) => (await listMessagingTemplates({ pageSize: 200 }, signal)).items,
    { deps: [], enabled: open, cacheKey: 'messaging.templates' },
  )
  const offered = (templates.data ?? []).filter(
    (template) => template.status === 'active' && (template.surfaces ?? []).includes(surface),
  )
  const forReason = reasonCode === null ? [] : offered.filter((template) => template.reasonCode === reasonCode)
  const rest = offered.filter((template) => !forReason.includes(template))

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="xs" disabled={disabled}>
          {icon}
          {t('ticket.template.insert')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-64">
        {templates.status === 'loading' && (
          <DropdownMenuLabel className="font-normal text-muted-foreground">{t('ticket.template.loading')}</DropdownMenuLabel>
        )}
        {templates.status === 'error' && (
          <DropdownMenuLabel className="font-normal text-muted-foreground">{t('ticket.template.error')}</DropdownMenuLabel>
        )}
        {templates.data && offered.length === 0 && (
          <DropdownMenuLabel className="font-normal text-muted-foreground">{t('ticket.template.none')}</DropdownMenuLabel>
        )}
        {forReason.length > 0 && (
          <>
            <DropdownMenuLabel>{t('ticket.template.forReason')}</DropdownMenuLabel>
            {forReason.map((template) => (
              <TemplateItem key={template.id} template={template} onInsert={onInsert} />
            ))}
            {rest.length > 0 && <DropdownMenuSeparator />}
          </>
        )}
        {rest.length > 0 && (
          <>
            {forReason.length > 0 && <DropdownMenuLabel>{t('ticket.template.all')}</DropdownMenuLabel>}
            {rest.map((template) => (
              <TemplateItem key={template.id} template={template} onInsert={onInsert} />
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function TemplateItem({ template, onInsert }: { template: MessagingTemplate; onInsert: (text: string) => void }) {
  return (
    <DropdownMenuItem className="flex flex-col items-start gap-0.5" onSelect={() => onInsert(template.sampleText)}>
      <span className="text-sm text-foreground">{template.name}</span>
      <span className="line-clamp-2 text-xs text-muted-foreground">{template.sampleText}</span>
    </DropdownMenuItem>
  )
}
