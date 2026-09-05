/**
 * **The application review sheet** — the surface an operator actually decides
 * on, opened from the Applications queue against the list it came from.
 *
 * ```
 *  ┌──────────────────────────────────────────────────────┐
 *  │ APPLICATION 1 OF 7            [prev] [next] [close]  │
 *  │ Rakan Al-Otaibi                                      │
 *  │ APP-2205 · RIYADH · ECONOMY · APPLIED 21 JUN 16:30   │
 *  ├──────────────────────────────────────────────────────┤
 *  │ DRIVER DETAILS      Mobile / DOB / Address / Vehicle │
 *  │ SIGNALS             ● device shared with APP-2190    │
 *  │ DOCUMENTS · 2 OF 4  [licence] [ID] [istimara] [photo]│
 *  ├──────────────────────────────────────────────────────┤
 *  │ LICENCE STILL OPEN   [Reject] [Re-upload] [Approve]  │
 *  └──────────────────────────────────────────────────────┘
 * ```
 *
 * ## Why this is NOT the 360° profile layer
 *
 * `?entity=APP-2205` opens the profile layer, and the profile layer's own
 * header is explicit that **it commits nothing** — §6.2 gives it a plain link
 * and no primary. This surface commits three things, one of which mints a
 * captain record. Putting a decision bar inside a layer whose contract is
 * "consult only" would either break that contract or hide the decision behind
 * a second click on a page the operator has already left the queue to reach.
 *
 * §6.1 licenses exactly this: *a footer is present ONLY when the layer commits
 * something.* This one does, so it has one.
 *
 * ## Why it knows it is `1 of 7`
 *
 * Because reviewing applications is a **queue**, not a lookup. An operator
 * works the backlog top to bottom, and a surface that closes back to the table
 * after every decision costs a click, a scroll and the place they had got to.
 * The two controls step through **the rows the queue has loaded** — not the
 * whole backlog, which would need a cursor the list endpoint does not have —
 * and the position says so by counting the same rows.
 *
 * The step controls are disabled at the ends rather than wrapping. A queue that
 * silently returns to the top is one an operator finishes twice.
 *
 * ## §11.2, three times over
 *
 * Every control here is gated at RENDER and disabled in place with its reason:
 * `Approve captain` against `approvalRefusal`, which names the documents still
 * open; the two step controls against the ends of the list; the per-document
 * verdicts on their own tiles. Nothing is hidden, and nothing is checked at
 * commit — which is the systemic legacy defect this screen's own header
 * describes (`:10237`, `:11876`).
 *
 * Rules applied
 *   §6.1        one header, one footer, and the footer exists because the layer
 *               commits. The refusal sentence sits at the inline-START of it,
 *               beside the controls it explains.
 *   §5.5        a modal nested inside a drawer is forbidden — the reject form
 *               EXPANDS IN PLACE at the bottom of the sheet (§6.4).
 *   R3          one primary. `Approve captain` is it; `Reject` is the one red
 *               control R5a permits (a destructive button), and `Request
 *               re-upload` is secondary.
 *   O9          an absent value renders BLANK, never a dash.
 *   AC-73       `<bdi>` on every id, phone, IBAN and date run.
 */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  approveApplicant,
  rejectApplicant,
  requestApplicantDocumentReupload,
} from '@/data/clients'
import type { Applicant } from '@/data/types'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/StatusBadge'
import { CloseIcon, nextIcon, previousIcon, useIconDirection } from '@/components/icons'
import { InfoHint } from '@/components/InfoHint'
import { formatCount, formatDate, type Language, type Translate } from '@/lib'
import { cn } from '@/lib/utils'
import {
  DOC_STATUS_LABEL,
  DOC_STATUS_TONE,
  approvalRefusal,
  docLabelKey,
  documentsFor,
  firstUnreviewed,
  verifiedCount,
} from './documentReview'
import { BANK_STATUS_KEY } from './domain'

/** The applicant detail route (`fixtures/routeTable.ts`, `APPLICANT_DETAIL`). */
const DETAIL_PATH = '/operations/people/applications'

