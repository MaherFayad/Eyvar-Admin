import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { approveApplicant, getApplicant, rejectApplicant } from '@/data/clients/applicants'
import type { Applicant } from '@/data/types'
import { useAsync } from '@/hooks'
import { formatDate } from '@/lib'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader } from '@/components/PageHeader'
import { DetailPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { CheckCircle2, FileCheck, ShieldAlert, UserCheck, XCircle, Car, CreditCard } from 'lucide-react'

export function ApplicantDetailScreen() {
  const shell = useShell()
  const navigate = useNavigate()
  const { applicantId = '' } = useParams<{ applicantId: string }>()
  const { t, dir, language } = shell.language

  const applicant = useAsync<Applicant>(
    (signal) => getApplicant(applicantId, signal),
    { deps: [applicantId] }
  )

  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [localStatus, setLocalStatus] = useState<Applicant['status'] | null>(null)

  const data = applicant.data
  const currentStatus = localStatus ?? data?.status ?? 'pending'
  const canWrite = shell.permissions.permissions.includes('approve_drivers')

  const handleApprove = async () => {
    if (!data) return
    setBusy(true)
    try {
      await approveApplicant(data.id)
      setLocalStatus('approved')
      toast.success(t('applicant.toast.approved', { defaultValue: 'Captain application {id} approved', id: data.id }))
    } catch {
      toast.error(t('applicant.toast.approveError', { defaultValue: 'Failed to approve application' }))
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
      toast.success(t('applicant.toast.rejected', { defaultValue: 'Application {id} rejected', id: data.id }))
    } catch {
      toast.error(t('applicant.toast.rejectError', { defaultValue: 'Failed to reject application' }))
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

  if (applicant.status === 'error' || !data) {
    return (
      <DetailPage
        header={<PageHeader title={applicantId} onBack={() => navigate(-1)} t={t} dir={dir} />}
        main={
          <ErrorState
            scope="page"
            heading={t('applicant.error.notFound', { defaultValue: 'Application not found' })}
            message={t('applicant.error.notFoundDesc', { defaultValue: 'Application {id} does not exist.', id: applicantId })}
            action={{ label: t('action.goBack', { defaultValue: 'Back to People' }), onClick: () => navigate(-1) }}
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
      primaryAction={
        canWrite && currentStatus === 'pending'
          ? {
              label: t('applicant.action.approve', { defaultValue: 'Approve Captain' }),
              onClick: handleApprove,
            }
          : undefined
      }
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
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                {t('applicant.personalDetails', { defaultValue: 'Personal & Contact Information' })}
              </CardTitle>
              <CardDescription className="text-xs">
                {t('applicant.personalDetailsDesc', { defaultValue: 'National identification and applicant profile.' })}
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
              <span className="text-muted-foreground block mb-0.5">{t('applicant.nationalId', { defaultValue: 'National ID' })}</span>
              <span className="font-mono font-medium text-foreground">{data.nationalId}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-0.5">{t('applicant.phone', { defaultValue: 'Phone Number' })}</span>
              <span className="font-medium text-foreground">{data.phone}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-0.5">{t('applicant.city', { defaultValue: 'Operating City' })}</span>
              <span className="font-medium text-foreground">{data.city}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-0.5">{t('applicant.dob', { defaultValue: 'Date of Birth' })}</span>
              <span className="font-medium text-foreground">{data.dateOfBirth ? formatDate(data.dateOfBirth, { language }) : '—'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Vehicle Verification */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Car className="h-4 w-4 text-muted-foreground" />
            {t('applicant.vehicleDetails', { defaultValue: 'Vehicle & Class Specification' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground block mb-0.5">{t('applicant.vehicleModel', { defaultValue: 'Vehicle' })}</span>
              <span className="font-medium text-foreground">{data.vehicle}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-0.5">{t('applicant.plate', { defaultValue: 'Plate Number' })}</span>
              <span className="font-mono font-semibold text-foreground">{data.plate}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-0.5">{t('applicant.vehicleClass', { defaultValue: 'Assigned Tier' })}</span>
              <span className="font-medium text-foreground capitalize">{data.vehicleClass}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-0.5">{t('applicant.appliedAt', { defaultValue: 'Applied On' })}</span>
              <span className="font-medium text-foreground">{formatDate(data.appliedAt, { language })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. KYC Documents Verification Checklist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-muted-foreground" />
            {t('applicant.documentsChecklist', { defaultValue: 'Submitted Documents & Verification' })}
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
                    <span className="text-[11px] text-muted-foreground block">
                      {t('applicant.expiresOn', { defaultValue: 'Expires: {date}', date: formatDate(doc.expiresOn, { language }) })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {doc.status === 'verified' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 4. Decision Actions Bar if Pending */}
      {canWrite && currentStatus === 'pending' && (
        <div className="flex items-center justify-end gap-3 p-4 rounded-lg border border-border bg-muted/30">
          <Button
            variant="destructive"
            size="xs"
            onClick={() => setRejectModalOpen(true)}
            disabled={busy}
          >
            <XCircle className="h-4 w-4 mr-1.5" />
            {t('applicant.action.reject', { defaultValue: 'Reject Application' })}
          </Button>
          <Button
            size="xs"
            onClick={handleApprove}
            disabled={busy}
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            {busy ? t('action.saving', { defaultValue: 'Approving...' }) : t('applicant.action.approve', { defaultValue: 'Approve Captain' })}
          </Button>
        </div>
      )}
    </div>
  )

  const rail = [
    <Card key="bank-verification">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <CreditCard className="h-3.5 w-3.5" />
          {t('applicant.bankDetails', { defaultValue: 'IBAN & Bank Status' })}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div>
          <span className="text-muted-foreground block text-[10px] uppercase">{t('applicant.iban', { defaultValue: 'IBAN' })}</span>
          <span className="font-mono text-foreground font-medium">{data.bank.iban}</span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[10px] uppercase">{t('applicant.bankName', { defaultValue: 'Bank' })}</span>
          <span className="text-foreground">{data.bank.bankName}</span>
        </div>
        <div className="pt-1 flex justify-between items-center">
          <span className="text-muted-foreground">{t('applicant.bankStatus', { defaultValue: 'Verification' })}:</span>
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
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{t('applicant.reject.title', { defaultValue: 'Reject Application' })}</DialogTitle>
            <DialogDescription>
              {t('applicant.reject.desc', {
                defaultValue: 'State the rejection reason for {name}. An automated notice will be sent.',
                name: data.name,
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-2">
            <Label className="text-xs font-medium">{t('applicant.reject.reason', { defaultValue: 'Rejection Reason' })}</Label>
            <Input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Expired driving license, vehicle age exceeds 5 years"
            />
          </div>

          <DialogFooter>
            <Button variant="secondary" size="xs" onClick={() => setRejectModalOpen(false)}>
              {t('action.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              variant="destructive"
              size="xs"
              onClick={handleRejectConfirm}
              disabled={!rejectReason.trim() || busy}
            >
              {busy ? t('action.saving', { defaultValue: 'Rejecting...' }) : t('applicant.confirmReject', { defaultValue: 'Reject Application' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
