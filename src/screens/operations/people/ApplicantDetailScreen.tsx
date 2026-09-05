/**
 * **The captain application, as a document review** —
 * `/operations/people/applications/:applicantId`.
 *
 * ```
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │ ← Rakan Al-Otaibi                        [Reject]  [Approve captain] │
 *  │   APP-2205 · Riyadh · Economy · Applied 21 Jun 16:30                 │
 *  ├────────────────────────────────────────────┬─────────────────────────┤
 *  │ [Driving licence] [National ID] [Vehicle…] │ DRIVER                  │
 *  │ [Profile photo]                            │ Full name / DOB / …     │
 *  │ ┌────────────────────────────────────────┐ │ APPLICATION             │
 *  │ │                                        │ │ Reference / Applied / … │
 *  │ │              the scan                  │ │ VEHICLE                 │
 *  │ │                                        │ │ PAYOUT                  │
 *  │ └────────────────────────────────────────┘ │                         │
 *  │ [Request re-upload] [Reject doc] [Verify]  │ MUST CLEAR BEFORE       │
 *  │ READ FROM THIS DOCUMENT                    │ APPROVAL                │
 *  │ Licence no. · Class · Expiry · Name        │ ☐ Licence verified …    │
 *  └────────────────────────────────────────────┴─────────────────────────┘
 * ```
 *
 * ## What this replaces, and why the old shape could not work
 *
 * It was a stack of five cards restating the record in `label: value` pairs —
 * everything an operator already knew, and **not the one thing they came for**.
 * A captain application is decided by looking at four scans and saying whether
 * each is what it claims to be, and the previous page could not show a scan at
 * all: `Applicant.docs` carried `{type, status, expiresOn}` and no file, so the
 * documents card was a list of words about pictures nobody could see.
 *
 * So the page is now the viewer, and the record is the rail beside it. Nothing
 * was lost — every field the card stack rendered is still here, in the rail or
 * in the document's own panel — and one thing was gained: the reviewer can read
 * the licence.
 *
 * ## `?doc=` is the selection, and it is in the URL on purpose
 *
 * The review sheet's `Open first unreviewed` and its four tiles all link
 * straight to a document, so the address has to name one. It also means a
 * reviewer can send a colleague *the licence on this application* rather than
 * *this application, click the third chip*. Absent, it falls to the first
 * document that still needs a decision — which is where a reviewer opening the
 * page cold wants to be.
 *
 * ## Three verdicts on ONE document, and one decision on the application
 *
 * They are deliberately different controls in different places. `Verify` /
 * `Reject document` / `Request re-upload` sit under the scan they are about and
 * write one row; `Approve captain` / `Reject application` sit in the page header
 * and end the application. Legacy conflated them — rejecting a document rejected
 * the applicant — which is why an applicant with a blurry photo was told they
 * had failed screening.
 *
 * Rules applied
 *   AC-36        four states, and `not-found` is its own (§9.2): the sentence
 *                names the id, so a typo is distinguishable from a deletion.
 *   §11.2        every control is gated at RENDER and disabled in place with its
 *                reason. `Approve captain` reads `approvalRefusal`, the one
 *                predicate the queue row and the review sheet also render from,
 *                so no operator reaches the server to be told no.
 *   R3           one primary — `Approve captain`. `Reject application` is the
 *                destructive button R5a permits, and nothing else is red.
 *   O9           an absent value renders BLANK, never a dash.
 *   AC-73        `<bdi>` on every id, phone, IBAN, plate and date run.
 *   AC-74/75     every string is a key in `./copy.ts` with named placeholders.
 */

