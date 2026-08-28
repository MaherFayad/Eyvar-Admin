import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { RoleName } from '@/data/types'
import type { Translate } from '@/lib'

interface AddUserModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (name: string, email: string, phone: string, role: RoleName, compensationCap: number | null) => void
  t: Translate
}

export function AddUserModal({ open, onClose, onConfirm, t }: AddUserModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<RoleName>('Support')
  const [cap, setCap] = useState('100')
  const [busy, setBusy] = useState(false)

  const handleConfirm = () => {
    if (!name.trim() || !email.trim()) return
    setBusy(true)
    setTimeout(() => {
      onConfirm(name.trim(), email.trim(), phone.trim(), role, cap ? parseFloat(cap) * 100 : null)
      setBusy(false)
      setName('')
      setEmail('')
      setPhone('')
      onClose()
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{t('admin.team.inviteTitle', { defaultValue: 'Invite Team Operator' })}</DialogTitle>
          <DialogDescription>
            {t('admin.team.inviteDesc', { defaultValue: 'Send an invitation link with assigned workspace role and permissions.' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3 text-xs">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t('column.name', { defaultValue: 'Full Name' })} *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Noura Al-Fahad" required />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t('column.email', { defaultValue: 'Corporate Email' })} *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="noura@eyvar.com" required />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t('column.phone', { defaultValue: 'Mobile Phone' })}</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+966 50 000 0000" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t('column.role', { defaultValue: 'Assigned Role' })}</Label>
            <Select value={role} onValueChange={(val) => setRole(val as RoleName)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Owner">Owner (All Permissions)</SelectItem>
                <SelectItem value="Ops Manager">Ops Manager (Operations & Approvals)</SelectItem>
                <SelectItem value="Finance">Finance (Payouts & Ledger)</SelectItem>
                <SelectItem value="Support">Support (Tickets & Contacts)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t('admin.team.cap', { defaultValue: 'Discretionary Compensation Cap (SAR)' })}</Label>
            <Input type="number" value={cap} onChange={(e) => setCap(e.target.value)} placeholder="100.00" />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" size="xs" onClick={onClose} disabled={busy}>
            {t('action.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            size="xs"
            onClick={handleConfirm}
            disabled={!name.trim() || !email.trim() || busy}
          >
            {busy ? t('action.saving', { defaultValue: 'Sending...' }) : t('admin.team.sendInvite', { defaultValue: 'Send Invitation' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
