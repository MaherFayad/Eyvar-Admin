import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { riderFixtures } from '@/data/fixtures/riders'
import type { Translate } from '@/lib'

interface AddEmployeeModalProps {
  corpId: string
  companyName: string
  existingRiderIds: string[]
  open: boolean
  onClose: () => void
  onConfirm: (riderId: string) => void
  t: Translate
}

export function AddEmployeeModal({
  companyName,
  existingRiderIds,
  open,
  onClose,
  onConfirm,
  t,
}: AddEmployeeModalProps) {
  const [selectedRiderId, setSelectedRiderId] = useState<string>('')
  const [busy, setBusy] = useState(false)

  const availableRiders = riderFixtures.filter((r) => !existingRiderIds.includes(r.id))

  const handleConfirm = () => {
    if (!selectedRiderId) return
    setBusy(true)
    setTimeout(() => {
      onConfirm(selectedRiderId)
      setBusy(false)
      onClose()
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{t('corp.addEmployee.title', { defaultValue: 'Link Employee Rider' })}</DialogTitle>
          <DialogDescription>
            {t('corp.addEmployee.desc', {
              defaultValue: 'Add an employee rider to {company} consolidated account.',
              company: companyName,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 space-y-2">
          <Label htmlFor="rider-select" className="text-xs font-medium">
            {t('corp.selectRider', { defaultValue: 'Select Registered Rider' })}
          </Label>
          <Select value={selectedRiderId} onValueChange={setSelectedRiderId}>
            <SelectTrigger id="rider-select">
              <SelectValue placeholder={t('corp.selectRiderPlaceholder', { defaultValue: 'Choose a rider...' })} />
            </SelectTrigger>
            <SelectContent>
              {availableRiders.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name} ({r.phone} · {r.city})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" size="xs" onClick={onClose} disabled={busy}>
            {t('action.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            size="xs"
            onClick={handleConfirm}
            disabled={!selectedRiderId || busy}
          >
            {busy ? t('action.saving', { defaultValue: 'Linking...' }) : t('corp.linkRider', { defaultValue: 'Link Employee' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
