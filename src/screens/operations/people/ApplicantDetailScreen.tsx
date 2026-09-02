/**
 * **The captain application record** — `/operations/people/applications/:id`.
 *
 * ## What was missing, and why the gap mattered
 *
 * `Applicant` carries 29 fields. This pane rendered **13**, and the sixteen it
 * dropped were not incidental: `device`, `lastIp`, `ipLocation`, `movementLog`
 * and `claim`.
 *
 * **This is the fraud-screening surface.** Two applications from one device, or
 * two from one IP in a city neither applicant lives in, is the signal the
 * screening exists to find — and it was the one thing an operator could not
 * see. `movementLog` is the same fact over time. `claim` is worse in a
 * different way: §4.2's whole ownership contract is that an operator can tell
 * whether somebody else is already working an item, and this pane, the surface
 * where the decision is actually taken, showed nothing.
 *
 * The other eleven — `email`, `address`, `gender`, `hasPhoto`, `appLanguage`,
 * `acceptedTrips`, `cancelledTrips`, `approvedDriverId`, `rejectionReason`,
 * `decidedAt`, `decidedByUserId` — are the record's own outcome and its
 * contact detail, and half of them only exist *after* a decision, which is
 * exactly when somebody comes back to read the page.
 *
 * ## The other three fixes
 *
 * **`not-found` was collapsed into `error`.** `applicant.status === 'error' ||
 * !data` rendered *"Application not found"* for a failed READ as well as for a
 * missing record, so a network failure told the operator the application did
 * not exist. They are different facts with different next actions — retry, or
 * check the id — and §11.2 gives them different states. All four are now here.
 *
 * **§11.2 — the decision bar was HIDDEN.** `canWrite && status === 'pending'`
 * removed `Approve` and `Reject` from the page entirely, so an operator without
 * `approve_drivers` saw a read-only record with no sign that deciding is a
 * thing this page does, and one looking at a decided application saw the same.
 * Both render now, disabled, with the reason — which is also how the page
 * states the decision that was already taken.
 *
 * **P8-T1** — `approvedDriverId` is the captain this applicant became, and it
 * is a real link into the 360° layer.
 *
 * Rules applied
 *   AC-36        four states, and `not-found` is its own (§9.2).
 *   §11.2        every action is gated at RENDER and disabled in place with its
 *                reason. Never hidden, never checked at commit.
 *   R5a          `Reject` is a destructive button, which is red use (1) of the
 *                four R5a permits. Nothing else on the page is red.
 *   §8.3.1       `—` is not-applicable only. `0` accepted trips is a real zero
 *                and reads as `0`.
 *   AC-73        `<bdi>` on the numeric and date runs.
 */