export interface ApplicationSheetProps {
  /** The row being reviewed. `null` closes the sheet. */
  applicant: Applicant | null
  /** The rows the queue has loaded, in the order it shows them. Drives `n of m`. */
  queue: readonly Applicant[]
  onSelect: (applicant: Applicant) => void
  onClose: () => void
  /** Applied to the row and to the queue, so a decision survives the sheet closing. */
  onUpdated: (applicant: Applicant) => void
  canWrite: boolean
  t: Translate
  language: Language
}

export function ApplicationSheet({
  applicant,
  queue,
  onSelect,
  onClose,
  onUpdated,
  canWrite,
  t,
  language,
}: ApplicationSheetProps) {
  /* T9.10 / O10 — the step controls are pager chevrons chosen by `dir` in code,
     never a font glyph and never mirrored with CSS. */
  const dir = useIconDirection()
  const PreviousIcon = previousIcon(dir)
  const NextIcon = nextIcon(dir)

  const [busy, setBusy] = useState(false)
  /* §5.5 / §6.4 — the reject form EXPANDS IN PLACE. A modal inside a drawer is
     forbidden, and this is the shape that rule licenses instead. */
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')

  const index = applicant === null ? -1 : queue.findIndex((row) => row.id === applicant.id)
  const previous = index > 0 ? queue[index - 1] : undefined
  const next = index >= 0 && index < queue.length - 1 ? queue[index + 1] : undefined

  const docs = useMemo(
    () => (applicant === null ? [] : documentsFor(applicant)),
    [applicant],
  )
  const unreviewed = applicant === null ? null : firstUnreviewed(applicant)

  const refusal =
    applicant === null ? null : approvalRefusal(applicant, applicant.status, canWrite, t)

  async function run(work: () => Promise<Applicant>, success: string) {
    setBusy(true)
    try {
      onUpdated(await work())
      toast.success(success)
    } catch {
      toast.error(t('applicant.doc.toast.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={applicant !== null}
      onOpenChange={(open) => {
        if (open) return
        setRejecting(false)
        setReason('')
        onClose()
      }}
    >
      <SheetContent
        /* The sheet renders its own close control inside the header row, beside
           the two step controls, so the stock one would be a second dismiss in
           a different place. */
        showCloseButton={false}
        className="w-drawer overflow-y-auto p-0"
      >
        {applicant !== null && (
          <>
            <header className="flex shrink-0 flex-col gap-2 border-b border-border px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-2xs font-medium tracking-widest text-muted-foreground uppercase">
                  <bdi>
                    {t('applicant.sheet.position', {
                      index: formatCount(index + 1, language),
                      total: formatCount(queue.length, language),
                    })}
                  </bdi>
                </p>
                <div className="flex items-center gap-1">
                  {/* §11.2 — disabled at the ends rather than wrapping. A queue
                      that silently returns to the top is one an operator
                      finishes twice. */}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    disabled={previous === undefined}
                    onClick={() => previous && onSelect(previous)}
                    aria-label={t('applicant.sheet.previous')}
                  >
                    <PreviousIcon aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    disabled={next === undefined}
                    onClick={() => next && onSelect(next)}
                    aria-label={t('applicant.sheet.next')}
                  >
                    <NextIcon aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={onClose}
                    aria-label={t('applicant.sheet.close')}
                  >
                    <CloseIcon aria-hidden="true" />
                  </Button>
                </div>
              </div>

              <h2 className="text-base font-semibold text-foreground">
                <bdi>{applicant.name}</bdi>
              </h2>
              {/* AC-75 — the same key the detail page's meta line renders. */}
              <p className="text-2xs tracking-wider text-muted-foreground uppercase">
                <bdi>
                  {t('applicant.meta', {
                    id: applicant.id,
                    city: applicant.city,
                    applied: formatDate(applicant.appliedAt, { style: 'day-month-time', language }),
                  })}
                </bdi>
              </p>
            </header>

            <div className="flex min-w-0 flex-1 flex-col gap-5 px-4 py-4">
              <Section title={t('applicant.review.driverDetails')}>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs compact:grid-cols-1">
                  <Pair label={t('applicant.phone')} value={<bdi>{applicant.phone}</bdi>} />
                  <Pair
                    label={t('applicant.dob')}
                    value={
                      <bdi>{formatDate(applicant.dateOfBirth, { style: 'day-month-year', language })}</bdi>
                    }
                  />
                  <Pair label={t('applicant.address')} value={<bdi>{applicant.address}</bdi>} />
                  <Pair
                    label={t('applicant.vehicleModel')}
                    value={
                      <bdi>
                        {t('applicant.vehiclePlate', {
                          vehicle: applicant.vehicle,
                          plate: applicant.plate,
                        })}
                      </bdi>
                    }
                  />
                  <Pair label={t('applicant.iban')} value={<bdi>{applicant.bank.iban}</bdi>} />
                  <Pair
                    label={t('applicant.bankStatus')}
                    value={
                      <StatusBadge
                        tone={applicant.bank.status === 'Verified' ? 'success' : 'warning'}
                      >
                        {/* X2 - the member is an English display string on the
                            record, so it printed Latin on an Arabic page. */}
                        {t(BANK_STATUS_KEY[applicant.bank.status])}
                      </StatusBadge>
                    }
                  />
                </dl>
              </Section>

              {/* T9.7 — `screeningDesc` explains what the three lines are for;
                  it changes nothing the operator does, so it is a hint (X15). */}
              <Section
                title={t('applicant.review.signals')}
                hint={<InfoHint t={t}>{t('applicant.screeningDesc')}</InfoHint>}
              >
                <Signals applicant={applicant} t={t} />
              </Section>

              <Section
                title={t('applicant.review.documents')}
                meta={t('applicant.review.progress', {
                  verified: formatCount(verifiedCount(applicant), language),
                  total: formatCount(docs.length, language),
                })}
                action={
                  unreviewed === null ? null : (
                    <Link
                      to={`${DETAIL_PATH}/${applicant.id}?doc=${unreviewed.type}`}
                      className="text-xs text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground"
                    >
                      {t('applicant.review.openFirst')}
                    </Link>
                  )
                }
              >
                <ul className="grid list-none grid-cols-2 gap-2 compact:grid-cols-1">
                  {docs.map((doc) => (
                    <li key={doc.id}>
                      {/* The tile is a LINK to the document's own page, because
                          a 480px drawer cannot show a scan at a size anybody
                          can read a licence number off. Deciding a document
                          happens where it can be seen. */}
                      <Link
                        to={`${DETAIL_PATH}/${applicant.id}?doc=${doc.type}`}
                        className="flex flex-col gap-1.5 rounded-lg border border-border p-2.5 hover:bg-muted"
                      >
                        <span className="text-xs font-medium text-foreground">
                          {t(docLabelKey(doc.type))}
                        </span>
                        <StatusBadge tone={DOC_STATUS_TONE[doc.status]}>
                          {t(DOC_STATUS_LABEL[doc.status])}
                        </StatusBadge>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>

              {/* §5.5 / §6.4 — the reject form expands here rather than opening
                  a modal over the drawer. T9.7 — what a rejection DOES is
                  explained beside the title; the field says what to type. */}
              {rejecting && (
                <Section
                  title={t('applicant.reject.title')}
                  hint={
                    <InfoHint t={t}>
                      {t('applicant.reject.desc', { name: applicant.name })}
                    </InfoHint>
                  }
                >
                  <Label htmlFor="application-reject-reason" className="text-xs">
                    {t('applicant.reject.reason')}
                  </Label>
                  <Input
                    id="application-reject-reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      variant="destructive"
                      size="xs"
                      disabled={busy || reason.trim() === ''}
                      onClick={() =>
                        void run(
                          () => rejectApplicant(applicant.id, reason.trim()),
                          t('applicant.toast.rejected', { id: applicant.id }),
                        ).then(() => {
                          setRejecting(false)
                          setReason('')
                        })
                      }
                    >
                      {t('applicant.confirmReject')}
                    </Button>
                    <Button variant="ghost" size="xs" onClick={() => setRejecting(false)}>
                      {t('applicant.sheet.close')}
                    </Button>
                  </div>
                </Section>
              )}
            </div>

            <footer className="sticky bottom-0 flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-popover px-4 py-3">
              {/* §11.2 — the reason sits BESIDE the control it explains, not in
                  a tooltip the keyboard cannot reach. */}
              <p
                id="application-approve-refusal"
                className="min-w-0 flex-1 text-xs text-muted-foreground"
              >
                {refusal ?? t('applicant.review.allVerified')}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="xs"
                  disabled={!canWrite || busy || applicant.status !== 'pending'}
                  onClick={() => setRejecting(true)}
                >
                  {t('applicant.action.reject')}
                </Button>
                <Button
                  variant="secondary"
                  size="xs"
                  disabled={!canWrite || busy || unreviewed === null || unreviewed.file === null}
                  onClick={() =>
                    unreviewed &&
                    void run(
                      () => requestApplicantDocumentReupload(applicant.id, unreviewed.type),
                      t('applicant.doc.toast.reupload', {
                        document: t(docLabelKey(unreviewed.type)),
                      }),
                    )
                  }
                >
                  {t('applicant.doc.reupload')}
                </Button>
                {/* R3's one primary, RENDERED and refused rather than removed.
                    An operator who cannot approve still needs to know that
                    approving is a thing this surface does. */}
                <Button
                  size="xs"
                  disabled={refusal !== null || busy}
                  aria-describedby="application-approve-refusal"
                  onClick={() =>
                    void run(
                      () => approveApplicant(applicant.id),
                      t('applicant.toast.approved', { id: applicant.id }),
                    )
                  }
                >
                  {t('applicant.action.approve')}
                </Button>
              </div>
            </footer>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

/* ─────────────────────────────── furniture ─────────────────────────────── */

function Section({
  title,
  meta,
  hint,
  action,
  children,
}: {
  title: string
  meta?: string
  /** X15 — the sentence that EXPLAINS the section, asked for beside its title. */
  hint?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-2xs font-medium tracking-widest text-muted-foreground uppercase">
          {title}
          {meta !== undefined && (
            <>
              <span aria-hidden="true"> · </span>
              <bdi>{meta}</bdi>
            </>
          )}
          {hint}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function Pair({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      {/* O9 — an absent value is blank, never a dash. */}
      <dd className="min-w-0 truncate font-medium text-foreground">{value}</dd>
    </div>
  )
}

/**
 * **The fraud-screening block** — what the application arrived from.
 *
 * `ApplicantDetailScreen`'s own header records why this matters: two
 * applications from one device, or two from one IP in a city neither applicant
 * lives in, is the signal the screening exists to find.
 *
 * Each line is a SENTENCE with a tone dot beside it, never a dot alone (§7.5).
 * The dot is `aria-hidden`; the sentence carries the reading.
 *
 * **The device and address signals are not on the record yet.** `Applicant`
 * carries `device`, `lastIp` and `ipLocation` and nothing that says whether
 * another application shares them — that is a cross-record query the list
 * endpoint does not answer. So only the third line is a real finding today, and
 * the first two state the fact rather than a conclusion. Reported to the data
 * owner as `GET /applications/:id/signals`.
 */
function Signals({ applicant, t }: { applicant: Applicant; t: Translate }) {
  const consistent = applicant.ipLocation.startsWith(applicant.city)
  return (
    <ul className="flex list-none flex-col gap-1.5 text-xs">
      <Signal tone="neutral">
        <bdi>{t('applicant.signal.device', { device: applicant.device })}</bdi>
      </Signal>
      <Signal tone="neutral">
        <bdi>{t('applicant.signal.address', { address: applicant.address })}</bdi>
      </Signal>
      <Signal tone={consistent ? 'ok' : 'warning'}>
        <bdi>
          {t(consistent ? 'applicant.signal.ip' : 'applicant.signal.ipMismatch', {
            location: applicant.ipLocation,
          })}
        </bdi>
      </Signal>
    </ul>
  )
}

function Signal({
  tone,
  children,
}: {
  tone: 'ok' | 'warning' | 'neutral'
  children: React.ReactNode
}) {
  return (
    <li className="flex items-start gap-2">
      <span
        aria-hidden="true"
        className={cn(
          'mt-1.5 size-1.5 shrink-0 rounded-full',
          tone === 'ok' && 'bg-chart-series',
          tone === 'warning' && 'bg-warning-graphic',
          tone === 'neutral' && 'bg-muted-foreground',
        )}
      />
      <span className="min-w-0 text-muted-foreground">{children}</span>
    </li>
  )
}