import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  approveApplicant,
  getApplicant,
  rejectApplicant,
  rejectApplicantDocument,
  requestApplicantDocumentReupload,
  verifyApplicantDocument,
} from '@/data/clients'
import {
  APPLICANT_DOC_REJECTION_CODES,
  type Applicant,
  type ApplicantDoc,
  type ApplicantDocRejectionCode,
  type DocumentType,
} from '@/data/types'
import { useAsync } from '@/hooks'
import { formatCount, formatDate } from '@/lib'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { CheckIcon } from '@/components/icons'
import { InfoHint } from '@/components/InfoHint'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader } from '@/components/PageHeader'
import { DetailPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
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
import { Label } from '@/components/ui/label'
import { useShell } from '@/shell/ShellContext'
import { cn } from '@/lib/utils'
import { withFallback } from '../localCopy'
import { PEOPLE_EN } from './copy'
import { BANK_STATUS_KEY } from './domain'
import { DocumentScan } from './DocumentScan'
import {
  DOC_STATUS_LABEL,
  DOC_STATUS_TONE,
  approvalChecklist,
  approvalRefusal,
  docLabelKey,
  documentsFor,
  firstUnreviewed,
  verifiedCount,
} from './documentReview'

const QUEUE_PATH = '/operations/people?view=applications'

export function ApplicantDetailScreen() {
  const shell = useShell()
  const navigate = useNavigate()
  const { applicantId = '' } = useParams<{ applicantId: string }>()
  const [search, setSearch] = useSearchParams()
  /* AC-74 — the copy lives in `./copy.ts`. `withFallback` resolves keys the
     shell dictionary has not registered against that dictionary, so no English
     literal sits in this file. Memoised, and it is load-bearing: `withFallback`
     returns a NEW function on every call and `t` is carried in `deps`. */
  const t = useMemo(() => withFallback(shell.language.t, PEOPLE_EN), [shell.language.t])
  const { dir, language } = shell.language

  const applicant = useAsync<Applicant>(
    (signal) => getApplicant(applicantId, signal),
    { deps: [applicantId], cacheKey: 'applicants.get' },
  )

  /* The record the screen renders: the server's answer, shadowed by whatever a
     mutation on this page last returned. The mock clients are pure — a refetch
     returns the original row — so without this an operator verifies a licence,
     sees a toast, and watches the chip stay amber. */
  const [held, setHeld] = useState<Applicant | null>(null)
  const data = held ?? applicant.data ?? null

  const [busy, setBusy] = useState(false)
  const [rejectingApplication, setRejectingApplication] = useState(false)
  const [applicationReason, setApplicationReason] = useState('')
  const [rejectingDocument, setRejectingDocument] = useState<ApplicantDoc | null>(null)

  const canWrite = shell.permissions.permissions.includes('approve_drivers')

  const docs = useMemo(() => (data === null ? [] : documentsFor(data)), [data])
  /* `?doc=` names the selection. Absent — or naming a document this application
     does not have — it falls to the first that still needs a decision, which is
     where a reviewer opening the page cold wants to be. */
  const requested = search.get('doc')
  const active =
    docs.find((doc) => doc.type === requested) ??
    (data === null ? null : firstUnreviewed(data)) ??
    docs[0] ??
    null

  const selectDoc = (type: DocumentType) => {
    const next = new URLSearchParams(search)
    next.set('doc', type)
    setSearch(next, { replace: true })
  }

  const refusal = data === null ? null : approvalRefusal(data, data.status, canWrite, t)

  async function run(work: () => Promise<Applicant>, success: string) {
    setBusy(true)
    try {
      setHeld(await work())
      toast.success(success)
    } catch {
      toast.error(t('applicant.doc.toast.error'))
    } finally {
      setBusy(false)
    }
  }

  /* ── the three states before the record ──────────────────────────────── */

  if (applicant.status === 'loading' && data === null) {
    return (
      <DetailPage
        header={<PageHeader title={applicantId} onBack={() => navigate(-1)} t={t} dir={dir} />}
        main={<LoadingSkeleton pattern="P2" />}
        rail={[]}
      />
    )
  }

  /* **AC-36 — the READ failed, which is not the same fact as the record not
     existing.** The next action differs: retry here, check the id below. */
  if (applicant.status === 'error') {
    return (
      <DetailPage
        header={<PageHeader title={applicantId} onBack={() => navigate(-1)} t={t} dir={dir} />}
        main={
          <ErrorState
            scope="page"
            heading={t('state.pageError.title', { resource: applicantId })}
            message={t('state.pageError.body')}
            action={{ label: t('state.pageError.action'), onClick: applicant.refetch }}
          />
        }
        rail={[]}
      />
    )
  }

  if (data === null) {
    return (
      <DetailPage
        header={<PageHeader title={applicantId} onBack={() => navigate(-1)} t={t} dir={dir} />}
        main={
          <EmptyState
            kind="no-match"
            message={t('applicant.error.notFoundDesc', { id: applicantId })}
            action={{
              label: t('applicant.action.backToApplications'),
              onClick: () => navigate(QUEUE_PATH),
            }}
          />
        }
        rail={[]}
      />
    )
  }

  const record = data
  const checklist = approvalChecklist(record)

  return (
    <>
      <DetailPage
        header={
          <PageHeader
            title={record.name}
            /* AC-75 — one key with named parameters, never four fragments
               joined in code: the separator and the order are the translator's. */
            meta={
              <bdi>
                {t('applicant.meta', {
                  id: record.id,
                  city: record.city,
                  applied: formatDate(record.appliedAt, { style: 'day-month-time', language }),
                })}
              </bdi>
            }
            badges={
              <StatusBadge
                tone={
                  record.status === 'approved'
                    ? 'success'
                    : record.status === 'rejected' || record.status === 'withdrawn'
                      ? 'neutral'
                      : 'warning'
                }
              >
                {t(`people.applicantStatus.${statusKey(record.status)}`)}
              </StatusBadge>
            }
            onBack={() => navigate(QUEUE_PATH)}
            secondaryActions={[
              {
                label: t('applicant.action.reject'),
                onClick: () => setRejectingApplication(true),
                disabled: !canWrite || busy || record.status !== 'pending',
              },
            ]}
            /* §11.2 — R3's one primary, RENDERED and refused rather than
               removed. An operator who cannot approve still needs to know that
               approving is a thing this page does. */
            primaryAction={{
              label: t('applicant.action.approve'),
              onClick: () =>
                void run(
                  () => approveApplicant(record.id),
                  t('applicant.toast.approved', { id: record.id }),
                ),
              disabled: refusal !== null || busy,
            }}
            t={t}
            dir={dir}
          />
        }
        main={
          <div className="flex min-w-0 flex-col gap-4">
            {/* §11.2's sentence for the primary above. It is on the PAGE and
                not in a tooltip: a reason invisible until hover is unreachable
                by keyboard and by touch, and is heard by a screen reader as a
                label rather than as a reason. */}
            {refusal !== null && (
              <p className="text-xs text-muted-foreground">{refusal}</p>
            )}

            {/* The four chips. A chip is the document's name, its state as a
                dot, and it is a real button — the selection is the page's
                primary navigation and must be keyboard-reachable. */}
            <ul role="list" className="flex list-none flex-wrap gap-2">
              {docs.map((doc) => (
                <li key={doc.id}>
                  <button
                    type="button"
                    aria-current={active?.type === doc.type ? 'true' : undefined}
                    onClick={() => selectDoc(doc.type)}
                    className={cn(
                      'flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium',
                      active?.type === doc.type
                        ? 'border-foreground bg-card text-foreground'
                        : 'border-border text-muted-foreground hover:bg-muted',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'size-1.5 shrink-0 rounded-full',
                        doc.status === 'verified' && 'bg-chart-series',
                        doc.status === 'pending' && 'bg-warning-graphic',
                        (doc.status === 'rejected' || doc.status === 'missing') &&
                          'bg-muted-foreground',
                      )}
                    />
                    {t(docLabelKey(doc.type))}
                    {/* The state in WORDS as well as the dot (§7.5) — for a
                        screen reader, and for greyscale. */}
                    <span className="sr-only">{t(DOC_STATUS_LABEL[doc.status])}</span>
                  </button>
                </li>
              ))}
            </ul>

            {active !== null && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="flex items-center gap-1 text-sm font-semibold text-foreground">
                    {t(docLabelKey(active.type))}
                    {/* T9.7 — the reason a document was rejected explains the
                        badge beside it; it changes nothing the operator does
                        next, so it is asked for rather than read (X15). */}
                    <InfoHint t={t}>
                      {active.rejectionCode === null
                        ? null
                        : t('applicant.docReason.legend', {
                            reason: t(reasonKey(active.rejectionCode)),
                          })}
                    </InfoHint>
                  </h2>
                  <StatusBadge tone={DOC_STATUS_TONE[active.status]}>
                    {t(DOC_STATUS_LABEL[active.status])}
                  </StatusBadge>
                </div>

                <DocumentScan
                  doc={active}
                  label={t(docLabelKey(active.type))}
                  applicantName={record.name}
                  t={t}
                  language={language}
                />

                {/* The three verdicts on THIS document. Each is gated at render
                    against the one thing that can block it — nothing uploaded —
                    and the reason sits beside them. */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="xs"
                    disabled={!canWrite || busy || active.file === null}
                    onClick={() =>
                      void run(
                        () => requestApplicantDocumentReupload(record.id, active.type),
                        t('applicant.doc.toast.reupload', {
                          document: t(docLabelKey(active.type)),
                        }),
                      )
                    }
                  >
                    {t('applicant.doc.reupload')}
                  </Button>
                  {/* **Not destructive, and that is R5a rather than taste.**
                      Rejecting a DOCUMENT is reversible — the applicant uploads
                      another and the row goes back to `pending` — so it is not
                      the irreversible act the red button is reserved for. The
                      one red on this page is `Reject application`, which ends
                      the application, and R5a permits at most one red carrier. */}
                  <Button
                    variant="secondary"
                    size="xs"
                    disabled={!canWrite || busy || active.file === null}
                    onClick={() => setRejectingDocument(active)}
                  >
                    {t('applicant.doc.reject')}
                  </Button>
                  <Button
                    size="xs"
                    disabled={!canWrite || busy || active.file === null}
                    onClick={() =>
                      void run(
                        () => verifyApplicantDocument(record.id, active.type),
                        t('applicant.doc.toast.verified', {
                          document: t(docLabelKey(active.type)),
                        }),
                      )
                    }
                  >
                    {t('applicant.doc.verify')}
                  </Button>
                  {active.file === null && (
                    <span className="text-xs text-muted-foreground">
                      {t('applicant.doc.verifyRefusedNoFile')}
                    </span>
                  )}
                </div>

                {/* **The panel this page exists for.** What the CARD says,
                    beside what the application says — see the rail. The two are
                    deliberately not merged: a reviewer compares them. */}
                <section className="flex flex-col gap-2 rounded-lg border border-border p-3">
                  <h3 className="flex items-center gap-1 text-2xs font-medium tracking-widest text-muted-foreground uppercase">
                    {t('applicant.review.readFrom')}
                    {/* T9.7 — why the grid is empty, beside the title rather
                        than as a 12px paragraph under it (X15). */}
                    <InfoHint t={t}>
                      {active.readFields.length > 0
                        ? null
                        : t(
                            active.type === 'photo'
                              ? 'applicant.review.readNone'
                              : 'applicant.review.readNothing',
                          )}
                    </InfoHint>
                  </h3>
                  {active.readFields.length > 0 && (
                    <dl className="grid grid-cols-3 gap-x-4 gap-y-3 text-xs compact:grid-cols-2">
                      {active.readFields.map((field) => (
                        <div key={field.labelKey} className="flex min-w-0 flex-col gap-0.5">
                          <dt className="text-muted-foreground">{t(field.labelKey)}</dt>
                          <dd className="min-w-0 truncate font-medium tabular-nums text-foreground">
                            <bdi>{field.value}</bdi>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </section>
              </>
            )}
          </div>
        }
        /* AC-34 — the array IS the restack order below `--ev-bp-wide`. */
        rail={[
          /* **The checklist is the rail's FIRST card (X1).** It is the answer
             to *can I approve this yet*, derived from the same predicate the
             header's primary is disabled by, so the two cannot disagree; last
             in the rail it sat at y=1140 on a 800px viewport, below the fold
             and below the button it explains. */
          <RailCard
            key="checklist"
            title={t('applicant.check.heading')}
            meta={t('applicant.review.progress', {
              verified: formatCount(verifiedCount(record), language),
              total: formatCount(docs.length, language),
            })}
          >
            <ul role="list" className="flex list-none flex-col gap-1.5 text-xs">
              {checklist.map((check) => (
                <li key={check.id} className="flex items-start gap-2">
                  {/* A box and a tick, not a colour: §7.5, and it survives
                      greyscale. T9.10 — the registry's `Check`, at the box and
                      glyph sizes `ui/checkbox.tsx` already uses, so no
                      arbitrary radius or type size is needed. `aria-hidden`
                      because the row says `done` in its own text beside it. */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-sm border',
                      check.done
                        ? 'border-chart-series bg-chart-series text-card'
                        : 'border-border',
                    )}
                  >
                    {check.done && <CheckIcon className="size-3" />}
                  </span>
                  <span className={check.done ? 'text-muted-foreground' : 'text-foreground'}>
                    {t(check.labelKey, {
                      document:
                        check.documentType === undefined
                          ? ''
                          : t(docLabelKey(check.documentType)),
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </RailCard>,

          <RailCard key="driver" title={t('applicant.personalDetails')}>
            <Pair label={t('applicant.nationalId')} value={<bdi>{record.nationalId}</bdi>} />
            <Pair
              label={t('applicant.dob')}
              value={<bdi>{formatDate(record.dateOfBirth, { style: 'day-month-year', language })}</bdi>}
            />
            <Pair label={t('applicant.phone')} value={<bdi>{record.phone}</bdi>} />
            <Pair label={t('applicant.email')} value={record.email ?? null} />
            <Pair label={t('applicant.address')} value={<bdi>{record.address}</bdi>} />
            <Pair label={t('applicant.gender')} value={record.gender} />
            <Pair label={t('applicant.appLanguage')} value={record.appLanguage} />
          </RailCard>,

          <RailCard key="application" title={t('applicant.outcome')}>
            <Pair label={t('applicant.appliedAt')} value={<bdi>{formatDate(record.appliedAt, { style: 'day-month-time', language })}</bdi>} />
            <Pair label={t('applicant.city')} value={record.city} />
            <Pair label={t('applicant.vehicleClass')} value={record.vehicleClass} />
            <Pair label={t('applicant.device')} value={<bdi>{record.device}</bdi>} />
            <Pair label={t('applicant.lastIp')} value={<bdi>{record.lastIp}</bdi>} />
            <Pair label={t('applicant.ipLocation')} value={record.ipLocation} />
            {record.approvedDriverId !== null && (
              <Pair
                label={t('applicant.approvedDriver')}
                value={
                  /* P8-T1 — the captain this applicant became is a real link
                     into the 360° layer, not a code to copy out. */
                  <Link
                    to={`/entity/${record.approvedDriverId}`}
                    className="underline decoration-border underline-offset-2 hover:decoration-foreground"
                  >
                    <bdi>{record.approvedDriverId}</bdi>
                  </Link>
                }
              />
            )}
            {record.rejectionReason !== null && (
              <Pair label={t('applicant.rejectionReason')} value={record.rejectionReason} />
            )}
          </RailCard>,

          <RailCard key="vehicle" title={t('applicant.vehicleDetails')}>
            <Pair label={t('applicant.vehicleModel')} value={<bdi>{record.vehicle}</bdi>} />
            <Pair label={t('applicant.plate')} value={<bdi>{record.plate}</bdi>} />
          </RailCard>,

          <RailCard key="payout" title={t('applicant.bankDetails')}>
            <Pair label={t('applicant.bankName')} value={record.bank.bankName} />
            <Pair label={t('applicant.iban')} value={<bdi>{record.bank.iban}</bdi>} />
            <Pair
              label={t('applicant.bankStatus')}
              value={
                <StatusBadge tone={record.bank.status === 'Verified' ? 'success' : 'warning'}>
                  {t(BANK_STATUS_KEY[record.bank.status])}
                </StatusBadge>
              }
            />
          </RailCard>,

        ]}
      />

      {/* The APPLICATION's rejection — a dialog, because this is a page and a
          page may open one. The DOCUMENT's rejection is the second dialog
          below; they are separate because they end different things. */}
      <Dialog open={rejectingApplication} onOpenChange={setRejectingApplication}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('applicant.reject.title')}</DialogTitle>
            <DialogDescription>
              {t('applicant.reject.desc', { name: record.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="applicant-reject-reason">{t('applicant.reject.reason')}</Label>
            <Input
              id="applicant-reject-reason"
              value={applicationReason}
              onChange={(event) => setApplicationReason(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectingApplication(false)}>
              {t('applicant.sheet.close')}
            </Button>
            <Button
              variant="destructive"
              disabled={busy || applicationReason.trim() === ''}
              onClick={() =>
                void run(
                  () => rejectApplicant(record.id, applicationReason.trim()),
                  t('applicant.toast.rejected', { id: record.id }),
                ).then(() => {
                  setRejectingApplication(false)
                  setApplicationReason('')
                })
              }
            >
              {t('applicant.confirmReject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* One DOCUMENT's rejection. A closed set of reasons, never free text —
          `types/applicant.ts` argues it: a code can be counted, filtered and
          translated, and the applicant is told why in their own language. */}
      <Dialog
        open={rejectingDocument !== null}
        onOpenChange={(open) => !open && setRejectingDocument(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('applicant.doc.rejectTitle')}</DialogTitle>
            <DialogDescription>{t('applicant.doc.rejectDesc')}</DialogDescription>
          </DialogHeader>
          <ul role="list" className="flex list-none flex-col gap-1">
            {APPLICANT_DOC_REJECTION_CODES.map((reason) => (
              <li key={reason.key}>
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  disabled={busy}
                  onClick={() => {
                    const doc = rejectingDocument
                    if (doc === null) return
                    void run(
                      () => rejectApplicantDocument(record.id, doc.type, reason.key),
                      t('applicant.doc.toast.rejected', {
                        document: t(docLabelKey(doc.type)),
                      }),
                    ).then(() => setRejectingDocument(null))
                  }}
                >
                  {t(reason.labelKey)}
                </Button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ─────────────────────────────── furniture ─────────────────────────────── */

function RailCard({
  title,
  meta,
  children,
}: {
  title: string
  meta?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-2xs font-medium tracking-widest text-muted-foreground uppercase">
          {title}
        </h2>
        {meta !== undefined && (
          <span className="text-2xs tabular-nums text-muted-foreground">
            <bdi>{meta}</bdi>
          </span>
        )}
      </div>
      <dl className="flex flex-col gap-2 text-xs">{children}</dl>
    </section>
  )
}

/** A label over its value. O9 — an absent value is BLANK, never a dash. */
function Pair({ label, value }: { label: string; value: React.ReactNode | null }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-foreground">{value}</dd>
    </div>
  )
}

/** `ApplicantStatus` → the suffix `people.applicantStatus.*` uses. */
function statusKey(status: Applicant['status']): string {
  return status === 'in-review' ? 'inReview' : status
}

/** `ApplicantDocRejectionCode` → its label key, from the declared set. */
function reasonKey(code: ApplicantDocRejectionCode): string {
  return APPLICANT_DOC_REJECTION_CODES.find((r) => r.key === code)?.labelKey ?? 'applicant.docReason.unclear'
}