import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { approveApplicant, getApplicant, rejectApplicant } from '@/data/clients/applicants'
import type { Applicant } from '@/data/types'
import { useAsync } from '@/hooks'
import { ABSENT, formatCount, formatDate } from '@/lib'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader } from '@/components/PageHeader'
import { DetailPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'
import { withFallback } from '../localCopy'
import { PEOPLE_EN } from './copy'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/EmptyState'
import { CheckCircle2, FileCheck, Fingerprint, MapPin, ShieldAlert, UserCheck, XCircle, Car, CreditCard } from 'lucide-react'

export function ApplicantDetailScreen() {
  const shell = useShell()
  const navigate = useNavigate()
  const { applicantId = '' } = useParams<{ applicantId: string }>()
  /* AC-74 - the copy lives in `./copy.ts`. `withFallback` resolves keys the
     shell dictionary has not registered yet against that dictionary, so no
     English literal sits in this file. See `../localCopy`. */
  const t = useMemo(
    /* **Memoised, and it is load-bearing.** `withFallback` returns a NEW
       function on every call, and several screens carry `t` in a `deps`
       array — so an unmemoised wrapper re-ran the fetch, which re-rendered,
       which rebuilt the wrapper. Two suites hung outright. */
    () => withFallback(shell.language.t, PEOPLE_EN),
    [shell.language.t],
  )
  const { dir, language } = shell.language

  const applicant = useAsync<Applicant>(
    (signal) => getApplicant(applicantId, signal),
    /* `applicantId` is the fetcher's only input; a decision is held in
       `localStatus`, which shadows a warm entry. */
    { deps: [applicantId], cacheKey: 'applicants.get' }
  )

  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [localStatus, setLocalStatus] = useState<Applicant['status'] | null>(null)

  const data = applicant.data
  const currentStatus = localStatus ?? data?.status ?? 'pending'
  const canWrite = shell.permissions.permissions.includes('approve_drivers')

  /**
   * §11.2 — one sentence per refusal, and the control renders disabled beside
   * it rather than disappearing. The role refusal outranks the state one (D17):
   * telling an operator *this is already approved* when the real answer is
   * *you may not approve anything* wastes their time twice.
   */
  const decisionRefusal =
    !canWrite
      ? t('people.action.noPermission')
      : currentStatus !== 'pending'
        ? t('applicant.action.decided', { status: currentStatus })
        : null

  const handleApprove = async () => {
    if (!data) return
    setBusy(true)
    try {
      await approveApplicant(data.id)
      setLocalStatus('approved')
      toast.success(t('applicant.toast.approved', { id: data.id }))
    } catch {
      toast.error(t('applicant.toast.approveError'))
    } finally {
      setBusy(false)
    }
  }

  const handleRejectConfirm = async () => {
    if (!data || !rejectReason.trim()) return
    setBusy(true)
    try {
      await rejectApplicant(data.id, rejectReason.trim())
      setLocalStatus('rejected')
      setRejectModalOpen(false)
      toast.success(t('applicant.toast.rejected', { id: data.id }))
    } catch {
      toast.error(t('applicant.toast.rejectError'))
    } finally {
      setBusy(false)
    }
  }

  if (applicant.status === 'loading') {
    return (
      <DetailPage
        header={<PageHeader title={applicantId} onBack={() => navigate(-1)} t={t} dir={dir} />}
        main={<LoadingSkeleton pattern="P2" />}
        rail={[]}
      />
    )
  }

  /* **AC-36 — the READ failed, which is not the same fact as the record not
     existing.** This branch used to be `error || !data` and rendered
     *"Application not found"* for both, so a dropped connection told the
     operator the application does not exist. The next action differs: retry
     here, check the id below. */
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

  /* §9.2 — the record is not on file. The sentence NAMES the id that was looked
     for, so a typo is distinguishable from a deletion, and the action goes back
     to the queue rather than offering a retry that cannot help. */
  if (!data) {
    return (
      <DetailPage
        header={<PageHeader title={applicantId} onBack={() => navigate(-1)} t={t} dir={dir} />}
        main={
          <EmptyState
            kind="no-match"
            message={t('applicant.error.notFoundDesc', { id: applicantId })}
            action={{
              label: t('applicant.action.backToApplications'),
              onClick: () => navigate('/operations/people?view=applications'),
            }}
          />
        }
        rail={[]}
      />
    )
  }

  const header = (
    <PageHeader
      title={data.name}
      meta={`${data.id} · ${data.city} · ${data.vehicleClass} · ${formatDate(data.appliedAt, { language })}`}
      onBack={() => navigate('/operations/people?view=applications')}
      /* §11.2 — R3's one primary, RENDERED and refused rather than removed. An
         operator who cannot approve still needs to know approving exists. */
      primaryAction={{
        label: t('applicant.action.approve'),
        onClick: () => void handleApprove(),
        disabled: decisionRefusal !== null || busy,
      }}
      t={t}
      dir={dir}
    />
  )

  const main = (
    <div className="flex flex-col gap-5">
      {/* 1. Identity & Personal Details */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                {t('applicant.personalDetails')}
              </CardTitle>
              <CardDescription className="text-xs">
                {t('applicant.personalDetailsDesc')}
              </CardDescription>
            </div>
            <StatusBadge tone={currentStatus === 'approved' ? 'success' : currentStatus === 'rejected' ? 'neutral' : 'warning'}>
              {currentStatus}
            </StatusBadge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground block mb-0.5">{t('applicant.nationalId')}</span>
              <span className="font-mono font-medium text-foreground">{data.nationalId}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-0.5">{t('applicant.phone')}</span>
              <span className="font-medium text-foreground">{data.phone}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-0.5">{t('applicant.city')}</span>
              <span className="font-medium text-foreground">{data.city}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-0.5">{t('applicant.dob')}</span>
              <span className="font-medium text-foreground">
                <bdi>{data.dateOfBirth ? formatDate(data.dateOfBirth, { language }) : ABSENT}</bdi>
              </span>
            </div>
            {/* The four contact and profile fields the pane dropped. `email` is
                nullable because the applicant flow does not require one, and
                `—` is the honest rendering of a field that was never asked for
                (§8.3.1). */}
            <div>
              <span className="text-muted-foreground block mb-0.5">{t('applicant.email')}</span>
              <span className="font-medium text-foreground">{data.email ?? ABSENT}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-0.5">{t('applicant.gender')}</span>
              <span className="font-medium text-foreground">{data.gender}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-0.5">{t('applicant.appLanguage')}</span>
              <span className="font-medium text-foreground">{data.appLanguage}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-0.5">{t('applicant.photo')}</span>
              <span className="font-medium text-foreground">
                {t(data.hasPhoto ? 'applicant.photo.yes' : 'applicant.photo.no')}
              </span>
            </div>
            {/* The measure is a full row: an address truncated to a column
                width is not an address. */}
            <div className="col-span-2 md:col-span-4">
              <span className="text-muted-foreground block mb-0.5">{t('applicant.address')}</span>
              <span className="font-medium text-foreground">{data.address}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Vehicle Verification */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Car className="h-4 w-4 text-muted-foreground" />
            {t('applicant.vehicleDetails')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground block mb-0.5">{t('applicant.vehicleModel')}</span>
              <span className="font-medium text-foreground">{data.vehicle}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-0.5">{t('applicant.plate')}</span>
              <span className="font-mono font-semibold text-foreground">{data.plate}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-0.5">{t('applicant.vehicleClass')}</span>
              <span className="font-medium text-foreground capitalize">{data.vehicleClass}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-0.5">{t('applicant.appliedAt')}</span>
              <span className="font-medium text-foreground">{formatDate(data.appliedAt, { language })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. KYC Documents Verification Checklist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-muted-foreground" />
            {t('applicant.documentsChecklist')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border border border-border rounded-lg overflow-hidden text-xs">
            {data.docs.map((doc) => (
              <div key={doc.type} className="flex items-center justify-between p-3 bg-card hover:bg-muted/20">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground capitalize">{doc.type.replace('_', ' ')}</span>
                    <StatusBadge tone={doc.status === 'verified' ? 'success' : doc.status === 'rejected' ? 'neutral' : 'warning'}>
                      {doc.status}
                    </StatusBadge>
                  </div>
                  {doc.expiresOn && (
                    <span className="text-xs text-muted-foreground block">
                      {t('applicant.expiresOn', { date: formatDate(doc.expiresOn, { language }) })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* **Palette classes, and a meaningful graphic.** The two
                      icons drew from Tailwind's own emerald and amber ramps at
                      stop 600 — not our palette, and not a token. The icon is
                      not decoration either: it restates the badge's tone beside
                      it, so §7.5's 3 : 1 floor for a meaningful graphic applies.
                      The tone foregrounds clear it with room — `--ev-green`
                      #1d723c at 5.96 : 1, `--ev-amber-dk` #7a3e12 at 8.32 : 1,
                      both on white. (The ramp and stop are spelled out rather
                      than quoted: a class name in a comment is a candidate
                      Tailwind will emit a rule for.) */}
                  {doc.status === 'verified' ? (
                    <CheckCircle2 className="h-4 w-4 text-success-foreground" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-warning-foreground" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* **4. Device, network and movement — the fraud-screening half, and it
              was not on the page at all.** Two applications from one device, or
              two from one IP in a city neither applicant lives in, is the
              signal this screening exists to find. `ipLocation` is placed
              beside `city` deliberately: the two disagreeing is the finding. */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-muted-foreground" />
            {t('applicant.screening')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('applicant.screeningDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 text-xs md:grid-cols-4">
            <div>
              <span className="mb-0.5 block text-muted-foreground">{t('applicant.device')}</span>
              <span className="font-medium text-foreground">{data.device}</span>
            </div>
            <div>
              <span className="mb-0.5 block text-muted-foreground">{t('applicant.lastIp')}</span>
              <span className="font-mono font-medium text-foreground"><bdi>{data.lastIp}</bdi></span>
            </div>
            <div>
              <span className="mb-0.5 block text-muted-foreground">{t('applicant.ipLocation')}</span>
              <span className="font-medium text-foreground">{data.ipLocation}</span>
            </div>
            <div>
              <span className="mb-0.5 block text-muted-foreground">{t('applicant.appliedAt')}</span>
              <span className="font-medium text-foreground">
                <bdi>{formatDate(data.appliedAt, { style: 'day-month-time', language })}</bdi>
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              {t('applicant.movementLog')}
            </span>
            {/* R8 — an empty movement log is a card-sized empty: one grey
                sentence naming WHY it is empty, no illustration, no action. */}
            {data.movementLog.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t('applicant.movementLog.empty')}
              </p>
            ) : (
              <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border text-xs">
                {data.movementLog.map((entry, index) => (
                  <li
                    key={`${entry.at}-${index}`}
                    className="flex items-center justify-between gap-3 bg-card p-2.5"
                  >
                    <span className="min-w-0 truncate font-medium text-foreground">{entry.action}</span>
                    <span className="flex shrink-0 items-center gap-3 text-muted-foreground">
                      <span className="truncate">{entry.location}</span>
                      <bdi className="tabular-nums">{formatDate(entry.at, { language })}</bdi>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </CardContent>
      </Card>

      {/* **5. The outcome, and who is working it.** Half of these fields only
             exist AFTER a decision, which is exactly when somebody comes back
             to read this page — and `claim` is §4.2's ownership contract
             reaching the surface where the decision is actually taken. */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-muted-foreground" />
            {t('applicant.outcome')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-xs md:grid-cols-4">
            <div>
              <span className="mb-0.5 block text-muted-foreground">{t('queue.col.owner')}</span>
              <span className="font-medium text-foreground">
                {/* §4.2 Q-6 — only a LIVE claim is ownership. A released or
                    done claim is history, and a record still carrying one is
                    unclaimed. */}
                {data.claim && data.claim.state === 'claimed'
                  ? data.claim.ownerName
                  : t('queue.owner.unclaimed')}
              </span>
            </div>
            <div>
              <span className="mb-0.5 block text-muted-foreground">{t('applicant.acceptedTrips')}</span>
              {/* §8.3.1 — `0` is a real zero here and reads as `0`, never `—`. */}
              <span className="font-medium tabular-nums text-foreground">
                <bdi>{formatCount(data.acceptedTrips, language)}</bdi>
              </span>
            </div>
            <div>
              <span className="mb-0.5 block text-muted-foreground">{t('applicant.cancelledTrips')}</span>
              <span className="font-medium tabular-nums text-foreground">
                <bdi>{formatCount(data.cancelledTrips, language)}</bdi>
              </span>
            </div>
            <div>
              <span className="mb-0.5 block text-muted-foreground">{t('applicant.decidedAt')}</span>
              <span className="font-medium text-foreground">
                {data.decidedAt === null ? (
                  ABSENT
                ) : (
                  <bdi>{formatDate(data.decidedAt, { style: 'day-month-time', language })}</bdi>
                )}
              </span>
            </div>
            {/* **P8-T1** — the captain this applicant became. The single most
                useful link on the page after an approval, and it did not
                exist. */}
            {data.approvedDriverId !== null && (
              <div>
                <span className="mb-0.5 block text-muted-foreground">{t('applicant.approvedDriver')}</span>
                <Link
                  to={`/operations/people?view=captains&entity=${data.approvedDriverId}`}
                  className="rounded-sm font-medium tabular-nums text-foreground hover:underline"
                >
                  {data.approvedDriverId}
                </Link>
              </div>
            )}
            {data.rejectionReason !== null && (
              <div className="col-span-2 md:col-span-4">
                <span className="mb-0.5 block text-muted-foreground">{t('applicant.rejectionReason')}</span>
                {/* The one line here allowed to wrap: a reason that has been
                    truncated explains nothing. */}
                <span className="whitespace-normal font-medium text-foreground">
                  {data.rejectionReason}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 6. The decision bar */}
      {/* §11.2 — the bar RENDERS whatever the role and whatever the state, and
          refuses in place with its reason. Hiding it taught an operator without
          `approve_drivers` that this page decides nothing, and taught one
          looking at a decided application the same. */}
      <div className="flex items-center justify-end gap-3 rounded-lg border border-border bg-muted/30 p-4">
        {decisionRefusal !== null && (
          <span id="applicant-decision-refusal" className="me-auto text-2xs text-muted-foreground">
            {decisionRefusal}
          </span>
        )}
        {/* R5a use (1) — a destructive button. Rejecting an application cannot
            be undone from this console, which is what makes it one of the four
            places red is permitted. */}
        <Button
          variant="destructive"
          size="xs"
          onClick={() => setRejectModalOpen(true)}
          disabled={busy || decisionRefusal !== null}
          aria-describedby={decisionRefusal === null ? undefined : 'applicant-decision-refusal'}
        >
          <XCircle className="me-1.5 h-4 w-4" />
          {t('applicant.action.reject')}
        </Button>
        <Button
          size="xs"
          onClick={() => void handleApprove()}
          disabled={busy || decisionRefusal !== null}
          aria-describedby={decisionRefusal === null ? undefined : 'applicant-decision-refusal'}
        >
          <CheckCircle2 className="me-1.5 h-4 w-4" />
          {busy
            ? t('applicant.action.approving')
            : t('applicant.action.approve')}
        </Button>
      </div>
    </div>
  )

  const rail = [
    <Card key="bank-verification">
      <CardHeader className="pb-2">
        {/* H2/H3 — the rail card's title takes ink. At 12px grey over a 12px
            grey body it was indistinguishable from the pairs beneath it. */}
        <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <CreditCard className="h-3.5 w-3.5" />
          {t('applicant.bankDetails')}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div>
          {/* §2.3 / H2 — a properties-rail LABEL is META: `--text-xs`, grey.
              10px is below the ramp entirely and there is no token at it. */}
          <span className="text-muted-foreground block text-xs uppercase">{t('applicant.iban')}</span>
          <span className="font-mono text-foreground font-medium">{data.bank.iban}</span>
        </div>
        <div>
          <span className="text-muted-foreground block text-xs uppercase">{t('applicant.bankName')}</span>
          <span className="text-foreground">{data.bank.bankName}</span>
        </div>
        <div className="pt-1 flex justify-between items-center">
          <span className="text-muted-foreground">{t('applicant.bankStatus')}:</span>
          <StatusBadge tone={data.bank.status === 'Verified' ? 'success' : 'warning'}>
            {data.bank.status}
          </StatusBadge>
        </div>
      </CardContent>
    </Card>,
  ]

  return (
    <>
      <DetailPage header={header} main={main} rail={rail} />

      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('applicant.reject.title')}</DialogTitle>
            <DialogDescription>
              {t('applicant.reject.desc', { name: data.name })}
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-2">
            <Label className="text-xs font-medium">{t('applicant.reject.reason')}</Label>
            <Input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Expired driving license, vehicle age exceeds 5 years"
            />
          </div>

          <DialogFooter>
            <Button variant="secondary" size="xs" onClick={() => setRejectModalOpen(false)}>
              {t('action.cancel')}
            </Button>
            <Button
              variant="destructive"
              size="xs"
              onClick={handleRejectConfirm}
              disabled={!rejectReason.trim() || busy}
            >
              {busy ? t('applicant.action.rejecting') : t('applicant.confirmReject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
