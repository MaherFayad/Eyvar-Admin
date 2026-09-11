/**
 * Naming and saving a report — §9.3, AC-856 … AC-859.
 *
 * ## A failed save never closes the dialog it came from
 *
 * `saveReport` returns `{ status: 'invalid', reasons }` for validation and
 * **throws** only for transport, and the difference is load-bearing: an invalid
 * name is a domain answer the dialog renders in place with the operator's input
 * intact, while `?mockFail=reports.save` is a transport failure that also
 * leaves the dialog open with the name and description preserved (**AC-859**).
 * Neither closes anything, and neither discards what was typed.
 *
 * ## Disabled, not errored
 *
 * `Save` is off until a name exists, and **the disabled state carries no error
 * text** (**AC-856**). DESIGN.md §3.2: *"validate by disabling the primary
 * button, not by showing an error after submit."* An operator who has typed
 * nothing yet has not made a mistake.
 *
 * ## `Save` and `Save as` are distinguishable before the click
 *
 * **AC-858.** The dialog's own title says which one this is, and the button
 * repeats it. The distinction is `id: null` versus `id: report.id` in the input
 * — two calls, not a mode — so nothing here has to remember which branch it is
 * in after the fact.
 *
 * ## The consequence is named under the control (Amplitude B1, principle 6)
 *
 * `Only me` / `The team` name a SETTING. They do not say what the setting does,
 * and "who can see it" is exactly the question an operator is asking at the
 * moment they choose. Each option now carries its consequence as a
 * `FieldDescription` — real text, in the accessibility tree, bound to the radio
 * through `aria-describedby`, which `FieldControl` supplies.
 *
 * **Not a tooltip**, for the reason `LegalityOptions.tsx` already records: a
 * tooltip opens on hover or focus, so a reason nobody has hovered is a reason
 * nobody can read, and on a disabled control it can never open at all. Sighted
 * and screen-reader operators get the same sentence from the same node.
 *
 * The dialog's DESCRIPTION was the same defect one level up: it rendered
 * `rb.save.visibility`, the visibility LEGEND, so the sentence under the title
 * read *"Who can see it"* — a label doing a description's job. It has its own
 * key now (`rb.save.describe`), and the legend keeps the one it names.
 *
 * ## Pinning at save time, and the partial outcome that comes with it
 *
 * §B1's `Add to Report`. Pinning used to be one-directional — only from the
 * dashboard side, and only for a report that was already saved — so naming a
 * report and putting it where people look at it were two journeys through two
 * screens. The picker here is **optional and defaults to not-pinned**, and it
 * needs no new endpoint: `saveDashboard` writes the whole tile list and
 * renormalises `order`, which is the same call `DashboardDetailScreen` makes
 * from the other direction.
 *
 * **Two mutations means an outcome neither one describes.** If `saveReport`
 * succeeds and `saveDashboard` fails, *the report is saved* — and the two
 * things this must never do are roll the save back and report the whole thing
 * as failed. So `pin()` owns its own `catch` and returns a boolean rather than
 * throwing into the transport branch above it, where `rb.save.failed`
 * (*"Nothing was changed"*) would be a lie. The partial outcome is stated in
 * full — *"The report was saved. It wasn't added to the dashboard."* — on the
 * surface where the only action that resolves it lives, which is this one: the
 * operator can pick another board and try again. §8.3, and this file's own rule
 * above: a failed mutation does not close the surface it came from.
 *
 * A retry must not create a SECOND report. `saved` holds what the first
 * successful call returned and feeds its id back into the next `saveReport`, so
 * the retry UPDATES in place and anything edited in between is carried with it
 * rather than silently dropped. And because the record exists whatever the
 * operator does next, `Cancel` after a partial success reports it as saved
 * instead of leaving the builder believing it still holds a draft.
 *
 * Rules applied
 *   §11.6/R10   a modal for a decision that blocks; no toast underneath it, so
 *               one event has one surface.
 *   §3.2        the primary is disabled while the form cannot be submitted.
 *   §7.2        the name field takes focus on open and every control has a
 *               visible ring.
 *   §11.3       the picker carries its own four states. It is optional, so none
 *               of them may block the save.
 *   R3          one primary in the dialog.
 */

import { useEffect, useState } from 'react'
import { CloseIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Field,
  FieldContent,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { useAsync } from '@/hooks'
import { listPages, savePage, saveReport } from '@/data/clients'
import { REPORT_NAME_MAX, reportTags } from '@/data/types'
import type { ReportQuery, SaveInvalidReason, SavedReport } from '@/data/types'
/* Not yet in the `@/data/types` barrel — `pages.ts` itself imports the same
   way. Flagged in the handoff for whoever owns that barrel next. */
import { PAGE_BLOCK_MAX, type Page } from '@/data/types/page'
import { isolatedRunProps, type Translator } from '@/lib'

export interface SaveReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `null` creates. A value updates in place. */
  report: SavedReport | null
  /**
   * **What the header's inline title and description already hold** (§A5).
   *
   * The builder's title block is editable in place and commits nothing — this
   * module runs on explicit commits and a name is no exception. So the draft
   * travels here and seeds the fields, and the operator does not type the same
   * name twice. `undefined` (not `null`) means *no draft*, and the dialog falls
   * back to the record's own values exactly as it always did.
   */
  draftName?: string
  draftDescription?: string
  query: ReportQuery
  onSaved: (report: SavedReport) => void
  t: Translator
}

/**
 * The not-pinned choice, and it is the default.
 *
 * A sentinel rather than `''`: Radix reserves the empty string for "no value
 * chosen", which would render the placeholder instead of the sentence that says
 * what not choosing means. Not adding it to a dashboard is a decision an
 * operator makes, so it is an option they can read and re-select.
 */
const NO_DASHBOARD = 'none'

export function SaveReportDialog({
  open,
  onOpenChange,
  report,
  draftName,
  draftDescription,
  query,
  onSaved,
  t,
}: SaveReportDialogProps) {
  const [name, setName] = useState(draftName ?? report?.name ?? '')
  const [description, setDescription] = useState(draftDescription ?? report?.description ?? '')
  const [visibility, setVisibility] = useState<SavedReport['visibility']>(
    report?.visibility ?? 'private',
  )
  const [pageId, setPageId] = useState<string>(NO_DASHBOARD)
  /** §8 — free-text, operator-set. `tagDraft` is the field's own uncommitted text. */
  const [tags, setTags] = useState<string[]>(reportTags(report ?? {}))
  const [tagDraft, setTagDraft] = useState('')
  const [reasons, setReasons] = useState<readonly SaveInvalidReason[]>([])
  const [failed, setFailed] = useState(false)
  /** What the last successful `saveReport` returned. `null` until there is one. */
  const [saved, setSaved] = useState<SavedReport | null>(null)
  const [pinFailed, setPinFailed] = useState(false)
  const [saving, setSaving] = useState(false)

  /* Read only while the dialog is open — a picker nobody has opened should not
     cost a request on every builder render. `deps: [open]` keeps the cache key
     distinct from `DashboardsView`'s, which is keyed by its table params.
     D46/§8 — `Dashboard` is gone; a dashboard is a `Page` of `kind: 'dashboard'`
     now, and the picker offers those, never a `case-study` or a `note`. */
  const pages = useAsync(
    (signal) =>
      listPages({ pageSize: 100, filters: [{ field: 'kind', op: 'eq', value: 'dashboard' }] }, signal),
    {
      deps: [open],
      enabled: open,
      cacheKey: 'pages.list.dashboard',
      isEmpty: (result) => result.items.length === 0,
    },
  )

  /* Re-seed when the dialog opens against a different record. Not on every
     render: that would overwrite what the operator is typing. */
  useEffect(() => {
    if (!open) return
    setName(draftName ?? report?.name ?? '')
    setDescription(draftDescription ?? report?.description ?? '')
    setVisibility(report?.visibility ?? 'private')
    setPageId(NO_DASHBOARD)
    setTags(reportTags(report ?? {}))
    setTagDraft('')
    setReasons([])
    setFailed(false)
    setSaved(null)
    setPinFailed(false)
    /* **Keyed on `open`, not on the draft.** Re-seeding while the operator is
       typing in the dialog would overwrite what they are typing with what the
       header holds. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, report])

  /**
   * Add the report to the page as one more `ReportBlock`, and **never throw**
   * — a throw here would land in the transport `catch` below and render
   * `rb.save.failed` about a report that WAS saved (D9 partial-outcome rule).
   */
  const pin = async (page: Page, record: SavedReport): Promise<boolean> => {
    if (page.blocks.length >= PAGE_BLOCK_MAX) return false
    try {
      const outcome = await savePage({
        id: page.id,
        kind: page.kind,
        /* Sent whole, and unchanged — `SavePageInput` is a full replace, the
           same contract `saveDashboard` used to have for its tile list. */
        title: page.title,
        icon: page.icon,
        description: page.description,
        visibility: page.visibility,
        tags: page.tags,
        scope: page.scope,
        blocks: [
          ...page.blocks,
          {
            id: `RPB-${page.id}-${record.id}`,
            type: 'report',
            reportId: record.id,
            view: 'chart',
            height: 'M',
            /* A display fallback ONLY, for a block whose report has vanished
               (AC-869's tile parallel). The block stores a reference, never a
               copy. */
            title: record.name,
          },
        ],
        version: page.version,
      })
      return outcome.status === 'saved'
    } catch {
      return false
    }
  }

  const submit = async () => {
    setSaving(true)
    setFailed(false)
    setPinFailed(false)
    setReasons([])
    try {
      const outcome = await saveReport({
        /* `saved?.id` is what makes a retry after a failed pin an UPDATE rather
           than a second report with the same name. */
        id: report?.id ?? saved?.id ?? null,
        name,
        description: description.trim() === '' ? null : description,
        query,
        visibility,
        tags,
      })
      if (outcome.status === 'invalid') {
        setReasons(outcome.reasons)
        return
      }
      setSaved(outcome.report)

      const page = pages.data?.items.find((row) => row.id === pageId) ?? null
      if (page !== null && !(await pin(page, outcome.report))) {
        /* The report is saved. Stated in full, here, where picking another
           board and trying again is one click away. */
        setPinFailed(true)
        return
      }

      onSaved(outcome.report)
    } catch {
      /* Transport, and `saveReport`'s alone — `pin` cannot reach this branch.
         The dialog stays open and the input is preserved (AC-859). */
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  /**
   * Closing after a successful save reports it, whatever the pin did.
   *
   * Otherwise `Cancel` on the partial outcome would leave the builder holding a
   * draft it has already written, and the next save would create a duplicate.
   */
  const close = () => {
    if (saved !== null) {
      onSaved(saved)
      return
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent size="default">
        <DialogHeader>
          <DialogTitle>{report ? t('rb.save.title') : t('rb.saveAs.title')}</DialogTitle>
          <DialogDescription>{t('rb.save.describe')}</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field id="rb-save-name">
            <FieldLabel>{t('rb.save.name')}</FieldLabel>
            <FieldControl>
              <Input
                autoFocus
                maxLength={REPORT_NAME_MAX}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </FieldControl>
          </Field>

          <Field id="rb-save-description">
            <FieldLabel optional={t('field.optional')}>{t('rb.save.description')}</FieldLabel>
            <FieldControl>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </FieldControl>
          </Field>

          {/* §8 — free-text tags, the library's own filter facet. `Enter` or a
              comma commits the draft as a chip; the chip's own button removes it
              (§12.1 forbids an interactive `Badge`, so this is a plain span). */}
          <Field id="rb-save-tags">
            <FieldLabel optional={t('field.optional')}>{t('rb.save.tags')}</FieldLabel>
            {tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex h-control items-center gap-1 rounded-lg border border-border-control bg-card ps-2 pe-1 text-sm text-foreground"
                  >
                    <bdi>{tag}</bdi>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="size-5"
                      aria-label={t('rb.save.tags.remove', { tag })}
                      onClick={() => setTags((current) => current.filter((each) => each !== tag))}
                    >
                      <CloseIcon aria-hidden="true" className="size-3" />
                    </Button>
                  </span>
                ))}
              </div>
            )}
            <FieldControl>
              <Input
                value={tagDraft}
                onChange={(event) => setTagDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ',') return
                  event.preventDefault()
                  const next = tagDraft.trim()
                  if (next !== '' && !tags.includes(next)) setTags((current) => [...current, next])
                  setTagDraft('')
                }}
                placeholder={t('rb.save.tags.placeholder')}
              />
            </FieldControl>
          </Field>

          <FieldSet>
            <FieldLegend>{t('rb.save.visibility')}</FieldLegend>
            <RadioGroup
              value={visibility}
              onValueChange={(value) => setVisibility(value as SavedReport['visibility'])}
            >
              {/* The consequence sits under the option it belongs to, and
                  `FieldControl` points the radio's `aria-describedby` at it. */}
              <Field id="rb-vis-private" orientation="horizontal">
                <FieldControl>
                  <RadioGroupItem value="private" />
                </FieldControl>
                <FieldContent>
                  <FieldLabel>{t('rb.save.visibility.private')}</FieldLabel>
                  <FieldDescription>
                    {t('rb.save.visibility.private.consequence')}
                  </FieldDescription>
                </FieldContent>
              </Field>
              <Field id="rb-vis-team" orientation="horizontal">
                <FieldControl>
                  <RadioGroupItem value="team" />
                </FieldControl>
                <FieldContent>
                  <FieldLabel>{t('rb.save.visibility.team')}</FieldLabel>
                  <FieldDescription>{t('rb.save.visibility.team.consequence')}</FieldDescription>
                </FieldContent>
              </Field>
            </RadioGroup>
          </FieldSet>

          {/* Optional, and its four states are the four states of a control that
              may not block the primary: none of them disables `Save`. */}
          <Field id="rb-save-dashboard">
            {/* `FieldLabel` only where there is a control for it to point at.
                The other three states carry no `<select>`, and a `for` that
                resolves to nothing is a label a screen reader drops. */}
            {pages.status === 'content' ? (
              <FieldLabel optional={t('field.optional')}>{t('rb.save.addTo')}</FieldLabel>
            ) : (
              <FieldTitle>{t('rb.save.addTo')}</FieldTitle>
            )}
            {pages.status === 'loading' ? (
              <LoadingSkeleton pattern="P1" rows={1} label={t('rb.save.addTo.loading')} />
            ) : pages.status === 'error' ? (
              <ErrorState
                scope="card"
                card={false}
                message={t('rb.save.addTo.error')}
                action={{ label: t('rb.save.addTo.error.retry'), onClick: pages.refetch }}
              />
            ) : pages.status === 'empty' ? (
              <FieldDescription>{t('rb.save.addTo.empty')}</FieldDescription>
            ) : (
              <Select value={pageId} onValueChange={setPageId}>
                <FieldControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FieldControl>
                <SelectContent>
                  <SelectItem value={NO_DASHBOARD}>{t('rb.save.addTo.none')}</SelectItem>
                  {(pages.data?.items ?? []).map((page) => (
                    <SelectItem key={page.id} value={page.id}>
                      {/* Operator-authored, so it is a bidi run of its own —
                          an Arabic page title in an English list, or the
                          reverse, must not reorder the sentence around it. */}
                      <bdi {...isolatedRunProps().run}>{page.title}</bdi>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>

          {/* Domain validation, in place, with the input intact.

              §10.4 — these used to render at `--ev-text-2`, which is the HELPER
              tone. A blocking reason drawn in the same ink as a hint is colour
              carrying no meaning at all; `FieldError` gives it the red and the
              glyph, and the glyph is the carrier that survives a monochrome
              screen. */}
          <FieldError errors={reasons.map((reason) => ({
            message: t(`rb.save.invalid.${reason}`, { max: REPORT_NAME_MAX }),
          }))} />
          {failed ? <FieldError>{t('rb.save.failed')}</FieldError> : null}
          {/* Half of this succeeded, so it is not drawn as a failure: a standing
              statement of what is now true, in the helper tone, naming both
              halves in the order they happened. */}
          {pinFailed ? (
            <p role="status" className="text-sm text-muted-foreground">
              {t('rb.save.addTo.failed')}
            </p>
          ) : null}
        </FieldGroup>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={close}>
            {t('rb.save.cancel')}
          </Button>
          {/* §3.2 — disabled while the form cannot be submitted, and carrying no
              error text while it is (AC-856). After a partial success it says
              what pressing it will do now, which is not "save" again. */}
          <Button
            type="button"
            variant="default"
            disabled={saving || name.trim() === ''}
            onClick={() => void submit()}
          >
            {pinFailed ? t('rb.save.addTo.failed.retry') : t('rb.save.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
